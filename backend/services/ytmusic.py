"""
Thin async wrappers around ytmusicapi.YTMusic.
All blocking calls are dispatched to a thread-pool via asyncio.to_thread.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from ytmusicapi import YTMusic

from ..utils.normalization import get_best_thumbnail, normalize_track

log = logging.getLogger("aetherpulse")

# Single shared client — YTMusic is stateless and thread-safe for reads.
_yt = YTMusic()


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------
VALID_FILTERS = frozenset({
    "songs", "videos", "albums", "artists", "playlists",
    "community_playlists", "featured_playlists", "uploads",
})


async def search(
    query: str,
    filter_type: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    results = await asyncio.to_thread(_yt.search, query, filter=filter_type)
    return [normalize_track(r) for r in (results or [])[:limit]]


async def search_safe(
    query: str,
    filter_type: Optional[str] = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """Like search() but returns [] instead of raising on any error."""
    try:
        return await search(query, filter_type, limit)
    except Exception as exc:
        log.debug("[search_safe] %s: %s", query, exc)
        return []


# ---------------------------------------------------------------------------
# Individual resources
# ---------------------------------------------------------------------------
async def get_song(video_id: str) -> Dict[str, Any]:
    info = await asyncio.to_thread(_yt.get_song, video_id)
    return normalize_track(info.get("videoDetails", info))


async def get_album(album_id: str) -> Dict[str, Any]:
    data = await asyncio.to_thread(_yt.get_album, album_id)
    if "tracks" in data:
        data["tracks"] = [normalize_track(t) for t in data["tracks"]]
    thumbnail = get_best_thumbnail(data.get("thumbnails") or [])
    if thumbnail:
        data["thumbnail"] = thumbnail
    return data


async def get_artist(artist_id: str) -> Dict[str, Any]:
    data = await asyncio.to_thread(_yt.get_artist, artist_id)
    thumbnail = get_best_thumbnail(data.get("thumbnails") or [])
    if thumbnail:
        data["thumbnail"] = thumbnail
    for section_key in ("songs", "albums", "singles", "videos"):
        section = data.get(section_key)
        if isinstance(section, dict):
            items = section.get("results") or section.get("items") or []
            section["results"] = [normalize_track(i) for i in items]
    return data


async def get_playlist(playlist_id: str, limit: int = 100) -> Dict[str, Any]:
    data = await asyncio.to_thread(_yt.get_playlist, playlist_id, limit)
    if "tracks" in data:
        data["tracks"] = [normalize_track(t) for t in data["tracks"]]
    thumbnail = get_best_thumbnail(data.get("thumbnails") or [])
    if thumbnail:
        data["thumbnail"] = thumbnail
    return data


async def get_watch_playlist(video_id: str) -> Dict[str, Any]:
    return await asyncio.to_thread(_yt.get_watch_playlist, video_id)


async def get_lyrics(browse_id: str) -> Dict[str, Any]:
    return await asyncio.to_thread(_yt.get_lyrics, browse_id)


async def get_home() -> Any:
    return await asyncio.to_thread(_yt.get_home)


async def get_explore() -> Any:
    return await asyncio.to_thread(_yt.get_explore)


async def get_charts(country: str = "ZZ") -> Dict[str, Any]:
    data = await asyncio.to_thread(_yt.get_charts, country)
    for key in ("songs", "videos", "artists", "trending"):
        section = data.get(key)
        if isinstance(section, dict):
            items = section.get("items") or []
            section["items"] = [normalize_track(i) for i in items]
    return data
