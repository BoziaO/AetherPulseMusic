"""
Data normalization helpers — ID validation, thumbnail resolution, track shape.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
BROWSE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,100}$")

THUMBNAIL_URL_KEYS = ("url", "thumbnail", "src")


def valid_video_id(vid: str) -> bool:
    return bool(VIDEO_ID_RE.fullmatch(vid or ""))


def valid_browse_id(bid: str) -> bool:
    return bool(BROWSE_ID_RE.fullmatch(bid or ""))


# ---------------------------------------------------------------------------
# Thumbnails
# ---------------------------------------------------------------------------
def upgrade_thumb_url(url: Optional[str]) -> Optional[str]:
    """Rewrite low-res Google / YouTube thumbnail URLs to the largest available."""
    if not url or not isinstance(url, str):
        return url
    if "googleusercontent.com" in url or "ggpht.com" in url:
        url = re.sub(r"=w\d+-h\d+(-[a-z0-9-]+)*", "=w1200-h1200-l90-rj", url, flags=re.I)
        url = re.sub(r"=s\d+(-[a-z0-9-]+)*", "=s1200", url, flags=re.I)
        url = re.sub(r"=w\d+$", "=w1200", url, flags=re.I)
    elif "ytimg.com" in url:
        url = re.sub(
            r"/(default|mqdefault|hqdefault|sddefault|0|1|2|3)\.jpg",
            "/maxresdefault.jpg",
            url,
            flags=re.I,
        )
    return url


def get_best_thumbnail(thumbnails: Any) -> Optional[str]:
    """Return the highest-resolution thumbnail URL from various input shapes."""
    if not thumbnails:
        return None
    if isinstance(thumbnails, str):
        return upgrade_thumb_url(thumbnails)
    if isinstance(thumbnails, dict):
        for key in THUMBNAIL_URL_KEYS:
            if thumbnails.get(key):
                return upgrade_thumb_url(thumbnails[key])
        return None
    if isinstance(thumbnails, list):
        best_url: Optional[str] = None
        best_size = -1
        for item in thumbnails:
            if isinstance(item, dict):
                url = next((item[k] for k in THUMBNAIL_URL_KEYS if item.get(k)), None)
                if not url:
                    continue
                size = (item.get("width") or 0) * (item.get("height") or 0)
                if size > best_size:
                    best_size, best_url = size, url
            elif isinstance(item, str) and best_size < 0:
                best_url = item
        return upgrade_thumb_url(best_url)
    return None


# ---------------------------------------------------------------------------
# Duration helpers
# ---------------------------------------------------------------------------
def parse_duration_seconds(duration_str: Optional[str]) -> int:
    """Parse "3:45" or "1:02:33" into total seconds."""
    if not duration_str or not isinstance(duration_str, str):
        return 0
    try:
        parts = [int(p) for p in duration_str.strip().split(":")]
    except ValueError:
        return 0
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0


# ---------------------------------------------------------------------------
# Track normalization
# ---------------------------------------------------------------------------
def normalize_track(track: Any) -> Dict[str, Any]:
    """Normalize a raw YTMusic response dict into a consistent frontend shape."""
    if not track or not isinstance(track, dict):
        return {}

    # Artist name
    artists_raw = track.get("artists", [])
    if isinstance(artists_raw, list):
        artist_name = ", ".join(
            a["name"] for a in artists_raw if isinstance(a, dict) and a.get("name")
        )
    elif isinstance(artists_raw, str):
        artist_name = artists_raw
    else:
        artist_name = ""
    if not artist_name:
        artist_name = track.get("artist") or track.get("author") or track.get("byline") or ""

    # Thumbnail
    thumbnail = get_best_thumbnail(track.get("thumbnails") or []) or track.get("thumbnail")

    # Album
    album_raw = track.get("album")
    album_name = album_raw.get("name") if isinstance(album_raw, dict) else (album_raw or "")

    # Duration
    duration_str = track.get("duration") or ""
    duration_secs = (
        track.get("durationSeconds")
        or track.get("duration_seconds")
        or track.get("lengthSeconds")
        or parse_duration_seconds(duration_str)
    )
    try:
        duration_secs = int(duration_secs)
    except (TypeError, ValueError):
        duration_secs = 0

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


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------
_FALLBACK_KEYS = ("videoId", "browseId", "playlistId")


def dedup_tracks(tracks: List[Dict], key: str = "videoId") -> List[Dict]:
    """Remove duplicates by a given key, preserving insertion order."""
    seen: set = set()
    result: List[Dict] = []
    for t in tracks:
        if not isinstance(t, dict):
            continue
        val = t.get(key)
        if not val:
            val = next((t.get(k) for k in _FALLBACK_KEYS if t.get(k)), None)
        if val:
            if val in seen:
                continue
            seen.add(val)
        if t.get("title") or t.get("name"):
            result.append(t)
    return result


# ---------------------------------------------------------------------------
# Error sanitisation
# ---------------------------------------------------------------------------
def safe_error(exc: Exception, max_len: int = 300) -> str:
    msg = str(exc)
    return msg[:max_len] + "…" if len(msg) > max_len else msg
