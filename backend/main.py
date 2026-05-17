import asyncio
import json
import os
import re
import sqlite3
import time
from typing import Any, Dict, Optional

import httpx
import uvicorn
import yt_dlp
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response
from ytmusicapi import YTMusic

app = FastAPI(title="AetherPulse Music Backend")

# ---------------------------------------------------------------------------
# CORS
# BUG FIX: allow_origins=["*"] + allow_credentials=True narusza spec CORS —
# przeglądarki odrzucają wildcard origin gdy credentials są wysyłane.
# Używamy konkretnych lokalhostów w dev; w prod ustaw zmienną CORS_ORIGINS.
# ---------------------------------------------------------------------------
_DEV_ORIGINS = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_env_origins = os.environ.get("CORS_ORIGINS", "")
_frontend_url = os.environ.get("FRONTEND_URL", "")

ALLOWED_ORIGINS = [
    o.strip()
    for o in (_env_origins + "," + _frontend_url).split(",")
    if o.strip()
] or _DEV_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# ---------------------------------------------------------------------------
# Request body size limit — prevents memory exhaustion from large payloads.
# ---------------------------------------------------------------------------
MAX_BODY_SIZE = 512 * 1024  # 512 KB


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            return Response(content="Payload too large", status_code=413)
        return await call_next(request)


app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# ---------------------------------------------------------------------------
# YTMusic — wszystkie wywołania muszą być przez asyncio.to_thread() bo są
# synchroniczne i blokują event loop FastAPI.
# ---------------------------------------------------------------------------
ytmusic = YTMusic()

DOWNLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "downloads"))
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

DATABASE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "aetherpulse.db"))
DB_LOCK = asyncio.Lock()

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def is_valid_video_id(video_id: str) -> bool:
    return bool(VIDEO_ID_RE.fullmatch(video_id))


def _serialize_json(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def _deserialize_json(value: Optional[str], default: Any = None) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def _get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database() -> None:
    conn = _get_db_connection()
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_store (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
        )
        conn.commit()
    finally:
        conn.close()


async def _load_user_state() -> Dict[str, Any]:
    async with DB_LOCK:
        return await asyncio.to_thread(_load_user_state_sync)


def _load_user_state_sync() -> Dict[str, Any]:
    conn = _get_db_connection()
    try:
        cursor = conn.execute(
            "SELECT value FROM user_store WHERE key = ?", ("state",)
        )
        row = cursor.fetchone()
        if row:
            return _deserialize_json(row["value"], {})
        return {}
    finally:
        conn.close()


async def _save_user_state(state: Dict[str, Any]) -> None:
    async with DB_LOCK:
        await asyncio.to_thread(_save_user_state_sync, state)


def _save_user_state_sync(state: Dict[str, Any]) -> None:
    conn = _get_db_connection()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO user_store (key, value) VALUES (?, ?)",
            ("state", _serialize_json(state)),
        )
        conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
async def startup_event() -> None:
    initialize_database()

# ---------------------------------------------------------------------------
# Stream URL cache + async yt_dlp
# ---------------------------------------------------------------------------
stream_cache: Dict[str, tuple] = {}
STREAM_CACHE_TTL = 270  # sekund — YouTube signed URLs expire ~6 min; refresh 30s early
STREAM_CACHE_MAX = 512   # max entries — zapobiega nieograniczonemu wzrostowi
_stream_locks: Dict[str, asyncio.Lock] = {}


def _get_lock(video_id: str) -> asyncio.Lock:
    if video_id not in _stream_locks:
        # Evict stale locks when dict grows too large
        if len(_stream_locks) > STREAM_CACHE_MAX:
            _stream_locks.clear()
        _stream_locks[video_id] = asyncio.Lock()
    return _stream_locks[video_id]


def _evict_stream_cache() -> None:
    """Usuwa wygasłe wpisy z cache URL strumieni."""
    now = time.time()
    expired = [k for k, v in stream_cache.items() if now >= v[1]]
    for k in expired:
        stream_cache.pop(k, None)
    # Hard cap — usuń najstarsze jeśli przekroczono limit
    if len(stream_cache) > STREAM_CACHE_MAX:
        oldest = sorted(stream_cache.items(), key=lambda x: x[1][1])[:len(stream_cache) - STREAM_CACHE_MAX]
        for k, _ in oldest:
            stream_cache.pop(k, None)


_YDL_BASE_OPTS: Dict[str, Any] = {
    "quiet": True,
    "no_warnings": True,
    "nocheckcertificate": True,
    "ignoreerrors": False,
    "no_color": True,
    "socket_timeout": 15,
    "retries": 3,
    "extractor_retries": 2,
}


def _fetch_stream_url_sync(video_id: str) -> Optional[str]:
    """Synchroniczne wywołanie yt_dlp. Używaj tylko przez asyncio.to_thread."""
    ydl_opts = {**_YDL_BASE_OPTS, "format": "bestaudio[ext=m4a]/bestaudio/best"}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={video_id}", download=False
            )
            if not info:
                return None
            # Prefer direct url; fall back to first format url
            url = info.get("url")
            if not url and info.get("formats"):
                url = info["formats"][-1].get("url")
            return url
    except Exception as exc:
        print(f"[yt_dlp] error for {video_id}: {exc}")
        return None


async def get_stream_url(video_id: str) -> Optional[str]:
    """Async-safe: cache + per-ID lock, yt_dlp przez to_thread."""
    now = time.time()
    entry = stream_cache.get(video_id)
    if entry and now < entry[1]:
        return entry[0]
    stream_cache.pop(video_id, None)

    lock = _get_lock(video_id)
    async with lock:
        entry = stream_cache.get(video_id)
        if entry and now < entry[1]:
            return entry[0]
        url = await asyncio.to_thread(_fetch_stream_url_sync, video_id)
        if url:
            _evict_stream_cache()
            stream_cache[video_id] = (url, now + STREAM_CACHE_TTL)
        # Always clean up the lock entry after resolution (success or failure)
        _stream_locks.pop(video_id, None)
        return url


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_best_thumbnail(thumbnails: Any) -> Optional[str]:
    """Zwraca URL miniatury o największej rozdzielczości."""
    if not thumbnails:
        return None
    if isinstance(thumbnails, list):
        best_url = None
        best_size = -1
        for item in thumbnails:
            if isinstance(item, dict):
                url = item.get("url") or item.get("thumbnail") or item.get("src")
                if not url:
                    continue
                w = item.get("width") or 0
                h = item.get("height") or 0
                size = w * h
                if size > best_size:
                    best_size = size
                    best_url = url
            elif isinstance(item, str) and best_size < 0:
                best_url = item
        return upgrade_thumb_url(best_url) if best_url else None
    if isinstance(thumbnails, dict):
        url = (
            thumbnails.get("url")
            or thumbnails.get("thumbnail")
            or thumbnails.get("src")
        )
        return upgrade_thumb_url(url) if url else None
    return None


def upgrade_thumb_url(url: Optional[str]) -> Optional[str]:
    """Upgrades a thumbnail URL to the highest available resolution."""
    import re as _re
    if not url or not isinstance(url, str):
        return url
    if "googleusercontent.com" in url or "ggpht.com" in url:
        url = _re.sub(r"=w\d+-h\d+(-[a-z0-9-]+)*", "=w1200-h1200-l90-rj", url, flags=_re.IGNORECASE)
        url = _re.sub(r"=s\d+(-[a-z0-9-]+)*", "=s1200", url, flags=_re.IGNORECASE)
        url = _re.sub(r"=w\d+$", "=w1200", url, flags=_re.IGNORECASE)
        return url
    if "ytimg.com" in url:
        url = _re.sub(
            r"/(default|mqdefault|hqdefault|sddefault|0|1|2|3)\.jpg",
            "/maxresdefault.jpg",
            url,
            flags=_re.IGNORECASE,
        )
        return url
    return url


def normalize_track(track: Dict[str, Any]) -> Dict[str, Any]:
    """Normalizuje track do formatu oczekiwanego przez frontend."""
    if not track:
        return {}

    artists_raw = track.get("artists", [])
    if isinstance(artists_raw, list) and artists_raw:
        artist_name = ", ".join(
            a.get("name", "") for a in artists_raw if isinstance(a, dict)
        )
    elif isinstance(artists_raw, str):
        artist_name = artists_raw
    else:
        artist_name = track.get("author", track.get("byline", "Unknown Artist"))

    thumbnail = get_best_thumbnail(track.get("thumbnails", [])) or track.get("thumbnail")

    album = track.get("album")
    album_name = album.get("name") if isinstance(album, dict) else album

    return {
        **track,
        "videoId": track.get("videoId"),
        "title": track.get("title"),
        "artist": artist_name,
        "thumbnail": thumbnail,
        "album": album_name,
        "duration": track.get("duration"),
        "duration_seconds": track.get("duration_seconds"),
    }


def _download_audio_sync(video_id: str, requested_format: str) -> Optional[str]:
    if not is_valid_video_id(video_id):
        return None

    target_format = requested_format.lower().strip()
    if target_format not in {"mp3", "webm", "m4a"}:
        target_format = "m4a"

    output_template = os.path.join(DOWNLOAD_DIR, f"{video_id}.%(ext)s")
    ydl_opts: Dict[str, Any] = {
        **_YDL_BASE_OPTS,
        "outtmpl": output_template,
    }

    if target_format == "mp3":
        ydl_opts["format"] = "bestaudio/best"
        ydl_opts["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
        ]
    elif target_format == "webm":
        ydl_opts["format"] = "bestaudio[ext=webm]/bestaudio"
    else:
        ydl_opts["format"] = "bestaudio[ext=m4a]/bestaudio/best"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={video_id}", download=True
            )
            if not info:
                return None
    except Exception as exc:
        print(f"[yt_dlp] download error for {video_id}: {exc}")
        return None

    for extension in (target_format, "mp3", "webm", "m4a", "opus"):
        candidate = os.path.join(DOWNLOAD_DIR, f"{video_id}.{extension}")
        if os.path.exists(candidate):
            return candidate
    return None


async def download_audio_file(video_id: str, requested_format: str = "mp3") -> Optional[str]:
    return await asyncio.to_thread(_download_audio_sync, video_id, requested_format)


# ---------------------------------------------------------------------------
# Simple in-memory TTL cache (replaces aiocache which has key-collision bugs
# with path-param routes when using the @cached decorator).
# ---------------------------------------------------------------------------

_mem_cache: Dict[str, tuple] = {}  # key -> (value, expires_at)
_MEM_CACHE_MAX = 1024


def _cache_get(key: str) -> Any:
    entry = _mem_cache.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]
    _mem_cache.pop(key, None)
    return None


def _cache_set(key: str, value: Any, ttl: int) -> None:
    if len(_mem_cache) >= _MEM_CACHE_MAX:
        # Evict oldest quarter
        oldest = sorted(_mem_cache.items(), key=lambda x: x[1][1])[: _MEM_CACHE_MAX // 4]
        for k, _ in oldest:
            _mem_cache.pop(k, None)
    _mem_cache[key] = (value, time.time() + ttl)


# ---------------------------------------------------------------------------
# Routes — YTMusic
# ---------------------------------------------------------------------------

@app.get("/api/ytmusic/search")
async def search(q: str = Query(...), filter: Optional[str] = None, limit: int = 20):
    cache_key = f"search:{q}:{filter}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        results = await asyncio.to_thread(ytmusic.search, q, filter=filter)
        data = [normalize_track(r) for r in results[:limit]]
        _cache_set(cache_key, data, 600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/ytmusic/song/{video_id}")
async def get_song(video_id: str):
    cache_key = f"song:{video_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        song_info = await asyncio.to_thread(ytmusic.get_song, video_id)
        data = normalize_track(song_info.get("videoDetails", song_info))
        _cache_set(cache_key, data, 3600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/ytmusic/album/{album_id}")
async def get_album(album_id: str):
    cache_key = f"album:{album_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        album = await asyncio.to_thread(ytmusic.get_album, album_id)
        if "tracks" in album:
            album["tracks"] = [normalize_track(t) for t in album["tracks"]]
        _cache_set(cache_key, album, 3600)
        return album
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/ytmusic/artist/{artist_id}")
async def get_artist(artist_id: str):
    cache_key = f"artist:{artist_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        data = await asyncio.to_thread(ytmusic.get_artist, artist_id)
        _cache_set(cache_key, data, 3600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/ytmusic/playlist/{playlist_id}")
async def get_playlist(playlist_id: str, limit: int = 100):
    cache_key = f"playlist:{playlist_id}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        playlist = await asyncio.to_thread(ytmusic.get_playlist, playlist_id, limit)
        if "tracks" in playlist:
            playlist["tracks"] = [normalize_track(t) for t in playlist["tracks"]]
        _cache_set(cache_key, playlist, 600)
        return playlist
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/lyrics")
async def get_lyrics(videoId: str):
    cache_key = f"lyrics:{videoId}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        watch_playlist = await asyncio.to_thread(ytmusic.get_watch_playlist, videoId)
        browse_id = watch_playlist.get("lyrics")
        if not browse_id:
            return {"lyrics": "No lyrics available"}
        data = await asyncio.to_thread(ytmusic.get_lyrics, browse_id)
        _cache_set(cache_key, data, 86400)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/page/{page_key}")
async def get_page(page_key: str):
    cache_key = f"page:{page_key}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        if page_key == "home":
            data = await asyncio.to_thread(ytmusic.get_home)
            for section in data:
                if "contents" in section:
                    section["contents"] = [normalize_track(c) for c in section["contents"]]
            result = {"sections": data}
        elif page_key == "explore":
            result = await asyncio.to_thread(ytmusic.get_explore)
        else:
            return {"sections": [], "message": f"Page '{page_key}' not yet implemented"}
        _cache_set(cache_key, result, 300)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Proxy playback (streaming + Range support)
# ---------------------------------------------------------------------------

@app.get("/api/downloads/playback/{video_id}")
async def proxy_playback(video_id: str, request: Request):
    if not is_valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    stream_url = await get_stream_url(video_id)
    if not stream_url:
        raise HTTPException(status_code=404, detail="Stream URL not found")

    requested_format = request.query_params.get("format", "").lower()
    range_header = request.headers.get("Range")

    # Infer content-type from format param — avoids a blocking HEAD probe.
    if requested_format == "webm":
        content_type = "audio/webm"
    elif requested_format in ("m4a", "mp4"):
        content_type = "audio/mp4"
    else:
        content_type = "audio/mpeg"

    upstream_headers: Dict[str, str] = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "*/*",
        "Connection": "keep-alive",
    }
    if range_header:
        upstream_headers["Range"] = range_header

    async def stream_bytes(url: str):
        bytes_sent = 0
        max_retries = 3
        for attempt in range(max_retries):
            try:
                retry_headers = dict(upstream_headers)
                if bytes_sent > 0:
                    # Resume from where we left off
                    existing_range = retry_headers.get("Range", "")
                    if existing_range.startswith("bytes="):
                        start = int(existing_range[6:].split("-")[0]) + bytes_sent
                    else:
                        start = bytes_sent
                    retry_headers["Range"] = f"bytes={start}-"
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(10.0, read=60.0), follow_redirects=True
                ) as client:
                    async with client.stream("GET", url, headers=retry_headers) as resp:
                        if resp.status_code == 403:
                            # URL expired — refresh and retry
                            stream_cache.pop(video_id, None)
                            url = await get_stream_url(video_id)
                            if not url:
                                return
                            continue
                        resp.raise_for_status()
                        async for chunk in resp.aiter_bytes(256 * 1024):
                            if await request.is_disconnected():
                                return
                            if chunk:
                                bytes_sent += len(chunk)
                                yield chunk
                return  # stream completed
            except (httpx.ReadError, httpx.RemoteProtocolError) as err:
                print(f"[proxy] stream interrupted {video_id} (attempt {attempt + 1}): {err}")
                if attempt == max_retries - 1:
                    return
                # Refresh URL on retry in case it expired
                stream_cache.pop(video_id, None)
                url = await get_stream_url(video_id)
                if not url:
                    return
                await asyncio.sleep(0.5 * (attempt + 1))
            except Exception as err:
                print(f"[proxy] stream error {video_id}: {err}")
                return

    resp_headers: Dict[str, str] = {
        "Accept-Ranges": "bytes",
        "Content-Type": content_type,
        "Cache-Control": "public, max-age=3600",
    }
    status = 206 if range_header else 200
    return StreamingResponse(stream_bytes(stream_url), status_code=status, headers=resp_headers)


@app.get("/api/downloads/info/{video_id}")
async def get_download_info(video_id: str, format: Optional[str] = "mp3"):
    if not is_valid_video_id(video_id):
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
        if fmt == "webm":
            mime_type = "audio/webm"
        elif fmt in ("m4a", "mp4"):
            mime_type = "audio/mp4"
        else:
            mime_type = "audio/mpeg"

        return {
            "videoId": video_id,
            "streamUrl": url,
            "mimeType": mime_type,
            **track_info,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/downloads/save/{video_id}")
async def save_download(video_id: str, format: Optional[str] = "mp3"):
    if not is_valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    downloaded = await download_audio_file(video_id, format)
    if not downloaded:
        raise HTTPException(status_code=500, detail="Unable to download audio file")

    return {
        "status": "ok",
        "videoId": video_id,
        "path": os.path.relpath(downloaded, os.path.dirname(__file__)),
    }


# ---------------------------------------------------------------------------
# User state
# ---------------------------------------------------------------------------

@app.get("/api/user/state")
async def get_user_state():
    state = await _load_user_state()
    # Ensure legacy keys exist so old clients don't break
    state.setdefault("favorites", [])
    state.setdefault("recent", [])
    state.setdefault("queues", [])
    return state


@app.patch("/api/user/state")
async def update_user_state(state: Dict[str, Any]):
    if not isinstance(state, dict):
        raise HTTPException(status_code=400, detail="State must be an object")
    # Accept both legacy {favorites,recent,queues} and new frontend schema
    await _save_user_state(state)
    return {"status": "ok"}


@app.post("/api/user/recent")
async def add_recent(data: Dict[str, Any]):
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Recent item must be an object")

    state = await _load_user_state()
    recent = [item for item in state.get("recent", []) if item.get("videoId") != data.get("videoId")]
    recent.insert(0, data)
    state["recent"] = recent[:50]
    await _save_user_state(state)
    return {"status": "ok", "recent": state["recent"]}


@app.post("/api/user/queues")
async def save_queue(data: Dict[str, Any]):
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Queue item must be an object")

    state = await _load_user_state()
    queues = [item for item in state.get("queues", []) if item.get("id") != data.get("id")]
    queues.append(data)
    state["queues"] = queues
    await _save_user_state(state)
    return {"status": "ok", "queues": state["queues"]}


@app.post("/api/user/favorites/toggle")
async def toggle_favorite(data: Dict[str, Any]):
    if not isinstance(data, dict) or "videoId" not in data:
        raise HTTPException(status_code=400, detail="videoId is required")

    state = await _load_user_state()
    raw_favorites = state.get("favorites")
    if not isinstance(raw_favorites, list):
        raw_favorites = []
    
    # Filter out any non-dict items and find the one with matching videoId
    favorites = [
        item for item in raw_favorites 
        if isinstance(item, dict) and item.get("videoId") != data["videoId"]
    ]
    
    favorited = len(favorites) < len(raw_favorites)
    if not favorited:
        favorites.append(data)
        favorited = True

    state["favorites"] = favorites
    await _save_user_state(state)
    return {"status": "ok", "favorited": favorited, "favorites": state["favorites"]}


# ---------------------------------------------------------------------------
# Auth (stub)
# ---------------------------------------------------------------------------

@app.get("/api/auth/session")
async def get_auth_session():
    # Frontend oczekuje kształtu { auth: { enabled, connected } }
    return {"auth": {"enabled": False, "connected": False}}


@app.post("/api/auth/logout")
async def logout():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------

@app.get("/api/recommendations/pool")
async def get_recommendations_pool(
    videoId: Optional[str] = None, seeds: Optional[str] = None
):
    target_id = videoId or (seeds.split(",")[0].strip() if seeds else None)
    if not target_id:
        return {"items": [], "pool": []}
    cache_key = f"rec_pool:{target_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        watch_playlist = await asyncio.to_thread(ytmusic.get_watch_playlist, target_id)
        tracks = [normalize_track(t) for t in watch_playlist.get("tracks", [])]
        result = {"items": tracks, "pool": tracks}
        _cache_set(cache_key, result, 300)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/recommendations/smart-radio/{video_id}")
async def get_smart_radio(video_id: str):
    cache_key = f"smart_radio:{video_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        watch_playlist = await asyncio.to_thread(ytmusic.get_watch_playlist, video_id)
        tracks = [normalize_track(t) for t in watch_playlist.get("tracks", [])]
        result = {"items": tracks}
        _cache_set(cache_key, result, 600)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Local playlists / flows (stubs)
# ---------------------------------------------------------------------------

@app.post("/api/flows/revolution")
async def get_flows_revolution(data: Optional[Dict[str, Any]] = None):
    return {"sections": [], "tracks": []}


@app.get("/api/local/playlists")
async def get_local_playlists():
    return []


@app.get("/api/local/playlists/{playlist_id}")
async def get_local_playlist(playlist_id: str):
    return {"id": playlist_id, "tracks": []}


@app.post("/api/local/playlists")
async def create_local_playlist(data: Dict[str, Any]):
    return {"id": "new-playlist", "status": "ok"}


@app.post("/api/local/playlists/import-yt/{playlist_id}")
async def import_yt_playlist(playlist_id: str):
    return {"status": "ok"}


@app.get("/api/auth/youtube/playlists")
async def get_yt_playlists():
    return []


@app.post("/api/auth/youtube/playlists/import")
async def import_yt_playlists(data: Dict[str, Any]):
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", 3001))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
