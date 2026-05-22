"""
/api/local/playlists/* — full CRUD for user-created local playlists stored in SQLite.
/api/import/playlist   — import a YouTube Music playlist by URL.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from ..core import cache
from ..db.database import (
    add_track_sync,
    create_playlist_sync,
    db_exec,
    delete_playlist_sync,
    get_all_playlists_sync,
    get_playlist_sync,
    remove_track_sync,
    reorder_tracks_sync,
    update_playlist_sync,
)
from ..services import ytmusic as yt_svc
from ..utils.normalization import normalize_track, safe_error, valid_video_id

router = APIRouter(tags=["playlists"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _fetch_playlist_or_404(playlist_id: str) -> Dict:
    pl = await db_exec(get_playlist_sync, playlist_id)
    if pl is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return pl


# ---------------------------------------------------------------------------
# Collection
# ---------------------------------------------------------------------------
@router.get("/api/local/playlists")
async def get_all_playlists():
    return await db_exec(get_all_playlists_sync)


@router.post("/api/local/playlists")
async def create_playlist(data: Dict[str, Any]):
    title = (data.get("title") or "Nowa playlista").strip()[:200]
    description = (data.get("description") or "").strip()[:500]
    cover = (data.get("cover") or "").strip()
    return await db_exec(create_playlist_sync, title, description, cover)


# ---------------------------------------------------------------------------
# Individual
# ---------------------------------------------------------------------------
@router.get("/api/local/playlists/{playlist_id}")
async def get_playlist(playlist_id: str):
    return await _fetch_playlist_or_404(playlist_id)


@router.patch("/api/local/playlists/{playlist_id}")
async def update_playlist(playlist_id: str, data: Dict[str, Any]):
    ok = await db_exec(update_playlist_sync, playlist_id, data)
    if not ok:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return await _fetch_playlist_or_404(playlist_id)


@router.delete("/api/local/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str):
    ok = await db_exec(delete_playlist_sync, playlist_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"status": "ok", "id": playlist_id}


# ---------------------------------------------------------------------------
# Tracks
# ---------------------------------------------------------------------------
@router.post("/api/local/playlists/{playlist_id}/tracks")
async def add_track(playlist_id: str, data: Dict[str, Any]):
    track = normalize_track(data)
    if not track.get("videoId"):
        raise HTTPException(status_code=400, detail="videoId is required")
    ok = await db_exec(add_track_sync, playlist_id, track)
    if not ok:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"status": "ok"}


@router.delete("/api/local/playlists/{playlist_id}/tracks/{video_id}")
async def remove_track(playlist_id: str, video_id: str):
    if not valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    await db_exec(remove_track_sync, playlist_id, video_id)
    return {"status": "ok"}


@router.post("/api/local/playlists/{playlist_id}/reorder")
async def reorder_tracks(playlist_id: str, data: Dict[str, Any]):
    video_ids: List[str] = data.get("videoIds", [])
    ok = await db_exec(reorder_tracks_sync, playlist_id, video_ids)
    if not ok:
        raise HTTPException(status_code=500, detail="Reorder failed")
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Import from YouTube Music URL
# ---------------------------------------------------------------------------
@router.post("/api/import/playlist")
async def import_playlist(data: Dict[str, Any]):
    url = (data.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    # YouTube / YouTube Music
    yt_match = re.search(r"(?:list=)([A-Za-z0-9_-]+)", url)
    if yt_match:
        playlist_id = yt_match.group(1)
        return await _import_yt_playlist(playlist_id)

    if "spotify.com" in url:
        raise HTTPException(
            status_code=501,
            detail="Spotify import requires an API key. YouTube Music links are currently supported.",
        )

    raise HTTPException(status_code=400, detail="Unsupported or invalid URL")


async def _import_yt_playlist(playlist_id: str) -> Dict:
    ck = f"playlist:{playlist_id}:200"
    yt_pl = cache.get(ck)
    if yt_pl is None:
        try:
            yt_pl = await yt_svc.get_playlist(playlist_id, 200)
            cache.set(ck, yt_pl, ttl=600)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=safe_error(exc))

    try:
        title = yt_pl.get("title") or "Imported Playlist"
        pl = await db_exec(create_playlist_sync, title, "")
        pl_id = pl["id"]
        tracks = yt_pl.get("tracks") or []
        for track in tracks:
            normalized = normalize_track(track)
            if normalized.get("videoId"):
                await db_exec(add_track_sync, pl_id, normalized)
        return {"status": "ok", "id": pl_id, "title": title, "imported": len(tracks)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))
