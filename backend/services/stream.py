"""
yt-dlp stream URL resolution with per-video-ID locking and TTL cache.
Signed YouTube URLs expire in ~6 min; we refresh at 4:30 (_STREAM_TTL).
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, Optional

import yt_dlp

log = logging.getLogger("aetherpulse")

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache: Dict[str, tuple] = {}   # video_id → (url, expires_at)
_STREAM_TTL = 270               # seconds before expiry (YouTube signs for ~360s)
_CACHE_MAX = 256

_locks: Dict[str, asyncio.Lock] = {}
_LOCKS_MAX = 256

# ---------------------------------------------------------------------------
# yt-dlp options
# ---------------------------------------------------------------------------
_YDL_BASE: Dict[str, Any] = {
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


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _get_lock(video_id: str) -> asyncio.Lock:
    """Return (or create) the per-ID lock, pruning stale locks when over limit."""
    if video_id not in _locks:
        if len(_locks) > _LOCKS_MAX:
            stale = [k for k, lk in list(_locks.items()) if not lk.locked()]
            for k in stale:
                _locks.pop(k, None)
        _locks[video_id] = asyncio.Lock()
    return _locks[video_id]


def _evict() -> None:
    """Remove expired entries; if still over limit, drop the oldest."""
    now = time.time()
    expired = [k for k, v in list(_cache.items()) if now >= v[1]]
    for k in expired:
        _cache.pop(k, None)
    if len(_cache) > _CACHE_MAX:
        oldest = sorted(_cache.items(), key=lambda x: x[1][1])[: len(_cache) - _CACHE_MAX]
        for k, _ in oldest:
            _cache.pop(k, None)


def _fetch_sync(video_id: str) -> Optional[str]:
    """Blocking yt-dlp call — run this in a thread."""
    try:
        with yt_dlp.YoutubeDL(_YDL_BASE) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={video_id}", download=False
            )
            if not info:
                return None
            url = info.get("url")
            if not url and info.get("formats"):
                url = info["formats"][-1].get("url")
            return url
    except Exception as exc:
        log.warning("[yt_dlp] %s: %s", video_id, exc)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def get_stream_url(video_id: str) -> Optional[str]:
    """
    Return a fresh-enough stream URL for *video_id*.
    Uses double-checked locking so concurrent requests share one yt-dlp call.
    """
    now = time.time()
    entry = _cache.get(video_id)
    if entry and now < entry[1]:
        return entry[0]
    _cache.pop(video_id, None)

    async with _get_lock(video_id):
        # Re-check inside the lock (another coroutine may have populated it)
        entry = _cache.get(video_id)
        if entry and now < entry[1]:
            return entry[0]

        url = await asyncio.to_thread(_fetch_sync, video_id)
        if url:
            _evict()
            _cache[video_id] = (url, now + _STREAM_TTL)
        _locks.pop(video_id, None)
        return url


def evict(video_id: str) -> None:
    """Force-remove a cached URL (e.g. after a 403)."""
    _cache.pop(video_id, None)


def cache_size() -> int:
    return len(_cache)
