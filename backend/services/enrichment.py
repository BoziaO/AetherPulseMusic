"""
External metadata and lyrics fetchers.
- Last.fm: track tags, wiki summary, high-res cover art
- LRCLIB: timestamped (LRC) and plain lyrics
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

from ..core.config import LASTFM_API_KEY

log = logging.getLogger("aetherpulse")

_TIMEOUT = httpx.Timeout(8.0)


# ---------------------------------------------------------------------------
# Last.fm
# ---------------------------------------------------------------------------
async def fetch_lastfm_track_info(
    artist: str, title: str
) -> Optional[Dict[str, Any]]:
    if not LASTFM_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
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
            if resp.status_code != 200:
                return None
            track = resp.json().get("track", {})
            album = track.get("album", {})
            # Largest image is last in the list
            best_image = next(
                (img["#text"] for img in reversed(album.get("image", [])) if img.get("#text")),
                None,
            )
            return {
                "lastfm_url": track.get("url"),
                "tags": [t["name"] for t in track.get("toptags", {}).get("tag", [])][:5],
                "summary": track.get("wiki", {}).get("summary"),
                "high_res_cover": best_image,
            }
    except Exception as exc:
        log.warning("[lastfm] %s — %s: %s", artist, title, exc)
    return None


# ---------------------------------------------------------------------------
# LRCLIB
# ---------------------------------------------------------------------------
async def fetch_lrclib_lyrics(
    artist: str,
    title: str,
    album: Optional[str] = None,
    duration: int = 0,
) -> Optional[Dict[str, Any]]:
    params: Dict[str, Any] = {"artist_name": artist, "track_name": title}
    if album:
        params["album_name"] = album
    if duration > 0:
        params["duration"] = duration
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get("https://lrclib.net/api/get", params=params)
            if resp.status_code != 200:
                return None
            data = resp.json()
            return {
                "lyrics": data.get("syncedLyrics") or data.get("plainLyrics"),
                "syncedLyrics": data.get("syncedLyrics"),
                "source": "lrclib",
            }
    except Exception as exc:
        log.warning("[lrclib] %s — %s: %s", artist, title, exc)
    return None
