"""
/api/user/* — persistent user state: favorites, recent plays, saved queues.
"""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from ..db.database import load_user_state, save_user_state
from ..utils.normalization import normalize_track

router = APIRouter(prefix="/api/user", tags=["user"])


def _require_dict(data: Any, label: str = "body") -> Dict:
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail=f"{label} must be a JSON object")
    return data


# ---------------------------------------------------------------------------
# State (bulk read / write)
# ---------------------------------------------------------------------------
@router.get("/state")
async def get_state():
    state = await load_user_state()
    state.setdefault("favorites", [])
    state.setdefault("recent", [])
    state.setdefault("queues", [])
    return state


@router.patch("/state")
async def update_state(state: Dict[str, Any]):
    _require_dict(state, "state")
    await save_user_state(state)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Recent plays
# ---------------------------------------------------------------------------
@router.post("/recent")
async def add_recent(data: Dict[str, Any]):
    _require_dict(data, "recent item")
    state = await load_user_state()
    video_id = data.get("videoId")
    recent = [i for i in state.get("recent", []) if i.get("videoId") != video_id]
    recent.insert(0, normalize_track(data))
    state["recent"] = recent[:100]
    await save_user_state(state)
    return {"status": "ok", "count": len(state["recent"])}


# ---------------------------------------------------------------------------
# Favorites
# ---------------------------------------------------------------------------
@router.post("/favorites/toggle")
async def toggle_favorite(data: Dict[str, Any]):
    _require_dict(data, "favorite item")
    video_id = data.get("videoId")
    if not video_id:
        raise HTTPException(status_code=400, detail="videoId is required")

    state = await load_user_state()
    favorites = [f for f in state.get("favorites", []) if isinstance(f, dict)]
    was_favorite = any(f.get("videoId") == video_id for f in favorites)

    if was_favorite:
        favorites = [f for f in favorites if f.get("videoId") != video_id]
    else:
        favorites.insert(0, normalize_track(data))

    state["favorites"] = favorites
    await save_user_state(state)
    return {"status": "ok", "favorited": not was_favorite, "count": len(favorites)}


# ---------------------------------------------------------------------------
# Saved queues
# ---------------------------------------------------------------------------
@router.post("/queues")
async def save_queue(data: Dict[str, Any]):
    _require_dict(data, "queue item")
    state = await load_user_state()
    queues = [q for q in state.get("queues", []) if q.get("id") != data.get("id")]
    queues.insert(0, data)
    state["queues"] = queues[:50]
    await save_user_state(state)
    return {"status": "ok", "queues": state["queues"]}


@router.delete("/queues/{queue_id}")
async def delete_queue(queue_id: str):
    state = await load_user_state()
    state["queues"] = [q for q in state.get("queues", []) if q.get("id") != queue_id]
    await save_user_state(state)
    return {"status": "ok"}
