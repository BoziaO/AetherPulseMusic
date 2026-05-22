"""
/api/page/*           — curated content pages (home, explore, mood pages, for-you)
/api/flows/revolution — personalised session flow generator
/api/recommendations/ — watch-playlist-based recommendation pool & smart radio
"""
from __future__ import annotations

import asyncio
import logging
import random
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request

from ..core import cache
from ..services import ytmusic as yt_svc
from ..utils.normalization import (
    dedup_tracks,
    get_best_thumbnail,
    normalize_track,
    safe_error,
    valid_video_id,
)

router = APIRouter(tags=["pages"])
log = logging.getLogger("aetherpulse")

_PAGE_TTL = {"home": 180, "explore": 180, "for-you": 180}
_DEFAULT_PAGE_TTL = 600


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _gather_songs(*queries: str, limit: int = 10) -> List[Dict]:
    results = await asyncio.gather(
        *[yt_svc.search_safe(q, "songs", limit) for q in queries],
        return_exceptions=True,
    )
    out: List[Dict] = []
    for r in results:
        if isinstance(r, list):
            out.extend(r)
    return out


def _mood_page(
    eyebrow: str,
    title: str,
    description: str,
    mood_label: str,
    tracks: List[Dict],
    artists: List[Dict],
) -> Dict:
    return {
        "eyebrow": eyebrow,
        "title": title,
        "description": description,
        "stats": [
            {"label": "Nastrój", "value": mood_label},
            {"label": "Utworów", "value": str(len(tracks))},
        ],
        "primarySection": {"title": "Polecane utwory", "items": tracks[:20]},
        "secondarySection": {"title": "Artyści", "items": artists},
        "tertiarySection": {"title": "", "items": []},
        "queue": tracks[:24],
    }


# ---------------------------------------------------------------------------
# Page builder
# ---------------------------------------------------------------------------
async def _build_page(page_key: str, recent_ids: Optional[List[str]] = None) -> Dict:
    if page_key == "home":
        data = await yt_svc.get_home()
        for section in (data or []):
            if "contents" in section:
                section["contents"] = [normalize_track(c) for c in section["contents"]]
            thumb = get_best_thumbnail(section.get("thumbnails") or [])
            if thumb:
                section["thumbnail"] = thumb
        return {"sections": data or []}

    if page_key == "explore":
        return await yt_svc.get_explore() or {}

    if page_key == "chill":
        tracks, artists = await asyncio.gather(
            _gather_songs(
                "chill lofi beats study",
                "ambient relax music peaceful",
                "acoustic indie chill slow",
                "chillhop neo soul chill",
            ),
            yt_svc.search_safe("chill acoustic lofi artist", "artists", 6),
        )
        return _mood_page(
            "Tryb relaksu", "Chillout", "Spokojne dźwięki na każdą chwilę",
            "🌊 Chill", dedup_tracks(tracks), artists,
        )

    if page_key == "energy":
        tracks, artists = await asyncio.gather(
            _gather_songs(
                "workout pump up energy gym",
                "edm dance party hits",
                "phonk drift gym motivation",
                "bass boost electronic hype",
            ),
            yt_svc.search_safe("edm electronic dance artist", "artists", 6),
        )
        return _mood_page(
            "Tryb energii", "Energia", "Muzyka, która pobudza i napędza",
            "⚡ Energy", dedup_tracks(tracks), artists,
        )

    if page_key == "discover":
        tracks, artists = await asyncio.gather(
            _gather_songs(
                "viral music 2024",
                "indie alternative underground",
                "new music rising artist",
                "trending song this week",
            ),
            yt_svc.search_safe("rising indie alternative artist", "artists", 6),
        )
        return {
            "eyebrow": "Odkrywaj",
            "title": "Przeglądaj",
            "description": "Świeże dźwięki i nowe odkrycia",
            "stats": [{"label": "Nowości", "value": str(len(tracks))}],
            "primarySection": {"title": "Trending teraz", "items": dedup_tracks(tracks)[:20]},
            "secondarySection": {"title": "Wschodzące gwiazdy", "items": artists},
            "tertiarySection": {"title": "", "items": []},
            "queue": dedup_tracks(tracks)[:24],
        }

    if page_key == "playlists":
        raw = await _gather_songs(
            "top hits playlist 2024",
            "workout playlist energy",
            "chill vibes playlist relax",
            "party playlist dance hits",
        )
        # search_safe uses "songs" filter; re-query for playlists
        results = await asyncio.gather(
            *[yt_svc.search_safe(q, "playlists", 8) for q in [
                "top hits playlist 2024", "workout playlist energy",
                "chill vibes playlist relax", "party playlist dance hits",
            ]],
            return_exceptions=True,
        )
        playlists: List[Dict] = []
        for r in results:
            if isinstance(r, list):
                playlists.extend(r)
        playlists = dedup_tracks(playlists, key="playlistId")
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

    if page_key == "albums":
        results = await asyncio.gather(
            *[yt_svc.search_safe(q, "albums", 8) for q in [
                "new album 2024 popular", "best pop rnb album 2024",
                "rap hiphop album 2024", "rock indie album 2024",
            ]],
            return_exceptions=True,
        )
        albums: List[Dict] = []
        for r in results:
            if isinstance(r, list):
                albums.extend(r)
        albums = dedup_tracks(albums, key="browseId")
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

    if page_key == "artists":
        results = await asyncio.gather(
            *[yt_svc.search_safe(q, "artists", 8) for q in [
                "top pop artist 2024", "trending rnb hiphop artist",
                "rock indie popular artist", "electronic edm dj artist",
            ]],
            return_exceptions=True,
        )
        artists: List[Dict] = []
        for r in results:
            if isinstance(r, list):
                artists.extend(r)
        artists = dedup_tracks(artists, key="browseId")
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

    if page_key == "for-you":
        seed_id = next((i for i in (recent_ids or []) if valid_video_id(i)), None)
        if seed_id:
            watch_data, fallback = await asyncio.gather(
                yt_svc.get_watch_playlist(seed_id),
                yt_svc.search_safe("top hits popular 2024", "songs", 10),
                return_exceptions=True,
            )
            watch_tracks = [
                normalize_track(t) for t in
                (watch_data.get("tracks") or [] if not isinstance(watch_data, Exception) else [])
            ]
            extra = fallback if isinstance(fallback, list) else []
            all_tracks = dedup_tracks(watch_tracks + extra)
        else:
            all_tracks = await yt_svc.search_safe("popular music hits 2024", "songs", 20)
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

    return {"sections": [], "message": f"Page '{page_key}' not implemented"}


# ---------------------------------------------------------------------------
# Page endpoint
# ---------------------------------------------------------------------------
@router.get("/api/page/{page_key}")
async def get_page(page_key: str, request: Request):
    recent_param = request.query_params.get("recent", "")
    recent_ids = [v.strip() for v in recent_param.split(",") if v.strip()]

    ck = f"page:{page_key}"
    if page_key == "for-you" and recent_ids:
        ck = f"page:for-you:{recent_ids[0]}"

    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        result = await _build_page(page_key, recent_ids)
        ttl = _PAGE_TTL.get(page_key, _DEFAULT_PAGE_TTL)
        cache.set(ck, result, ttl=ttl)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        log.error("get_page(%s): %s", page_key, exc)
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------
@router.get("/api/recommendations/pool")
async def get_recommendations_pool(
    videoId: Optional[str] = None,
    seeds: Optional[str] = None,
):
    target_id = videoId or (seeds.split(",")[0].strip() if seeds else None)
    if not target_id or not valid_video_id(target_id):
        return {"items": [], "pool": []}

    ck = f"rec_pool:{target_id}"
    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        watch = await yt_svc.get_watch_playlist(target_id)
        tracks = [normalize_track(t) for t in (watch.get("tracks") or [])]
        result = {"items": tracks, "pool": tracks, "seedId": target_id}
        cache.set(ck, result, ttl=300)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


@router.get("/api/recommendations/smart-radio/{video_id}")
async def get_smart_radio(video_id: str):
    if not valid_video_id(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")

    ck = f"smart_radio:{video_id}"
    if (hit := cache.get(ck)) is not None:
        return hit

    try:
        watch = await yt_svc.get_watch_playlist(video_id)
        tracks = [normalize_track(t) for t in (watch.get("tracks") or [])]
        result = {"items": tracks, "seedId": video_id}
        cache.set(ck, result, ttl=600)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=safe_error(exc))


# ---------------------------------------------------------------------------
# Flow generation
# ---------------------------------------------------------------------------
_FLOW_PRESETS: Dict[str, List[str]] = {
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


@router.post("/api/flows/revolution")
async def generate_flow(data: Optional[Dict[str, Any]] = None):
    body = data or {}
    preset: str = body.get("preset", "focus")
    session_minutes: int = max(5, min(120, int(body.get("sessionMinutes", 35))))
    novelty: int = max(0, min(100, int(body.get("novelty", 55))))
    pool: List[Dict] = body.get("pool", [])

    target_count = max(5, min(30, session_minutes // 3))
    queries = _FLOW_PRESETS.get(preset, _FLOW_PRESETS["focus"])

    # Find a valid seed from the user's pool
    seed_id = next(
        (t["videoId"] for t in pool if isinstance(t, dict) and valid_video_id(t.get("videoId", ""))),
        None,
    )

    async def _watch_safe() -> List[Dict]:
        if not seed_id:
            return []
        try:
            w = await yt_svc.get_watch_playlist(seed_id)
            return [normalize_track(t) for t in (w.get("tracks") or [])[:12]]
        except Exception:
            return []

    search_results, watch_tracks = await asyncio.gather(
        asyncio.gather(*[yt_svc.search_safe(q, "songs", 10) for q in queries[:3]]),
        _watch_safe(),
    )

    search_tracks: List[Dict] = []
    for r in search_results:
        if isinstance(r, list):
            search_tracks.extend(r)

    search_tracks = [t for t in search_tracks if t.get("videoId") and t.get("title")]
    watch_tracks = [t for t in watch_tracks if t.get("videoId") and t.get("title")]

    familiar_pool = [
        normalize_track(t) for t in pool[:30]
        if isinstance(t, dict) and t.get("videoId") and t.get("title")
    ]

    n_familiar = round(target_count * (100 - novelty) / 100)
    n_new = target_count - n_familiar

    new_pool = dedup_tracks(search_tracks + watch_tracks)
    selected_familiar = random.sample(familiar_pool, min(n_familiar, len(familiar_pool)))
    selected_new = random.sample(new_pool, min(n_new, len(new_pool)))

    # Interleave familiar and new tracks for natural flow
    combined: List[Dict] = []
    for f, n in zip(selected_familiar, selected_new):
        combined.append(f)
        combined.append(n)
    combined += selected_familiar[len(selected_new):] + selected_new[len(selected_familiar):]

    final = dedup_tracks(combined)

    if not final:
        final = familiar_pool[:target_count] or await yt_svc.search_safe("popular music 2024", "songs", target_count)

    return {
        "tracks": final[:target_count],
        "preset": preset,
        "sessionMinutes": session_minutes,
        "novelty": novelty,
        "totalTracks": len(final[:target_count]),
        "seedId": seed_id,
    }
