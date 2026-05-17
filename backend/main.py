import os
import sys
from fastapi import FastAPI, HTTPException, Query, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import uvicorn
import yt_dlp
import json
from typing import Optional, List, Dict, Any
import httpx
import asyncio
import time
from aiocache import cached, Cache
from aiocache.serializers import JsonSerializer

from ytmusicapi import YTMusic

app = FastAPI(title="AetherPulse Music Backend")

# CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YTMusic
# For personalized data, you would need to provide headers or oauth.json
# ytmusic = YTMusic("oauth.json")
ytmusic = YTMusic()

DOWNLOAD_DIR = "downloads"
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

# Cache for stream URLs to speed up playback
stream_cache = {}
STREAM_CACHE_TTL = 3600  # 1 hour

def get_best_thumbnail(thumbnails: Any) -> Optional[str]:
    if not thumbnails:
        return None

    if isinstance(thumbnails, list):
        for item in reversed(thumbnails):
            if isinstance(item, dict):
                url = item.get("url") or item.get("thumbnail") or item.get("src")
                if url:
                    return url
            elif isinstance(item, str):
                return item
    if isinstance(thumbnails, dict):
        return thumbnails.get("url") or thumbnails.get("thumbnail") or thumbnails.get("src")
    return None


def get_stream_url(video_id: str):
    now = time.time()
    if video_id in stream_cache:
        url, expiry = stream_cache[video_id]
        if now < expiry:
            return url
            
    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': True,
        'no_color': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info.get("url")
            if stream_url:
                stream_cache[video_id] = (stream_url, now + STREAM_CACHE_TTL)
            return stream_url
    except Exception as e:
        print(f"yt_dlp error: {e}")
        return None

def normalize_track(track: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure track has all fields frontend expects"""
    if not track:
        return {}
    
    video_id = track.get("videoId")
    title = track.get("title")
    
    artists_raw = track.get("artists", [])
    if isinstance(artists_raw, list) and artists_raw:
        artist_name = ", ".join([a.get("name", "") for a in artists_raw if isinstance(a, dict)])
    elif isinstance(artists_raw, str):
        artist_name = artists_raw
    else:
        artist_name = track.get("author", track.get("byline", "Unknown Artist"))

    thumbnails = track.get("thumbnails", [])
    thumbnail = get_best_thumbnail(thumbnails) or track.get("thumbnail")
    
    album = track.get("album")
    if isinstance(album, dict):
        album_name = album.get("name")
    else:
        album_name = album

    return {
        "videoId": video_id,
        "title": title,
        "artist": artist_name,
        "thumbnail": thumbnail,
        "album": album_name,
        "duration": track.get("duration"),
        "duration_seconds": track.get("duration_seconds"),
        **track
    }

@app.get("/api/ytmusic/search")
@cached(ttl=600, cache=Cache.MEMORY, serializer=JsonSerializer())
async def search(q: str = Query(...), filter: Optional[str] = None):
    try:
        results = ytmusic.search(q, filter=filter)
        return [normalize_track(r) for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ytmusic/song/{video_id}")
@cached(ttl=3600, cache=Cache.MEMORY, serializer=JsonSerializer())
async def get_song(video_id: str):
    try:
        song_info = ytmusic.get_song(video_id)
        return normalize_track(song_info.get("videoDetails", song_info))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ytmusic/album/{album_id}")
@cached(ttl=3600, cache=Cache.MEMORY, serializer=JsonSerializer())
async def get_album(album_id: str):
    try:
        album = ytmusic.get_album(album_id)
        if "tracks" in album:
            album["tracks"] = [normalize_track(t) for t in album["tracks"]]
        return album
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ytmusic/artist/{artist_id}")
@cached(ttl=3600, cache=Cache.MEMORY, serializer=JsonSerializer())
async def get_artist(artist_id: str):
    try:
        artist = ytmusic.get_artist(artist_id)
        return artist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ytmusic/playlist/{playlist_id}")
@cached(ttl=600, cache=Cache.MEMORY, serializer=JsonSerializer())
async def get_playlist(playlist_id: str, limit: int = 100):
    try:
        playlist = ytmusic.get_playlist(playlist_id, limit=limit)
        if "tracks" in playlist:
            playlist["tracks"] = [normalize_track(t) for t in playlist["tracks"]]
        return playlist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lyrics")
@cached(ttl=86400, cache=Cache.MEMORY, serializer=JsonSerializer())
async def get_lyrics(videoId: str):
    try:
        watch_playlist = ytmusic.get_watch_playlist(videoId)
        if not watch_playlist.get("lyrics"):
            return {"lyrics": "No lyrics available"}
        lyrics = ytmusic.get_lyrics(watch_playlist["lyrics"])
        return lyrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/page/{page_key}")
@cached(ttl=300, cache=Cache.MEMORY, serializer=JsonSerializer())
async def get_page(page_key: str):
    try:
        if page_key == "home":
            data = ytmusic.get_home()
            for section in data:
                if "contents" in section:
                    section["contents"] = [normalize_track(c) for c in section["contents"]]
            return {"sections": data}
        elif page_key == "explore":
            data = ytmusic.get_explore()
            return data
        else:
            return {"sections": [], "message": f"Page {page_key} not yet implemented"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

# Resilient Proxy Playback with Range Support and urrlib3 fallback/logic
@app.get("/api/downloads/playback/{video_id}")
async def proxy_playback(video_id: str, request: Request):
    async def probe_stream_headers(url: str) -> Dict[str, Optional[str]]:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.head(url, headers=headers)
            response.raise_for_status()
            return {
                "Content-Length": response.headers.get("Content-Length"),
                "Content-Type": response.headers.get("Content-Type", "audio/mpeg"),
                "Content-Range": response.headers.get("Content-Range"),
            }

    async def stream_generator(url: str):
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                async with client.stream("GET", url, headers=headers) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes(256 * 1024):
                        if not chunk:
                            continue
                        if await request.is_disconnected():
                            break
                        yield chunk
        except httpx.ReadError as err:
            print(f"Playback interrupted for {video_id}: {err}")
        except Exception as err:
            print(f"Playback stream error for {video_id}: {err}")

    try:
        stream_url = await asyncio.to_thread(get_stream_url, video_id)
        if not stream_url:
            raise HTTPException(status_code=404, detail="Stream URL not found")

        range_header = request.headers.get("Range")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "*/*",
            "Connection": "keep-alive",
        }
        if range_header:
            headers["Range"] = range_header

        status_code = 206 if range_header else 200
        stream_info = await probe_stream_headers(stream_url)

        response_headers = {
            "Accept-Ranges": "bytes",
            "Content-Type": stream_info["Content-Type"],
            "Cache-Control": "public, max-age=3600",
        }
        if stream_info["Content-Length"]:
            response_headers["Content-Length"] = stream_info["Content-Length"]
        if stream_info["Content-Range"]:
            response_headers["Content-Range"] = stream_info["Content-Range"]

        status_code = 206 if range_header else 200

        return StreamingResponse(
            stream_generator(stream_url),
            status_code=status_code,
            headers=response_headers,
        )
    except Exception as e:
        print(f"Proxy error for {video_id}: {e}")
        stream_cache.pop(video_id, None)
        new_url = await asyncio.to_thread(get_stream_url, video_id)
        if new_url and new_url != stream_url:
            try:
                stream_info = await probe_stream_headers(new_url)
                response_headers = {
                    "Accept-Ranges": "bytes",
                    "Content-Type": stream_info["Content-Type"],
                    "Cache-Control": "public, max-age=3600",
                }
                if stream_info["Content-Length"]:
                    response_headers["Content-Length"] = stream_info["Content-Length"]
                if stream_info["Content-Range"]:
                    response_headers["Content-Range"] = stream_info["Content-Range"]
                return StreamingResponse(
                    stream_generator(new_url),
                    status_code=status_code,
                    headers=response_headers,
                )
            except Exception as fallback_error:
                print(f"Fallback playback error for {video_id}: {fallback_error}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/downloads/info/{video_id}")
async def get_download_info(video_id: str):
    try:
        stream_url = await asyncio.to_thread(get_stream_url, video_id)
        return {"videoId": video_id, "streamUrl": stream_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/state")
async def get_user_state():
    return {
        "favorites": [],
        "recent": [],
        "queues": []
    }

@app.patch("/api/user/state")
async def update_user_state(state: Dict[str, Any]):
    return {"status": "ok"}

@app.post("/api/user/recent")
async def add_recent(data: Dict[str, Any]):
    return {"status": "ok"}

@app.post("/api/user/queues")
async def save_queue(data: Dict[str, Any]):
    return {"status": "ok"}

@app.post("/api/user/favorites/toggle")
async def toggle_favorite(data: Dict[str, Any]):
    return {"status": "ok", "favorited": True}

@app.get("/api/auth/session")
async def get_auth_session():
    return {"authenticated": False}

@app.post("/api/auth/logout")
async def logout():
    return {"status": "ok"}

@app.get("/api/recommendations/pool")
@cached(ttl=300, cache=Cache.MEMORY, serializer=JsonSerializer())
async def get_recommendations_pool(videoId: Optional[str] = None, seeds: Optional[str] = None):
    try:
        target_id = videoId or (seeds.split(',')[0] if seeds else None)
        if not target_id:
            return {"items": [], "pool": []}
            
        watch_playlist = ytmusic.get_watch_playlist(target_id)
        tracks = [normalize_track(t) for t in watch_playlist.get("tracks", [])]
        return {"items": tracks, "pool": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recommendations/smart-radio/{video_id}")
@cached(ttl=600, cache=Cache.MEMORY, serializer=JsonSerializer())
async def get_smart_radio(video_id: str):
    try:
        watch_playlist = ytmusic.get_watch_playlist(video_id)
        tracks = [normalize_track(t) for t in watch_playlist.get("tracks", [])]
        return {"items": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/flows/revolution")
async def get_flows_revolution():
    return {"sections": []}

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001)
