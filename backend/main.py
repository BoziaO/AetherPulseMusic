"""
AetherPulse Music — FastAPI Backend
====================================
Comprehensive backend for a YouTube-based web music player.

Highlights:
  • Streaming proxy with Range support + auto-retry on 403
  • Per-ID locking and TTL cache for yt-dlp stream URLs
  • In-memory TTL cache for YTMusic API responses
  • Full local playlist CRUD persisted in SQLite
  • Download tracking in SQLite
  • Personalized "For You" page based on user history
  • Parallelised page & flow generation
  • Background cache warming on startup
  • Health-check endpoint
  • GZip compression, CORS, body-size guard
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import httpx
import uvicorn
import yt_dlp
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse
from ytmusicapi import YTMusic

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("aetherpulse")


# ---------------------------------------------------------------------------
# Startup / lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    log.info("Database initialised at %s", DATABASE_PATH)
    # Warm the home-page cache in the background so first visitor doesn't wait
    asyncio.create_task(_warm_cache())
    yield
    log.info("Backend shutting down")


async def _warm_cache():
    """Pre-load home & explore pages so first request is fast."""
    await asyncio.sleep(2)  # let the process fully start first
    for page_key in ("home", "explore"):
        try:
            cache_key = f"page:{page_key}"
            if _cache_get(cache_key) is None:
                log.info("[warm] pre-loading page:%s", page_key)
                await _build_page(page_key)
        except Exception as exc:
            log.warning("[warm] failed to pre-load %s: %s", page_key, exc)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="AetherPulse Music Backend", version="2.0.0", lifespan=lifespan)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_DEV_ORIGINS = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_env_origins = os.environ.get("CORS_ORIGINS", "")
_frontend_url = os.environ.get("FRONTEND_URL", "")
ALLOWED_ORIGINS: List[str] = [
    o.strip()
    for o in (_env_origins + "," + _frontend_url).split(",")
    if o.strip()
] or _DEV_ORIGINS

_replit_dev = os.environ.get("REPLIT_DEV_DOMAIN", "")
if _replit_dev:
    ALLOWED_ORIGINS.append(f"https://{_replit_dev}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "If-None-Match"],
    expose_headers=["ETag"],
    allow_origin_regex=r"https://.*\.(replit\.dev|replit\.app|repl\.co)$",
)

# ---------------------------------------------------------------------------
# Middleware: body-size limit, GZip, request timing
# ---------------------------------------------------------------------------
MAX_BODY_SIZE = 2 * 1024 * 1024  # 2 MB


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > MAX_BODY_SIZE:
            return StarletteResponse("Payload too large", status_code=413)
        return await call_next(request)


class RequestTimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
        if elapsed_ms > 3000:
            log.warning("SLOW %s %s — %.0fms", request.method, request.url.path, elapsed_ms)
        return response


app.add_middleware(RequestTimingMiddleware)
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=512)

# ---------------------------------------------------------------------------
# YTMusic client
# ---------------------------------------------------------------------------
ytmusic = YTMusic()

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(BACKEND_DIR, "downloads")
DATABASE_PATH = os.path.join(BACKEND_DIR, "aetherpulse.db")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
BROWSE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,100}$")


def _valid_video_id(video_id: str) -> bool:
    return bool(VIDEO_ID_RE.fullmatch(video_id or ""))


def _valid_browse_id(browse_id: str) -> bool:
    return bool(BROWSE_ID_RE.fullmatch(browse_id or ""))


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DB_LOCK = asyncio.Lock()


def _db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def initialize_database() -> None:
    conn = _db_conn()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS user_store (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS local_playlists (
                id         TEXT PRIMARY KEY,
                title      TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                cover      TEXT NOT NULL DEFAULT '',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS playlist_tracks (
                playlist_id TEXT NOT NULL REFERENCES local_playlists(id) ON DELETE CASCADE,
                position    INTEGER NOT NULL,
                video_id    TEXT NOT NULL,
                track_json  TEXT NOT NULL,
                added_at    REAL NOT NULL,
                PRIMARY KEY (playlist_id, video_id)
            );
            CREATE INDEX IF NOT EXISTS idx_pt_playlist ON playlist_tracks(playlist_id, position);
            CREATE TABLE IF NOT EXISTS downloads (
                video_id    TEXT PRIMARY KEY,
                title       TEXT NOT NULL DEFAULT '',
                artist      TEXT NOT NULL DEFAULT '',
                thumbnail   TEXT NOT NULL DEFAULT '',
                duration    TEXT NOT NULL DEFAULT '',
                file_path   TEXT NOT NULL DEFAULT '',
                file_size   INTEGER NOT NULL DEFAULT 0,
                format      TEXT NOT NULL DEFAULT 'mp3',
                downloaded_at REAL NOT NULL
            );
        """)
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# User state helpers (async wrappers around SQLite)
# ---------------------------------------------------------------------------
async def _db_exec(fn, *args):
    """Run a synchronous DB function in a thread-pool."""
    async with DB_LOCK:
        return await asyncio.to_thread(fn, *args)


def _load_user_state_sync() -> Dict[str, Any]:
    conn = _db_conn()
    try:
        row = conn.execute("SELECT value FROM user_store WHERE key='state'").fetchone()
        if row:
            return json.loads(row["value"]) if row["value"] else {}
        return {}
    finally:
        conn.close()


def _save_user_state_sync(state: Dict[str, Any]) -> None:
    conn = _db_conn()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO user_store (key, value) VALUES ('state', ?)",
            (json.dumps(state, ensure_ascii=False),),
        )
        conn.commit()
    finally:
        conn.close()


async def _load_user_state() -> Dict[str, Any]:
    return await _db_exec(_load_user_state_sync)


async def _save_user_state(state: Dict[str, Any]) -> None:
    await _db_exec(_save_user_state_sync, state)


# ---------------------------------------------------------------------------
# In-memory TTL cache
# ---------------------------------------------------------------------------
_mem_cache: Dict[str, tuple] = {}
_MEM_CACHE_MAX = 2048
_cache_stats = {"hits": 0, "misses": 0}


def _cache_get(key: str) -> Any:
    entry = _mem_cache.get(key)
    if entry and time.time() < entry[1]:
        _cache_stats["hits"] += 1
        return entry[0]
    _mem_cache.pop(key, None)
    _cache_stats["misses"] += 1
    return None


def _cache_set(key: str, value: Any, ttl: int) -> None:
    if len(_mem_cache) >= _MEM_CACHE_MAX:
        # Evict oldest 25%
        oldest = sorted(_mem_cache.items(), key=lambda x: x[1][1])[: _MEM_CACHE_MAX // 4]
        for k, _ in oldest:
            _mem_cache.pop(k, None)
    _mem_cache[key] = (value, time.time() + ttl)


def _cache_delete(key: str) -> None:
    _mem_cache.pop(key, None)


def _cache_delete_prefix(prefix: str) -> int:
    keys = [k for k in list(_mem_cache.keys()) if k.startswith(prefix)]
    for k in keys:
        _mem_cache.pop(k, None)
    return len(keys)


# ---------------------------------------------------------------------------
# Stream URL cache (separate from page cache — different TTL)
# ---------------------------------------------------------------------------
_stream_cache: Dict[str, tuple] = {}
_STREAM_TTL = 270        # YouTube signed URLs expire ~6 min; refresh early
_STREAM_MAX = 256
_stream_locks: Dict[str, asyncio.Lock] = {}


def _get_stream_lock(video_id: str) -> asyncio.Lock:
    if video_id not in _stream_locks:
        if len(_stream_locks) > _STREAM_MAX:
            stale = [k for k, lk in list(_stream_locks.items()) if not lk.locked()]
            for k in stale:
                _stream_locks.pop(k, None)
        _stream_locks[video_id] = asyncio.Lock()
    return _stream_locks[video_id]


def _evict_stream_cache() -> None:
    now = time.time()
    expired = [k for k, v in list(_stream_cache.items()) if now >= v[1]]
    for k in expired:
        _stream_cache.pop(k, None)
    if len(_stream_cache) > _STREAM_MAX:
        oldest = sorted(_stream_cache.items(), key=lambda x: x[1][1])[: len(_stream_cache) - _STREAM_MAX]
        for k, _ in oldest:
            _stream_cache.pop(k, None)


_YDL_OPTS: Dict[str, Any] = {
    "quiet": True,
    "no_warnings": True,
    "nocheckcertificate": True,
    "ignoreerrors": False,
    "no_color": True,
    "socket_timeout": 20,
    "retries": 3,
    "extractor_retries": 2,
    "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
}


def _fetch_stream_url_sync(video_id: str, fmt: str = "bestaudio[ext=m4a]/bestaudio/best") -> Optional[str]:
    opts = {**_YDL_OPTS, "format": fmt}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            if not info:
                return None
            url = info.get("url")
            if not url and info.get("formats"):
                url = info["formats"][-1].get("url")
            return url
    except Exception as exc:
        log.warning("[yt_dlp] %s: %s", video_id, exc)
        return None


async def get_stream_url(video_id: str) -> Optional[str]:
    now = time.time()
    entry = _stream_cache.get(video_id)
    if entry and now < entry[1]:
        return entry[0]
    _stream_cache.pop(video_id, None)

    lock = _get_stream_lock(video_id)
    async with lock:
        entry = _stream_cache.get(video_id)
        if entry and now < entry[1]:
            return entry[0]
        url = await asyncio.to_thread(_fetch_stream_url_sync, video_id)
        if url:
            _evict_stream_cache()
            _stream_cache[video_id] = (url, now + _STREAM_TTL)
        _stream_locks.pop(video_id, None)
        return url


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------

def _parse_duration_seconds(duration_str: Optional[str]) -> int:
    """Parse "3:45" or "1:02:33" to total seconds."""
    if not duration_str or not isinstance(duration_str, str):
        return 0
    parts = duration_str.strip().split(":")
    try:
        parts = [int(p) for p in parts]
    except ValueError:
        return 0
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0


def upgrade_thumb_url(url: Optional[str]) -> Optional[str]:
    if not url or not isinstance(url, str):
        return url
    if "googleusercontent.com" in url or "ggpht.com" in url:
        url = re.sub(r"=w\d+-h\d+(-[a-z0-9-]+)*", "=w1200-h1200-l90-rj", url, flags=re.IGNORECASE)
        url = re.sub(r"=s\d+(-[a-z0-9-]+)*", "=s1200", url, flags=re.IGNORECASE)
        url = re.sub(r"=w\d+$", "=w1200", url, flags=re.IGNORECASE)
    elif "ytimg.com" in url:
        url = re.sub(
            r"/(default|mqdefault|hqdefault|sddefault|0|1|2|3)\.jpg",
            "/maxresdefault.jpg",
            url,
            flags=re.IGNORECASE,
        )
    return url


def get_best_thumbnail(thumbnails: Any) -> Optional[str]:
    if not thumbnails:
        return None
    if isinstance(thumbnails, str):
        return upgrade_thumb_url(thumbnails)
    if isinstance(thumbnails, dict):
        url = thumbnails.get("url") or thumbnails.get("thumbnail") or thumbnails.get("src")
        return upgrade_thumb_url(url) if url else None
    if isinstance(thumbnails, list):
        best_url, best_size = None, -1
        for item in thumbnails:
            if isinstance(item, dict):
                url = item.get("url") or item.get("thumbnail") or item.get("src")
                if not url:
                    continue
                size = (item.get("width") or 0) * (item.get("height") or 0)
                if size > best_size:
                    best_size = size
                    best_url = url
            elif isinstance(item, str) and best_size < 0:
                best_url = item
        return upgrade_thumb_url(best_url)
    return None


def normalize_track(track: Any) -> Dict[str, Any]:
    """Normalize a raw YTMusic response dict into a consistent frontend shape."""
    if not track or not isinstance(track, dict):
        return {}

    # Artists
    artists_raw = track.get("artists", [])
    if isinstance(artists_raw, list):
        artist_name = ", ".join(
            a.get("name", "") for a in artists_raw if isinstance(a, dict) and a.get("name")
        )
    elif isinstance(artists_raw, str):
        artist_name = artists_raw
    else:
        artist_name = ""
    if not artist_name:
        artist_name = track.get("artist") or track.get("author") or track.get("byline") or ""

    # Thumbnail
    thumbnail = get_best_thumbnail(track.get("thumbnails", [])) or track.get("thumbnail")

    # Album
    album_raw = track.get("album")
    album_name = album_raw.get("name") if isinstance(album_raw, dict) else (album_raw or "")

    # Duration
    duration_str = track.get("duration") or ""
    duration_secs = (
        track.get("durationSeconds")
        or track.get("duration_seconds")
        or track.get("lengthSeconds")
        or _parse_duration_seconds(duration_str)
    )
    try:
        duration_secs = int(duration_secs)
    except (TypeError, ValueError):
        duration_secs = 0

    # Result type
    result_type = track.get("resultType") or track.get("type") or ""

    return {
        **track,
        "videoId": track.get("videoId"),
        "title": track.get("title") or track.get("name") or "",
        "artist": artist_name,
        "subtitle": track.get("subtitle") or artist_name,
        "thumbnail": thumbnail,
        "album": album_name,
        "duration": duration_str,
        "durationSeconds": duration_secs,
        "resultType": result_type,
    }


def _safe_error(exc: Exception) -> str:
    msg = str(exc)
    return msg[:300] + "…" if len(msg) > 300 else msg


def _etag(data: Any) -> str:
    raw = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return '"' + hashlib.md5(raw.encode()).hexdigest() + '"'


async def _search_safe(query: str, filter_type: Optional[str] = None, limit: int = 10) -> List[Dict]:
    """Run a ytmusic search safely, returning empty list on any error."""
    try:
        results = await asyncio.to_thread(ytmusic.search, query, filter=filter_type)
        return [normalize_track(r) for r in (results or [])[:limit]]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "version": "2.0.0",
        "cache": {
            "entries": len(_mem_cache),
            "hits": _cache_stats["hits"],
            "misses": _cache_stats["misses"],
            "hit_rate": round(
                _cache_stats["hits"] / max(1, _cache_stats["hits"] + _cache_stats["misses"]) * 100, 1
            ),
        },
        "stream_cache_entries": len(_stream_cache),
        "downloads_dir": DOWNLOAD_DIR,
        "timestamp": time.time(),
    }


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------
@app.get("/api/ytmusic/search")
async def search(
    q: str = Query(..., min_length=1, max_length=200),
    filter: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
):
    if filter and filter not in ("songs", "videos", "albums", "artists", "playlists", "community_playlists", "featured_playlists", "uploads"):
        raise HTTPException(status_code=400, detail="Invalid filter value")

    cache_key = f"search:{q}:{filter}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        results = await asyncio.to_thread(ytmusic.search, q, filter=filter)
        data = [normalize_track(r) for r in (results or [])[:limit]]
        _cache_set(cache_key, data, 300)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


# ---------------------------------------------------------------------------
# Metadata Enrichment (Last.fm)
# ---------------------------------------------------------------------------
LASTFM_API_KEY = os.environ.get("LASTFM_API_KEY", "")


async def _fetch_lastfm_track_info(artist: str, title: str) -> Optional[Dict[str, Any]]:
    """Fetch extra metadata from Last.fm."""
    if not LASTFM_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://ws.audioscrobbler.com/2.0/",
                params={
                    "method": "track.getInfo",
                    "api_key": LASTFM_API_KEY,
                    "artist": artist,
                    "track": title,
                    "format": "json",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                track = data.get("track", {})
                album = track.get("album", {})
                images = album.get("image", [])
                
                # Get the largest image
                best_image = None
                if images:
                    for img in reversed(images):
                        if img.get("#text"):
                            best_image = img["#text"]
                            break
                
                return {
                    "lastfm_url": track.get("url"),
                    "tags": [tag.get("name") for tag in track.get("toptags", {}).get("tag", [])][:5],
                    "summary": track.get("wiki", {}).get("summary"),
                    "high_res_cover": best_image,
                }
    except Exception as exc:
        log.warning("[lastfm] failed for %s - %s: %s", artist, title, exc)
    return None


@app.get("/api/ytmusic/song/{video_id}")
async def get_song(video_id: str):
    if not _valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    cache_key = f"song:v2:{video_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        info = await asyncio.to_thread(ytmusic.get_song, video_id)
        data = normalize_track(info.get("videoDetails", info))
        
        # Enrich with Last.fm if possible
        if data.get("artist") and data.get("title"):
            lfm_data = await _fetch_lastfm_track_info(data["artist"], data["title"])
            if lfm_data:
                data["enrichment"] = lfm_data
                if lfm_data.get("high_res_cover"):
                    data["thumbnail"] = lfm_data["high_res_cover"]

        _cache_set(cache_key, data, 3600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


@app.get("/api/ytmusic/album/{album_id}")
async def get_album(album_id: str):
    if not _valid_browse_id(album_id):
        raise HTTPException(status_code=400, detail="Invalid album ID")
    cache_key = f"album:{album_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        album = await asyncio.to_thread(ytmusic.get_album, album_id)
        if "tracks" in album:
            album["tracks"] = [normalize_track(t) for t in album["tracks"]]
        thumbnail = get_best_thumbnail(album.get("thumbnails", []))
        if thumbnail:
            album["thumbnail"] = thumbnail
        _cache_set(cache_key, album, 3600)
        return album
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


@app.get("/api/ytmusic/artist/{artist_id}")
async def get_artist(artist_id: str):
    if not _valid_browse_id(artist_id):
        raise HTTPException(status_code=400, detail="Invalid artist ID")
    cache_key = f"artist:{artist_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        data = await asyncio.to_thread(ytmusic.get_artist, artist_id)
        thumbnail = get_best_thumbnail(data.get("thumbnails", []))
        if thumbnail:
            data["thumbnail"] = thumbnail
        # Normalize tracks in sections
        for section_key in ("songs", "albums", "singles", "videos"):
            section = data.get(section_key)
            if isinstance(section, dict):
                items = section.get("results", section.get("items", []))
                section["results"] = [normalize_track(i) for i in items]
        _cache_set(cache_key, data, 3600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


@app.get("/api/ytmusic/playlist/{playlist_id}")
async def get_playlist(
    playlist_id: str,
    limit: int = Query(100, ge=1, le=500),
):
    if not _valid_browse_id(playlist_id):
        raise HTTPException(status_code=400, detail="Invalid playlist ID")
    cache_key = f"playlist:{playlist_id}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        playlist = await asyncio.to_thread(ytmusic.get_playlist, playlist_id, limit)
        if "tracks" in playlist:
            playlist["tracks"] = [normalize_track(t) for t in playlist["tracks"]]
        thumbnail = get_best_thumbnail(playlist.get("thumbnails", []))
        if thumbnail:
            playlist["thumbnail"] = thumbnail
        _cache_set(cache_key, playlist, 600)
        return playlist
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


# ---------------------------------------------------------------------------
# Lyrics
# ---------------------------------------------------------------------------
async def _fetch_lrclib_lyrics(artist: str, title: str, album: Optional[str] = None, duration: int = 0) -> Optional[Dict[str, Any]]:
    """Fetch synced lyrics from LRCLIB.net."""
    try:
        params = {
            "artist_name": artist,
            "track_name": title,
        }
        if album:
            params["album_name"] = album
        if duration > 0:
            params["duration"] = duration

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get("https://lrclib.net/api/get", params=params)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "lyrics": data.get("syncedLyrics") or data.get("plainLyrics"),
                    "syncedLyrics": data.get("syncedLyrics"),
                    "source": "lrclib"
                }
    except Exception as exc:
        log.warning("[lrclib] failed for %s - %s: %s", artist, title, exc)
    return None


@app.get("/api/lyrics")
async def get_lyrics(
    videoId: str = Query(...),
    artist: Optional[str] = None,
    title: Optional[str] = None,
    album: Optional[str] = None,
    duration: Optional[int] = None
):
    if not _valid_video_id(videoId):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    cache_key = f"lyrics:v2:{videoId}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    # Metadata for LRCLIB lookup
    meta_artist = artist
    meta_title = title
    meta_album = album
    meta_duration = duration

    # If metadata missing, fetch from YT
    if not (meta_artist and meta_title):
        try:
            song_info = await asyncio.to_thread(ytmusic.get_song, videoId)
            details = song_info.get("videoDetails", {})
            meta_artist = details.get("author")
            meta_title = details.get("title")
            meta_duration = int(details.get("lengthSeconds", 0))
        except Exception:
            pass

    # 1. Try YouTube lyrics first
    yt_lyrics = {"lyrics": "", "hasLyrics": False}
    try:
        watch = await asyncio.to_thread(ytmusic.get_watch_playlist, videoId)
        browse_id = watch.get("lyrics")
        if browse_id:
            data = await asyncio.to_thread(ytmusic.get_lyrics, browse_id)
            if data.get("lyrics"):
                yt_lyrics = {**data, "hasLyrics": True, "source": "youtube"}
    except Exception:
        pass

    # 2. Try LRCLIB for synced lyrics (or fallback if YT failed)
    if meta_artist and meta_title:
        lrc_data = await _fetch_lrclib_lyrics(meta_artist, meta_title, meta_album, meta_duration or 0)
        if lrc_data and (lrc_data.get("syncedLyrics") or not yt_lyrics["hasLyrics"]):
            result = {
                "lyrics": lrc_data["lyrics"],
                "syncedLyrics": lrc_data.get("syncedLyrics"),
                "hasLyrics": True,
                "source": "lrclib"
            }
            _cache_set(cache_key, result, 86400)
            return result

    # 3. Return YouTube lyrics if found, else empty
    _cache_set(cache_key, yt_lyrics, 86400)
    return yt_lyrics


# ---------------------------------------------------------------------------
# Related / Watch playlist
# ---------------------------------------------------------------------------
@app.get("/api/ytmusic/related/{video_id}")
async def get_related(video_id: str, limit: int = Query(20, ge=1, le=50)):
    if not _valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    cache_key = f"related:{video_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        watch = await asyncio.to_thread(ytmusic.get_watch_playlist, video_id)
        tracks = [normalize_track(t) for t in (watch.get("tracks", []) or [])[:limit]]
        result = {"tracks": tracks, "videoId": video_id}
        _cache_set(cache_key, result, 300)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------
@app.get("/api/ytmusic/charts")
async def get_charts(country: str = Query("ZZ", max_length=2)):
    cache_key = f"charts:{country.upper()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        data = await asyncio.to_thread(ytmusic.get_charts, country.upper())
        # Normalise tracks inside each section
        for section_key in ("songs", "videos", "artists", "trending"):
            section = data.get(section_key)
            if isinstance(section, dict):
                items = section.get("items", [])
                section["items"] = [normalize_track(i) for i in items]
        _cache_set(cache_key, data, 3600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

async def _build_page(page_key: str, recent_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """Build a full page payload. Results are cached by the caller."""

    if page_key == "home":
        data = await asyncio.to_thread(ytmusic.get_home)
        for section in (data or []):
            if "contents" in section:
                section["contents"] = [normalize_track(c) for c in section["contents"]]
            thumbnail = get_best_thumbnail(section.get("thumbnails", []))
            if thumbnail:
                section["thumbnail"] = thumbnail
        return {"sections": data or []}

    elif page_key == "explore":
        data = await asyncio.to_thread(ytmusic.get_explore)
        return data or {}

    elif page_key == "chill":
        res = await asyncio.gather(
            _search_safe("chill lofi beats study", "songs", 10),
            _search_safe("ambient relax music peaceful", "songs", 10),
            _search_safe("acoustic indie chill slow", "songs", 10),
            _search_safe("chillhop neo soul chill", "songs", 8),
            _search_safe("chill acoustic lofi artist", "artists", 6),
            return_exceptions=True,
        )
        tracks: List[Dict] = []
        for r in res[:4]:
            if isinstance(r, list):
                tracks.extend(r)
        tracks = _dedup_tracks(tracks)
        artists = res[4] if isinstance(res[4], list) else []
        return {
            "eyebrow": "Tryb relaksu",
            "title": "Chillout",
            "description": "Spokojne dźwięki na każdą chwilę",
            "stats": [{"label": "Nastrój", "value": "🌊 Chill"}, {"label": "Utworów", "value": str(len(tracks))}],
            "primarySection": {"title": "Polecane utwory", "items": tracks[:20]},
            "secondarySection": {"title": "Artyści", "items": artists},
            "tertiarySection": {"title": "", "items": []},
            "queue": tracks[:24],
        }

    elif page_key == "energy":
        res = await asyncio.gather(
            _search_safe("workout pump up energy gym", "songs", 10),
            _search_safe("edm dance party hits", "songs", 10),
            _search_safe("phonk drift gym motivation", "songs", 10),
            _search_safe("bass boost electronic hype", "songs", 8),
            _search_safe("edm electronic dance artist", "artists", 6),
            return_exceptions=True,
        )
        tracks: List[Dict] = []
        for r in res[:4]:
            if isinstance(r, list):
                tracks.extend(r)
        tracks = _dedup_tracks(tracks)
        artists = res[4] if isinstance(res[4], list) else []
        return {
            "eyebrow": "Tryb energii",
            "title": "Energia",
            "description": "Muzyka, która pobudza i napędza",
            "stats": [{"label": "Nastrój", "value": "⚡ Energy"}, {"label": "Utworów", "value": str(len(tracks))}],
            "primarySection": {"title": "Top energetyczne", "items": tracks[:20]},
            "secondarySection": {"title": "Artyści", "items": artists},
            "tertiarySection": {"title": "", "items": []},
            "queue": tracks[:24],
        }

    elif page_key == "playlists":
        res = await asyncio.gather(
            _search_safe("top hits playlist 2024", "playlists", 8),
            _search_safe("workout playlist energy", "playlists", 8),
            _search_safe("chill vibes playlist relax", "playlists", 8),
            _search_safe("party playlist dance hits", "playlists", 6),
            return_exceptions=True,
        )
        playlists: List[Dict] = []
        for r in res:
            if isinstance(r, list):
                playlists.extend(r)
        playlists = _dedup_tracks(playlists, key="playlistId")
        return {
            "eyebrow": "Twoja biblioteka",
            "title": "Playlisty",
            "description": "Kolekcje muzyczne dla każdego nastroju",
            "stats": [{"label": "Playlisty", "value": str(len(playlists))}],
            "primarySection": {"title": "Polecane playlisty", "items": playlists[:24]},
            "secondarySection": {"title": "", "items": []},
            "tertiarySection": {"title": "", "items": []},
            "queue": [],
        }

    elif page_key == "albums":
        res = await asyncio.gather(
            _search_safe("new album 2024 popular", "albums", 8),
            _search_safe("best pop rnb album 2024", "albums", 8),
            _search_safe("rap hiphop album 2024", "albums", 8),
            _search_safe("rock indie album 2024", "albums", 6),
            return_exceptions=True,
        )
        albums: List[Dict] = []
        for r in res:
            if isinstance(r, list):
                albums.extend(r)
        albums = _dedup_tracks(albums, key="browseId")
        return {
            "eyebrow": "Muzyka",
            "title": "Albumy",
            "description": "Najnowsze i najpopularniejsze albumy",
            "stats": [{"label": "Albumy", "value": str(len(albums))}],
            "primarySection": {"title": "Polecane albumy", "items": albums[:24]},
            "secondarySection": {"title": "", "items": []},
            "tertiarySection": {"title": "", "items": []},
            "queue": [],
        }

    elif page_key == "artists":
        res = await asyncio.gather(
            _search_safe("top pop artist 2024", "artists", 8),
            _search_safe("trending rnb hiphop artist", "artists", 8),
            _search_safe("rock indie popular artist", "artists", 8),
            _search_safe("electronic edm dj artist", "artists", 6),
            return_exceptions=True,
        )
        artists: List[Dict] = []
        for r in res:
            if isinstance(r, list):
                artists.extend(r)
        artists = _dedup_tracks(artists, key="browseId")
        return {
            "eyebrow": "Odkryj artystów",
            "title": "Wykonawcy",
            "description": "Odkrywaj artystów i ich twórczość",
            "stats": [{"label": "Artyści", "value": str(len(artists))}],
            "primarySection": {"title": "Popularni wykonawcy", "items": artists[:24]},
            "secondarySection": {"title": "", "items": []},
            "tertiarySection": {"title": "", "items": []},
            "queue": [],
        }

    elif page_key == "discover":
        res = await asyncio.gather(
            _search_safe("viral music 2024", "songs", 10),
            _search_safe("indie alternative underground", "songs", 10),
            _search_safe("new music rising artist", "songs", 10),
            _search_safe("trending song this week", "songs", 8),
            _search_safe("rising indie alternative artist", "artists", 6),
            return_exceptions=True,
        )
        tracks: List[Dict] = []
        for r in res[:4]:
            if isinstance(r, list):
                tracks.extend(r)
        tracks = _dedup_tracks(tracks)
        artists = res[4] if isinstance(res[4], list) else []
        return {
            "eyebrow": "Odkrywaj",
            "title": "Przeglądaj",
            "description": "Świeże dźwięki i nowe odkrycia",
            "stats": [{"label": "Nowości", "value": str(len(tracks))}],
            "primarySection": {"title": "Trending teraz", "items": tracks[:20]},
            "secondarySection": {"title": "Wschodzące gwiazdy", "items": artists},
            "tertiarySection": {"title": "", "items": []},
            "queue": tracks[:24],
        }

    elif page_key == "for-you":
        # Personalized page — use seed IDs from user's recent plays
        seed_id = (recent_ids or [])[0] if recent_ids else None

        if seed_id and _valid_video_id(seed_id):
            # Get watch playlist from user's most recent track
            watch_fut = asyncio.to_thread(ytmusic.get_watch_playlist, seed_id)
            search_fut = _search_safe("top hits popular 2024", "songs", 10)
            try:
                watch_data, search_fallback = await asyncio.gather(watch_fut, search_fut, return_exceptions=True)
                if isinstance(watch_data, Exception):
                    watch_data = {}
                if isinstance(search_fallback, Exception):
                    search_fallback = []
            except Exception:
                watch_data, search_fallback = {}, []

            watch_tracks = [normalize_track(t) for t in (watch_data.get("tracks", []) or [])]
            all_tracks = _dedup_tracks(watch_tracks + (search_fallback or []))
        else:
            all_tracks = await _search_safe("popular music hits 2024", "songs", 20)

        return {
            "eyebrow": "Specjalnie dla Ciebie",
            "title": "Dla Ciebie",
            "description": "Muzyka dobrana do Twoich upodobań",
            "stats": [{"label": "Spersonalizowane", "value": "✨"}],
            "primarySection": {"title": "Polecane dla Ciebie", "items": all_tracks[:20]},
            "secondarySection": {"title": "", "items": []},
            "tertiarySection": {"title": "", "items": []},
            "queue": all_tracks[:24],
        }

    else:
        return {"sections": [], "message": f"Page '{page_key}' not implemented"}


def _dedup_tracks(tracks: List[Dict], key: str = "videoId") -> List[Dict]:
    """Remove duplicates by a given key, preserving order."""
    seen: set = set()
    result: List[Dict] = []
    for t in tracks:
        if not isinstance(t, dict):
            continue
        val = t.get(key) or t.get("videoId") or t.get("browseId") or t.get("playlistId")
        if val and val in seen:
            continue
        if val:
            seen.add(val)
        if t.get("title") or t.get("name"):
            result.append(t)
    return result


@app.get("/api/page/{page_key}")
async def get_page(page_key: str, request: Request):
    cache_key = f"page:{page_key}"

    # Parse optional recent seeds from query params
    recent_param = request.query_params.get("recent", "")
    recent_ids = [v.strip() for v in recent_param.split(",") if v.strip() and _valid_video_id(v.strip())]

    # For-you is personalized — don't cache across different seed sets
    if page_key == "for-you" and recent_ids:
        cache_key = f"page:for-you:{recent_ids[0]}"

    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        result = await _build_page(page_key, recent_ids)
        ttl = 180 if page_key in ("home", "explore", "for-you") else 600
        _cache_set(cache_key, result, ttl)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        log.error("get_page(%s): %s", page_key, exc)
        raise HTTPException(status_code=500, detail=_safe_error(exc))


# ---------------------------------------------------------------------------
# Streaming proxy (Range support + 403 auto-refresh)
# ---------------------------------------------------------------------------
@app.get("/api/downloads/playback/{video_id}")
async def proxy_playback(video_id: str, request: Request):
    if not _valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    stream_url = await get_stream_url(video_id)
    if not stream_url:
        raise HTTPException(status_code=404, detail="Stream URL not found")

    fmt = request.query_params.get("format", "").lower()
    range_header = request.headers.get("Range")

    content_type = (
        "audio/mp4" if fmt in ("m4a", "mp4") else
        "audio/webm" if fmt == "webm" else
        "audio/mpeg"
    )

    ua = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    )

    upstream_headers: Dict[str, str] = {
        "User-Agent": ua,
        "Accept": "*/*",
        "Accept-Encoding": "identity",
        "Connection": "keep-alive",
    }
    if range_header:
        upstream_headers["Range"] = range_header

    current_url = stream_url

    async def stream_bytes():
        nonlocal current_url
        bytes_sent = 0
        max_retries = 3

        for attempt in range(max_retries):
            try:
                hdrs = dict(upstream_headers)
                if bytes_sent > 0:
                    existing = hdrs.get("Range", "")
                    if existing.startswith("bytes="):
                        start = int(existing[6:].split("-")[0]) + bytes_sent
                    else:
                        start = bytes_sent
                    hdrs["Range"] = f"bytes={start}-"

                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(10.0, read=90.0),
                    follow_redirects=True,
                ) as client:
                    async with client.stream("GET", current_url, headers=hdrs) as resp:
                        if resp.status_code == 403:
                            _stream_cache.pop(video_id, None)
                            current_url = await get_stream_url(video_id)
                            if not current_url:
                                return
                            continue
                        resp.raise_for_status()
                        async for chunk in resp.aiter_bytes(512 * 1024):
                            if await request.is_disconnected():
                                return
                            if chunk:
                                bytes_sent += len(chunk)
                                yield chunk
                return

            except (httpx.ReadError, httpx.RemoteProtocolError, httpx.ConnectError) as err:
                log.warning("[proxy] stream interrupted %s attempt %d: %s", video_id, attempt + 1, err)
                if attempt >= max_retries - 1:
                    return
                _stream_cache.pop(video_id, None)
                current_url = await get_stream_url(video_id)
                if not current_url:
                    return
                await asyncio.sleep(0.5 * (attempt + 1))
            except Exception as err:
                log.error("[proxy] stream error %s: %s", video_id, err)
                return

    resp_headers: Dict[str, str] = {
        "Accept-Ranges": "bytes",
        "Content-Type": content_type,
        "Cache-Control": "public, max-age=3600",
    }
    status = 206 if range_header else 200
    return StreamingResponse(stream_bytes(), status_code=status, headers=resp_headers)


# ---------------------------------------------------------------------------
# Download info (stream URL + metadata)
# ---------------------------------------------------------------------------
@app.get("/api/downloads/info/{video_id}")
async def get_download_info(video_id: str, format: Optional[str] = "mp3"):
    if not _valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    try:
        url, song_raw = await asyncio.gather(
            get_stream_url(video_id),
            asyncio.to_thread(ytmusic.get_song, video_id),
            return_exceptions=True,
        )
        if isinstance(url, Exception) or not url:
            raise HTTPException(status_code=404, detail="Stream URL not found")
        track_info = normalize_track(song_raw.get("videoDetails", song_raw)) if not isinstance(song_raw, Exception) else {}
        fmt = (format or "").lower()
        mime = "audio/mp4" if fmt in ("m4a", "mp4") else "audio/webm" if fmt == "webm" else "audio/mpeg"
        return {"videoId": video_id, "streamUrl": url, "mimeType": mime, **track_info}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


# ---------------------------------------------------------------------------
# Downloads list (tracks saved to disk)
# ---------------------------------------------------------------------------
def _list_downloads_sync() -> List[Dict]:
    conn = _db_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM downloads ORDER BY downloaded_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def _add_download_sync(info: Dict[str, Any]) -> None:
    conn = _db_conn()
    try:
        conn.execute(
            """INSERT OR REPLACE INTO downloads
               (video_id, title, artist, thumbnail, duration, file_path, file_size, format, downloaded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                info["video_id"], info.get("title", ""), info.get("artist", ""),
                info.get("thumbnail", ""), info.get("duration", ""),
                info.get("file_path", ""), info.get("file_size", 0),
                info.get("format", "mp3"), time.time(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _delete_download_sync(video_id: str) -> Optional[str]:
    conn = _db_conn()
    try:
        row = conn.execute("SELECT file_path FROM downloads WHERE video_id=?", (video_id,)).fetchone()
        if not row:
            return None
        conn.execute("DELETE FROM downloads WHERE video_id=?", (video_id,))
        conn.commit()
        return row["file_path"]
    finally:
        conn.close()


@app.get("/api/downloads")
async def list_downloads():
    downloads = await _db_exec(_list_downloads_sync)
    return {"downloads": downloads, "count": len(downloads)}


@app.delete("/api/downloads/{video_id}")
async def delete_download(video_id: str):
    if not _valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    file_path = await _db_exec(_delete_download_sync, video_id)
    if file_path and os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass
    return {"status": "ok", "videoId": video_id}


@app.post("/api/downloads/save/{video_id}")
async def save_to_disk(video_id: str, data: Optional[Dict[str, Any]] = None):
    """Download audio file to server disk using yt-dlp."""
    if not _valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    fmt = ((data or {}).get("format") or "mp3").lower()
    if fmt not in ("mp3", "m4a", "opus", "flac", "webm"):
        fmt = "mp3"

    out_path = os.path.join(DOWNLOAD_DIR, f"{video_id}.{fmt}")

    def _dl():
        ydl_opts = {
            **_YDL_OPTS,
            "outtmpl": os.path.join(DOWNLOAD_DIR, f"{video_id}.%(ext)s"),
            "format": "bestaudio[ext=m4a]/bestaudio/best" if fmt == "m4a" else "bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": fmt if fmt != "m4a" else "m4a",
                "preferredquality": "192",
            }] if fmt != "webm" else [],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)

    try:
        info = await asyncio.to_thread(_dl)
        # Find the actual downloaded file
        actual_path = out_path
        for ext in (fmt, "mp3", "m4a", "webm", "opus"):
            candidate = os.path.join(DOWNLOAD_DIR, f"{video_id}.{ext}")
            if os.path.isfile(candidate):
                actual_path = candidate
                break

        file_size = os.path.getsize(actual_path) if os.path.isfile(actual_path) else 0
        track = normalize_track(info.get("videoDetails", info) if info else {})

        await _db_exec(_add_download_sync, {
            "video_id": video_id,
            "title": track.get("title") or (info or {}).get("title", ""),
            "artist": track.get("artist") or (info or {}).get("uploader", ""),
            "thumbnail": track.get("thumbnail") or "",
            "duration": track.get("duration") or "",
            "file_path": actual_path,
            "file_size": file_size,
            "format": fmt,
        })
        return {"status": "ok", "videoId": video_id, "filePath": actual_path, "fileSize": file_size, "format": fmt}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


# ---------------------------------------------------------------------------
# Local playlists (full CRUD — SQLite backed)
# ---------------------------------------------------------------------------

def _get_all_playlists_sync() -> List[Dict]:
    conn = _db_conn()
    try:
        playlists = [dict(r) for r in conn.execute(
            "SELECT * FROM local_playlists ORDER BY updated_at DESC"
        ).fetchall()]
        for pl in playlists:
            tracks = conn.execute(
                "SELECT track_json FROM playlist_tracks WHERE playlist_id=? ORDER BY position",
                (pl["id"],),
            ).fetchall()
            pl["tracks"] = [json.loads(r["track_json"]) for r in tracks]
            pl["trackCount"] = len(pl["tracks"])
        return playlists
    finally:
        conn.close()


def _get_playlist_sync(playlist_id: str) -> Optional[Dict]:
    conn = _db_conn()
    try:
        row = conn.execute("SELECT * FROM local_playlists WHERE id=?", (playlist_id,)).fetchone()
        if not row:
            return None
        pl = dict(row)
        tracks = conn.execute(
            "SELECT track_json FROM playlist_tracks WHERE playlist_id=? ORDER BY position",
            (playlist_id,),
        ).fetchall()
        pl["tracks"] = [json.loads(r["track_json"]) for r in tracks]
        pl["trackCount"] = len(pl["tracks"])
        return pl
    finally:
        conn.close()


def _create_playlist_sync(title: str, description: str = "") -> Dict:
    conn = _db_conn()
    now = time.time()
    pl_id = str(uuid.uuid4())
    try:
        conn.execute(
            "INSERT INTO local_playlists (id, title, description, created_at, updated_at) VALUES (?,?,?,?,?)",
            (pl_id, title, description, now, now),
        )
        conn.commit()
        return {"id": pl_id, "title": title, "description": description, "tracks": [], "trackCount": 0,
                "created_at": now, "updated_at": now}
    finally:
        conn.close()


def _update_playlist_sync(playlist_id: str, updates: Dict) -> bool:
    conn = _db_conn()
    try:
        row = conn.execute("SELECT id FROM local_playlists WHERE id=?", (playlist_id,)).fetchone()
        if not row:
            return False
        fields = []
        vals = []
        if "title" in updates:
            fields.append("title=?"); vals.append(updates["title"])
        if "description" in updates:
            fields.append("description=?"); vals.append(updates["description"])
        if "cover" in updates:
            fields.append("cover=?"); vals.append(updates["cover"])
        if not fields:
            return True
        fields.append("updated_at=?"); vals.append(time.time())
        vals.append(playlist_id)
        conn.execute(f"UPDATE local_playlists SET {', '.join(fields)} WHERE id=?", vals)
        conn.commit()
        return True
    finally:
        conn.close()


def _delete_playlist_sync(playlist_id: str) -> bool:
    conn = _db_conn()
    try:
        row = conn.execute("SELECT id FROM local_playlists WHERE id=?", (playlist_id,)).fetchone()
        if not row:
            return False
        conn.execute("DELETE FROM local_playlists WHERE id=?", (playlist_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def _add_track_to_playlist_sync(playlist_id: str, track: Dict) -> bool:
    conn = _db_conn()
    try:
        row = conn.execute("SELECT id FROM local_playlists WHERE id=?", (playlist_id,)).fetchone()
        if not row:
            return False
        video_id = track.get("videoId")
        if not video_id:
            return False
        max_pos = conn.execute(
            "SELECT COALESCE(MAX(position),0) FROM playlist_tracks WHERE playlist_id=?", (playlist_id,)
        ).fetchone()[0]
        conn.execute(
            "INSERT OR REPLACE INTO playlist_tracks (playlist_id, position, video_id, track_json, added_at) VALUES (?,?,?,?,?)",
            (playlist_id, max_pos + 1, video_id, json.dumps(track, ensure_ascii=False), time.time()),
        )
        conn.execute("UPDATE local_playlists SET updated_at=? WHERE id=?", (time.time(), playlist_id))
        conn.commit()
        return True
    finally:
        conn.close()


def _remove_track_from_playlist_sync(playlist_id: str, video_id: str) -> bool:
    conn = _db_conn()
    try:
        conn.execute(
            "DELETE FROM playlist_tracks WHERE playlist_id=? AND video_id=?", (playlist_id, video_id)
        )
        conn.execute("UPDATE local_playlists SET updated_at=? WHERE id=?", (time.time(), playlist_id))
        conn.commit()
        return True
    finally:
        conn.close()


@app.get("/api/local/playlists")
async def get_local_playlists():
    playlists = await _db_exec(_get_all_playlists_sync)
    return playlists


@app.get("/api/local/playlists/{playlist_id}")
async def get_local_playlist(playlist_id: str):
    pl = await _db_exec(_get_playlist_sync, playlist_id)
    if pl is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return pl


@app.post("/api/local/playlists")
async def create_local_playlist(data: Dict[str, Any]):
    title = (data.get("title") or "Nowa playlista").strip()[:200]
    description = (data.get("description") or "").strip()[:500]
    pl = await _db_exec(_create_playlist_sync, title, description)
    return pl


@app.patch("/api/local/playlists/{playlist_id}")
async def update_local_playlist(playlist_id: str, data: Dict[str, Any]):
    ok = await _db_exec(_update_playlist_sync, playlist_id, data)
    if not ok:
        raise HTTPException(status_code=404, detail="Playlist not found")
    pl = await _db_exec(_get_playlist_sync, playlist_id)
    return pl


@app.delete("/api/local/playlists/{playlist_id}")
async def delete_local_playlist(playlist_id: str):
    ok = await _db_exec(_delete_playlist_sync, playlist_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"status": "ok", "id": playlist_id}


@app.post("/api/local/playlists/{playlist_id}/tracks")
async def add_track_to_playlist(playlist_id: str, data: Dict[str, Any]):
    track = normalize_track(data)
    if not track.get("videoId"):
        raise HTTPException(status_code=400, detail="videoId is required")
    ok = await _db_exec(_add_track_to_playlist_sync, playlist_id, track)
    if not ok:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"status": "ok"}


@app.delete("/api/local/playlists/{playlist_id}/tracks/{video_id}")
async def remove_track_from_playlist(playlist_id: str, video_id: str):
    if not _valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    await _db_exec(_remove_track_from_playlist_sync, playlist_id, video_id)
    return {"status": "ok"}


async def import_yt_playlist(playlist_id: str):
    """Internal helper to import a YouTube Music playlist."""
    try:
        yt_pl = await asyncio.to_thread(ytmusic.get_playlist, playlist_id, 200)
        title = yt_pl.get("title") or "Imported Playlist"
        pl = await _db_exec(_create_playlist_sync, title, "")
        pl_id = pl["id"]
        for track in (yt_pl.get("tracks") or []):
            normalized = normalize_track(track)
            if normalized.get("videoId"):
                await _db_exec(_add_track_to_playlist_sync, pl_id, normalized)
        return {"status": "ok", "id": pl_id, "title": title, "imported": len(yt_pl.get("tracks") or [])}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


@app.post("/api/import/playlist")
async def import_playlist_by_url(data: Dict[str, Any]):
    url = data.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # 1. YouTube / YouTube Music
    yt_match = re.search(r"(?:list=)([A-Za-z0-9_-]+)", url)
    if yt_match:
        playlist_id = yt_match.group(1)
        return await import_yt_playlist(playlist_id)

    # 2. Spotify (Stub for now)
    if "spotify.com" in url:
        raise HTTPException(
            status_code=501,
            detail="Spotify import requires an API key. YouTube/YT Music links are currently supported."
        )

    raise HTTPException(status_code=400, detail="Unsupported or invalid URL")


# ---------------------------------------------------------------------------
# User state
# ---------------------------------------------------------------------------
@app.get("/api/user/state")
async def get_user_state():
    state = await _load_user_state()
    state.setdefault("favorites", [])
    state.setdefault("recent", [])
    state.setdefault("queues", [])
    return state


@app.patch("/api/user/state")
async def update_user_state(state: Dict[str, Any]):
    if not isinstance(state, dict):
        raise HTTPException(status_code=400, detail="State must be an object")
    await _save_user_state(state)
    return {"status": "ok"}


@app.post("/api/user/recent")
async def add_recent(data: Dict[str, Any]):
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Recent item must be an object")
    state = await _load_user_state()
    recent = [item for item in state.get("recent", []) if item.get("videoId") != data.get("videoId")]
    recent.insert(0, normalize_track(data))
    state["recent"] = recent[:100]  # store up to 100 tracks
    await _save_user_state(state)
    return {"status": "ok", "count": len(state["recent"])}


@app.post("/api/user/queues")
async def save_queue(data: Dict[str, Any]):
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Queue item must be an object")
    state = await _load_user_state()
    queues = [item for item in state.get("queues", []) if item.get("id") != data.get("id")]
    queues.insert(0, data)
    state["queues"] = queues[:50]
    await _save_user_state(state)
    return {"status": "ok", "queues": state["queues"]}


@app.delete("/api/user/queues/{queue_id}")
async def delete_queue(queue_id: str):
    state = await _load_user_state()
    state["queues"] = [q for q in state.get("queues", []) if q.get("id") != queue_id]
    await _save_user_state(state)
    return {"status": "ok"}


@app.post("/api/user/favorites/toggle")
async def toggle_favorite(data: Dict[str, Any]):
    if not isinstance(data, dict) or "videoId" not in data:
        raise HTTPException(status_code=400, detail="videoId is required")
    state = await _load_user_state()
    raw = [item for item in state.get("favorites", []) if isinstance(item, dict)]
    without = [item for item in raw if item.get("videoId") != data["videoId"]]
    was_favorited = len(without) < len(raw)
    if not was_favorited:
        without.insert(0, normalize_track(data))
    state["favorites"] = without
    await _save_user_state(state)
    return {"status": "ok", "favorited": not was_favorited, "count": len(without)}


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------
@app.get("/api/recommendations/pool")
async def get_recommendations_pool(videoId: Optional[str] = None, seeds: Optional[str] = None):
    target_id = videoId or (seeds.split(",")[0].strip() if seeds else None)
    if not target_id or not _valid_video_id(target_id):
        return {"items": [], "pool": []}
    cache_key = f"rec_pool:{target_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        watch = await asyncio.to_thread(ytmusic.get_watch_playlist, target_id)
        tracks = [normalize_track(t) for t in (watch.get("tracks", []) or [])]
        result = {"items": tracks, "pool": tracks, "seedId": target_id}
        _cache_set(cache_key, result, 300)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


@app.get("/api/recommendations/smart-radio/{video_id}")
async def get_smart_radio(video_id: str):
    if not _valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    cache_key = f"smart_radio:{video_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        watch = await asyncio.to_thread(ytmusic.get_watch_playlist, video_id)
        tracks = [normalize_track(t) for t in (watch.get("tracks", []) or [])]
        result = {"items": tracks, "seedId": video_id}
        _cache_set(cache_key, result, 600)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_safe_error(exc))


# ---------------------------------------------------------------------------
# Flow generation
# ---------------------------------------------------------------------------
@app.post("/api/flows/revolution")
async def generate_flow(data: Optional[Dict[str, Any]] = None):
    import random

    body = data or {}
    preset: str = body.get("preset", "focus")
    session_minutes: int = max(5, min(120, int(body.get("sessionMinutes", 35))))
    novelty: int = max(0, min(100, int(body.get("novelty", 55))))
    pool: List[Dict] = body.get("pool", [])

    target_count = max(5, min(30, session_minutes // 3))

    preset_queries: Dict[str, List[str]] = {
        "focus": [
            "lo-fi hip hop study focus", "ambient instrumental concentration",
            "deep focus work music", "classical piano study",
        ],
        "energy": [
            "phonk drift workout", "edm dance party pump up",
            "high energy gym motivation", "bass boost hype songs",
        ],
        "chill": [
            "chill lofi beats relax", "peaceful acoustic indie slow",
            "neo soul chillhop smooth", "ambient nature relaxing",
        ],
        "discover": [
            "indie underground new music", "viral trending songs 2024",
            "rising artist alternative", "bedroom pop new wave",
        ],
    }

    queries = preset_queries.get(preset, preset_queries["focus"])

    # Gather all search queries + watch playlist in parallel
    tasks = [_search_safe(q, "songs", 10) for q in queries[:3]]

    # Seed from user's listening history
    seed_id: Optional[str] = None
    for t in pool:
        if isinstance(t, dict) and _valid_video_id(t.get("videoId", "")):
            seed_id = t["videoId"]
            break

    if seed_id:
        async def _watch_safe():
            try:
                w = await asyncio.to_thread(ytmusic.get_watch_playlist, seed_id)
                return [normalize_track(t) for t in (w.get("tracks", []) or [])[:12]]
            except Exception:
                return []
        tasks.append(_watch_safe())
    else:
        async def _empty():
            return []
        tasks.append(_empty())

    results = await asyncio.gather(*tasks, return_exceptions=True)
    search_tracks: List[Dict] = []
    for r in results[:3]:
        if isinstance(r, list):
            search_tracks.extend(r)
    watch_tracks: List[Dict] = results[3] if isinstance(results[3], list) else []

    search_tracks = [t for t in search_tracks if t.get("videoId") and t.get("title")]
    watch_tracks = [t for t in watch_tracks if t.get("videoId") and t.get("title")]

    # Normalise pool
    familiar_pool = [normalize_track(t) for t in pool[:30] if isinstance(t, dict) and t.get("videoId")]
    familiar_pool = [t for t in familiar_pool if t.get("videoId") and t.get("title")]

    # Blend familiar vs new based on novelty
    familiar_ratio = (100 - novelty) / 100
    n_familiar = round(target_count * familiar_ratio)
    n_new = target_count - n_familiar

    new_pool = _dedup_tracks(search_tracks + watch_tracks)
    selected_familiar = random.sample(familiar_pool, min(n_familiar, len(familiar_pool))) if familiar_pool else []
    selected_new = random.sample(new_pool, min(n_new, len(new_pool))) if new_pool else []

    # Interleave for natural listening flow
    combined: List[Dict] = []
    fi = ni = 0
    while fi < len(selected_familiar) or ni < len(selected_new):
        if fi < len(selected_familiar):
            combined.append(selected_familiar[fi]); fi += 1
        if ni < len(selected_new):
            combined.append(selected_new[ni]); ni += 1

    final = _dedup_tracks(combined)

    # Fallback to pool if nothing found
    if not final and familiar_pool:
        final = random.sample(familiar_pool, min(target_count, len(familiar_pool)))
    elif not final:
        final = await _search_safe("popular music 2024", "songs", target_count)

    return {
        "tracks": final[:target_count],
        "preset": preset,
        "sessionMinutes": session_minutes,
        "novelty": novelty,
        "totalTracks": len(final[:target_count]),
        "seedId": seed_id,
    }


# ---------------------------------------------------------------------------
# Auth (stub — no authentication required for local music player)
# ---------------------------------------------------------------------------
@app.get("/api/auth/session")
async def get_auth_session():
    return {"auth": {"enabled": False, "connected": False}}


@app.post("/api/auth/logout")
async def logout():
    return {"status": "ok"}


@app.get("/api/auth/youtube/playlists")
async def get_yt_playlists():
    return []


@app.post("/api/auth/youtube/playlists/import")
async def import_yt_playlists(data: Dict[str, Any]):
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Cache management
# ---------------------------------------------------------------------------
@app.delete("/api/admin/cache")
async def clear_cache(prefix: Optional[str] = None):
    if prefix:
        count = _cache_delete_prefix(prefix)
    else:
        count = len(_mem_cache)
        _mem_cache.clear()
    return {"status": "ok", "cleared": count}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", 3001))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
