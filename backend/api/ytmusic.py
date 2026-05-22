"""
/api/ytmusic/* — search, song, album, artist, playlist, charts, related, lyrics
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from core import cache
from services import ytmusic as yt_svc
from utils.normalization import safe_error, valid_browse_id, valid_video_id, VALID_FILTERS
from services import enrichment

router = APIRouter(prefix="/api/ytmusic", tags=["ytmusic"])

# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------
@router.get("/search")
async def search(
    q: str = Query(..., min_length=1, max_length=200),
    filter: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
):
    if filter and filter not in VALID_FILTERS:
        raise HTTPException(status_code=400, detail="Invalid filter value")

    ck = f"search:{q}:{filter}:{limit}"
    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        data = await yt_svc.search(q, filter, limit)
        cache.set(ck, data, ttl=300)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Song
# ---------------------------------------------------------------------------
@router.get("/song/{video_id}")
async def get_song(video_id: str):
    if not valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    ck = f"song:v2:{video_id}"
    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        data = await yt_svc.get_song(video_id)

        # Enrich with Last.fm if we have artist + title
        if data.get("artist") and data.get("title"):
            lfm = await enrichment.fetch_lastfm_track_info(data["artist"], data["title"])
            if lfm:
                data["enrichment"] = lfm
                if lfm.get("high_res_cover"):
                    data["thumbnail"] = lfm["high_res_cover"]

        cache.set(ck, data, ttl=3600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Album
# ---------------------------------------------------------------------------
@router.get("/album/{album_id}")
async def get_album(album_id: str):
    if not valid_browse_id(album_id):
        raise HTTPException(status_code=400, detail="Invalid album ID")

    ck = f"album:{album_id}"
    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        data = await yt_svc.get_album(album_id)
        cache.set(ck, data, ttl=3600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Artist
# ---------------------------------------------------------------------------
@router.get("/artist/{artist_id}")
async def get_artist(artist_id: str):
    if not valid_browse_id(artist_id):
        raise HTTPException(status_code=400, detail="Invalid artist ID")

    ck = f"artist:{artist_id}"
    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        data = await yt_svc.get_artist(artist_id)
        cache.set(ck, data, ttl=3600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Playlist
# ---------------------------------------------------------------------------
@router.get("/playlist/{playlist_id}")
async def get_playlist(
    playlist_id: str,
    limit: int = Query(100, ge=1, le=500),
):
    if not valid_browse_id(playlist_id):
        raise HTTPException(status_code=400, detail="Invalid playlist ID")

    ck = f"playlist:{playlist_id}:{limit}"
    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        data = await yt_svc.get_playlist(playlist_id, limit)
        cache.set(ck, data, ttl=600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------
@router.get("/charts")
async def get_charts(country: str = Query("ZZ", max_length=2)):
    country = country.upper()
    ck = f"charts:{country}"
    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        data = await yt_svc.get_charts(country)
        cache.set(ck, data, ttl=3600)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Related (watch playlist)
# ---------------------------------------------------------------------------
@router.get("/related/{video_id}")
async def get_related(video_id: str, limit: int = Query(20, ge=1, le=50)):
    if not valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    ck = f"related:{video_id}"
    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        watch = await yt_svc.get_watch_playlist(video_id)
        from ..utils.normalization import normalize_track
        tracks = [normalize_track(t) for t in (watch.get("tracks") or [])[:limit]]
        result = {"tracks": tracks, "videoId": video_id}
        cache.set(ck, result, ttl=300)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Lyrics
# ---------------------------------------------------------------------------
@router.get("/lyrics")
async def get_lyrics(
    videoId: str = Query(...),
    artist: Optional[str] = None,
    title: Optional[str] = None,
    album: Optional[str] = None,
    duration: Optional[int] = None,
):
    if not valid_video_id(videoId):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    ck = f"lyrics:v2:{videoId}"
    if (hit := cache.get(ck)) is not None:
        return hit

    meta_artist, meta_title, meta_album, meta_duration = artist, title, album, duration or 0

    # Auto-fill metadata from YTMusic if not supplied
    if not (meta_artist and meta_title):
        try:
            info = await yt_svc.get_song(videoId)
            meta_artist = info.get("author") or info.get("artist")
            meta_title = info.get("title")
            meta_duration = int(info.get("durationSeconds") or 0)
        except Exception:
            pass

    # 1) Try YouTube native lyrics
    yt_lyrics: dict = {"lyrics": "", "hasLyrics": False}
    try:
        watch = await yt_svc.get_watch_playlist(videoId)
        browse_id = watch.get("lyrics")
        if browse_id:
            data = await yt_svc.get_lyrics(browse_id)
            if data.get("lyrics"):
                yt_lyrics = {**data, "hasLyrics": True, "source": "youtube"}
    except Exception:
        pass

    # 2) Try LRCLIB (prefer synced; use as fallback when YT failed)
    if meta_artist and meta_title:
        lrc = await enrichment.fetch_lrclib_lyrics(
            meta_artist, meta_title, meta_album, meta_duration
        )
        if lrc and (lrc.get("syncedLyrics") or not yt_lyrics["hasLyrics"]):
            result = {
                "lyrics": lrc["lyrics"],
                "syncedLyrics": lrc.get("syncedLyrics"),
                "hasLyrics": True,
                "source": "lrclib",
            }
            cache.set(ck, result, ttl=86400)
            return result

    cache.set(ck, yt_lyrics, ttl=86400)
    return yt_lyrics
