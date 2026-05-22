"""
/api/downloads/* — streaming proxy, download to disk, list/delete saved files.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Dict, Optional

import httpx
import yt_dlp
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from ..core.config import DOWNLOAD_DIR
from ..db.database import add_download_sync, db_exec, delete_download_sync, list_downloads_sync
from ..services import stream as stream_svc
from ..services import ytmusic as yt_svc
from ..utils.normalization import normalize_track, safe_error, valid_video_id

router = APIRouter(prefix="/api/downloads", tags=["downloads"])
log = logging.getLogger("aetherpulse")

_PROXY_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)
_PROXY_TIMEOUT = httpx.Timeout(10.0, read=90.0)
_CHUNK_SIZE = 512 * 1024  # 512 KB

_VALID_FORMATS = frozenset({"mp3", "m4a", "opus", "flac", "webm"})

_YDL_BASE: Dict[str, Any] = {
    "quiet": True,
    "no_warnings": True,
    "nocheckcertificate": True,
    "ignoreerrors": False,
    "no_color": True,
    "socket_timeout": 20,
    "retries": 3,
    "extractor_retries": 2,
}


# ---------------------------------------------------------------------------
# Streaming proxy (Range support + 403 auto-refresh)
# ---------------------------------------------------------------------------
@router.get("/playback/{video_id}")
async def proxy_playback(video_id: str, request: Request):
    if not valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    stream_url = await stream_svc.get_stream_url(video_id)
    if not stream_url:
        raise HTTPException(status_code=404, detail="Stream URL not found")

    fmt = request.query_params.get("format", "").lower()
    content_type = (
        "audio/mp4"  if fmt in ("m4a", "mp4") else
        "audio/webm" if fmt == "webm" else
        "audio/mpeg"
    )

    range_header = request.headers.get("Range")
    upstream_headers: Dict[str, str] = {
        "User-Agent": _PROXY_UA,
        "Accept": "*/*",
        "Accept-Encoding": "identity",
        "Connection": "keep-alive",
    }
    if range_header:
        upstream_headers["Range"] = range_header

    async def stream_bytes():
        current_url = stream_url
        bytes_sent = 0

        for attempt in range(3):
            try:
                hdrs = dict(upstream_headers)
                if bytes_sent > 0:
                    # Advance Range to skip already-sent bytes
                    existing = hdrs.get("Range", "")
                    if existing.startswith("bytes="):
                        base = int(existing[6:].split("-")[0])
                    else:
                        base = 0
                    hdrs["Range"] = f"bytes={base + bytes_sent}-"

                async with httpx.AsyncClient(timeout=_PROXY_TIMEOUT, follow_redirects=True) as client:
                    async with client.stream("GET", current_url, headers=hdrs) as resp:
                        if resp.status_code == 403:
                            stream_svc.evict(video_id)
                            current_url = await stream_svc.get_stream_url(video_id)
                            if not current_url:
                                return
                            continue
                        resp.raise_for_status()
                        async for chunk in resp.aiter_bytes(_CHUNK_SIZE):
                            if await request.is_disconnected():
                                return
                            if chunk:
                                bytes_sent += len(chunk)
                                yield chunk
                return

            except (httpx.ReadError, httpx.RemoteProtocolError, httpx.ConnectError) as err:
                log.warning("[proxy] %s attempt %d interrupted: %s", video_id, attempt + 1, err)
            except Exception as err:
                log.error("[proxy] %s fatal: %s", video_id, err)
                return

            if attempt < 2:
                stream_svc.evict(video_id)
                current_url = await stream_svc.get_stream_url(video_id)
                if not current_url:
                    return
                await asyncio.sleep(0.5 * (attempt + 1))

    return StreamingResponse(
        stream_bytes(),
        status_code=206 if range_header else 200,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Type": content_type,
            "Cache-Control": "public, max-age=3600",
        },
    )


# ---------------------------------------------------------------------------
# Stream URL + metadata (for client-side download)
# ---------------------------------------------------------------------------
@router.get("/info/{video_id}")
async def get_download_info(video_id: str, format: Optional[str] = "mp3"):
    if not valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    try:
        url, song_raw = await asyncio.gather(
            stream_svc.get_stream_url(video_id),
            yt_svc.get_song(video_id),
            return_exceptions=True,
        )
        if isinstance(url, Exception) or not url:
            raise HTTPException(status_code=404, detail="Stream URL not found")
        track = song_raw if not isinstance(song_raw, Exception) else {}
        fmt = (format or "").lower()
        mime = "audio/mp4" if fmt in ("m4a", "mp4") else "audio/webm" if fmt == "webm" else "audio/mpeg"
        return {"videoId": video_id, "streamUrl": url, "mimeType": mime, **track}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Saved downloads (server disk)
# ---------------------------------------------------------------------------
@router.get("")
async def list_downloads():
    items = await db_exec(list_downloads_sync)
    return {"downloads": items, "count": len(items)}


@router.delete("/{video_id}")
async def delete_download(video_id: str):
    if not valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    file_path = await db_exec(delete_download_sync, video_id)
    if file_path and os.path.isfile(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass
    return {"status": "ok", "videoId": video_id}


@router.post("/save/{video_id}")
async def save_to_disk(video_id: str, data: Optional[Dict[str, Any]] = None):
    """Download audio to the server's downloads/ directory via yt-dlp."""
    if not valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    fmt = ((data or {}).get("format") or "mp3").lower()
    if fmt not in _VALID_FORMATS:
        fmt = "mp3"

    def _download():
        opts = {
            **_YDL_BASE,
            "outtmpl": os.path.join(DOWNLOAD_DIR, f"{video_id}.%(ext)s"),
            "format": "bestaudio[ext=m4a]/bestaudio/best" if fmt == "m4a" else "bestaudio/best",
            "postprocessors": [] if fmt == "webm" else [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": fmt,
                "preferredquality": "192",
            }],
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)

    try:
        info = await asyncio.to_thread(_download)

        # Locate the actual file (yt-dlp may change extension)
        actual_path = os.path.join(DOWNLOAD_DIR, f"{video_id}.{fmt}")
        for ext in (fmt, "mp3", "m4a", "webm", "opus"):
            candidate = os.path.join(DOWNLOAD_DIR, f"{video_id}.{ext}")
            if os.path.isfile(candidate):
                actual_path = candidate
                break

        file_size = os.path.getsize(actual_path) if os.path.isfile(actual_path) else 0
        track = normalize_track((info or {}).get("videoDetails", info or {}))

        await db_exec(add_download_sync, {
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
        raise HTTPException(status_code=500, detail=safe_error(exc))
