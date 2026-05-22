"""
SQLite persistence layer.
All *_sync functions are blocking and must be run via db_exec / asyncio.to_thread.
"""
from __future__ import annotations

import asyncio
import json
import sqlite3
import time
import uuid
from typing import Any, Dict, List, Optional

from ..core.config import DATABASE_PATH

# Single asyncio lock keeps writes serialised without connection-pool overhead.
_LOCK = asyncio.Lock()


# ---------------------------------------------------------------------------
# Connection factory
# ---------------------------------------------------------------------------
def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA synchronous=NORMAL")
    c.execute("PRAGMA foreign_keys=ON")
    return c


async def db_exec(fn, *args):
    """Run a synchronous DB function under the global write lock, in a thread."""
    async with _LOCK:
        return await asyncio.to_thread(fn, *args)


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------
def initialize_database() -> None:
    c = _conn()
    try:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS user_store (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS local_playlists (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                cover       TEXT NOT NULL DEFAULT '',
                created_at  REAL NOT NULL,
                updated_at  REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS playlist_tracks (
                playlist_id TEXT NOT NULL
                            REFERENCES local_playlists(id) ON DELETE CASCADE,
                position    INTEGER NOT NULL,
                video_id    TEXT NOT NULL,
                track_json  TEXT NOT NULL,
                added_at    REAL NOT NULL,
                PRIMARY KEY (playlist_id, video_id)
            );

            CREATE INDEX IF NOT EXISTS idx_pt_playlist
                ON playlist_tracks(playlist_id, position);

            CREATE TABLE IF NOT EXISTS downloads (
                video_id      TEXT PRIMARY KEY,
                title         TEXT NOT NULL DEFAULT '',
                artist        TEXT NOT NULL DEFAULT '',
                thumbnail     TEXT NOT NULL DEFAULT '',
                duration      TEXT NOT NULL DEFAULT '',
                file_path     TEXT NOT NULL DEFAULT '',
                file_size     INTEGER NOT NULL DEFAULT 0,
                format        TEXT NOT NULL DEFAULT 'mp3',
                downloaded_at REAL NOT NULL
            );
        """)
        c.commit()
    finally:
        c.close()


# ---------------------------------------------------------------------------
# User state
# ---------------------------------------------------------------------------
def _load_user_state_sync() -> Dict[str, Any]:
    c = _conn()
    try:
        row = c.execute("SELECT value FROM user_store WHERE key='state'").fetchone()
        return json.loads(row["value"]) if row and row["value"] else {}
    finally:
        c.close()


def _save_user_state_sync(state: Dict[str, Any]) -> None:
    c = _conn()
    try:
        c.execute(
            "INSERT OR REPLACE INTO user_store (key, value) VALUES ('state', ?)",
            (json.dumps(state, ensure_ascii=False),),
        )
        c.commit()
    finally:
        c.close()


async def load_user_state() -> Dict[str, Any]:
    return await db_exec(_load_user_state_sync)


async def save_user_state(state: Dict[str, Any]) -> None:
    await db_exec(_save_user_state_sync, state)


# ---------------------------------------------------------------------------
# Downloads
# ---------------------------------------------------------------------------
def list_downloads_sync() -> List[Dict]:
    c = _conn()
    try:
        rows = c.execute("SELECT * FROM downloads ORDER BY downloaded_at DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        c.close()


def add_download_sync(info: Dict[str, Any]) -> None:
    c = _conn()
    try:
        c.execute(
            """INSERT OR REPLACE INTO downloads
               (video_id, title, artist, thumbnail, duration,
                file_path, file_size, format, downloaded_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                info["video_id"], info.get("title", ""), info.get("artist", ""),
                info.get("thumbnail", ""), info.get("duration", ""),
                info.get("file_path", ""), info.get("file_size", 0),
                info.get("format", "mp3"), time.time(),
            ),
        )
        c.commit()
    finally:
        c.close()


def delete_download_sync(video_id: str) -> Optional[str]:
    """Returns file_path if found, else None."""
    c = _conn()
    try:
        row = c.execute("SELECT file_path FROM downloads WHERE video_id=?", (video_id,)).fetchone()
        if not row:
            return None
        c.execute("DELETE FROM downloads WHERE video_id=?", (video_id,))
        c.commit()
        return row["file_path"]
    finally:
        c.close()


# ---------------------------------------------------------------------------
# Local playlists
# ---------------------------------------------------------------------------
def _tracks_for(c: sqlite3.Connection, playlist_id: str) -> List[Dict]:
    rows = c.execute(
        "SELECT track_json FROM playlist_tracks WHERE playlist_id=? ORDER BY position",
        (playlist_id,),
    ).fetchall()
    return [json.loads(r["track_json"]) for r in rows]


def get_all_playlists_sync() -> List[Dict]:
    c = _conn()
    try:
        playlists = [dict(r) for r in c.execute(
            "SELECT * FROM local_playlists ORDER BY updated_at DESC"
        ).fetchall()]
        for pl in playlists:
            pl["tracks"] = _tracks_for(c, pl["id"])
            pl["trackCount"] = len(pl["tracks"])
        return playlists
    finally:
        c.close()


def get_playlist_sync(playlist_id: str) -> Optional[Dict]:
    c = _conn()
    try:
        row = c.execute("SELECT * FROM local_playlists WHERE id=?", (playlist_id,)).fetchone()
        if not row:
            return None
        pl = dict(row)
        pl["tracks"] = _tracks_for(c, playlist_id)
        pl["trackCount"] = len(pl["tracks"])
        return pl
    finally:
        c.close()


def create_playlist_sync(title: str, description: str = "", cover: str = "") -> Dict:
    c = _conn()
    now = time.time()
    pl_id = str(uuid.uuid4())
    try:
        c.execute(
            "INSERT INTO local_playlists (id, title, description, cover, created_at, updated_at)"
            " VALUES (?,?,?,?,?,?)",
            (pl_id, title, description, cover, now, now),
        )
        c.commit()
        return {
            "id": pl_id, "title": title, "description": description,
            "cover": cover, "tracks": [], "trackCount": 0,
            "created_at": now, "updated_at": now,
        }
    finally:
        c.close()


def update_playlist_sync(playlist_id: str, updates: Dict) -> bool:
    c = _conn()
    try:
        if not c.execute("SELECT id FROM local_playlists WHERE id=?", (playlist_id,)).fetchone():
            return False
        fields, vals = [], []
        for col in ("title", "description", "cover"):
            if col in updates:
                fields.append(f"{col}=?")
                vals.append(updates[col])
        if not fields:
            return True
        fields.append("updated_at=?")
        vals.extend([time.time(), playlist_id])
        c.execute(f"UPDATE local_playlists SET {', '.join(fields)} WHERE id=?", vals)
        c.commit()
        return True
    finally:
        c.close()


def delete_playlist_sync(playlist_id: str) -> bool:
    c = _conn()
    try:
        if not c.execute("SELECT id FROM local_playlists WHERE id=?", (playlist_id,)).fetchone():
            return False
        c.execute("DELETE FROM local_playlists WHERE id=?", (playlist_id,))
        c.commit()
        return True
    finally:
        c.close()


def add_track_sync(playlist_id: str, track: Dict) -> bool:
    c = _conn()
    try:
        if not c.execute("SELECT id FROM local_playlists WHERE id=?", (playlist_id,)).fetchone():
            return False
        video_id = track.get("videoId")
        if not video_id:
            return False
        max_pos = c.execute(
            "SELECT COALESCE(MAX(position),0) FROM playlist_tracks WHERE playlist_id=?",
            (playlist_id,),
        ).fetchone()[0]
        c.execute(
            "INSERT OR REPLACE INTO playlist_tracks"
            " (playlist_id, position, video_id, track_json, added_at) VALUES (?,?,?,?,?)",
            (playlist_id, max_pos + 1, video_id, json.dumps(track, ensure_ascii=False), time.time()),
        )
        c.execute("UPDATE local_playlists SET updated_at=? WHERE id=?", (time.time(), playlist_id))
        c.commit()
        return True
    finally:
        c.close()


def remove_track_sync(playlist_id: str, video_id: str) -> None:
    c = _conn()
    try:
        c.execute(
            "DELETE FROM playlist_tracks WHERE playlist_id=? AND video_id=?",
            (playlist_id, video_id),
        )
        c.execute("UPDATE local_playlists SET updated_at=? WHERE id=?", (time.time(), playlist_id))
        c.commit()
    finally:
        c.close()


def reorder_tracks_sync(playlist_id: str, video_ids: List[str]) -> bool:
    c = _conn()
    try:
        for idx, vid in enumerate(video_ids):
            c.execute(
                "UPDATE playlist_tracks SET position=? WHERE playlist_id=? AND video_id=?",
                (idx, playlist_id, vid),
            )
        c.execute("UPDATE local_playlists SET updated_at=? WHERE id=?", (time.time(), playlist_id))
        c.commit()
        return True
    except Exception:
        return False
    finally:
        c.close()
