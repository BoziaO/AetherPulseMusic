"""
In-memory TTL cache shared across the application.
Thread-safe for async usage (single-process, no cross-process sharing needed).
"""
from __future__ import annotations

import time
from typing import Any, Dict, Optional

_store: Dict[str, tuple] = {}   # key → (value, expires_at)
_MAX = 2048
stats = {"hits": 0, "misses": 0}


def get(key: str) -> Optional[Any]:
    entry = _store.get(key)
    if entry and time.time() < entry[1]:
        stats["hits"] += 1
        return entry[0]
    _store.pop(key, None)
    stats["misses"] += 1
    return None


def set(key: str, value: Any, ttl: int) -> None:
    if len(_store) >= _MAX:
        _evict()
    _store[key] = (value, time.time() + ttl)


def delete(key: str) -> None:
    _store.pop(key, None)


def delete_prefix(prefix: str) -> int:
    keys = [k for k in list(_store) if k.startswith(prefix)]
    for k in keys:
        _store.pop(k, None)
    return len(keys)


def clear() -> int:
    count = len(_store)
    _store.clear()
    return count


def size() -> int:
    return len(_store)


def hit_rate() -> float:
    total = stats["hits"] + stats["misses"]
    return round(stats["hits"] / max(1, total) * 100, 1)


def _evict() -> None:
    """Evict expired entries first, then oldest 25% if still over limit."""
    now = time.time()
    expired = [k for k, v in list(_store.items()) if now >= v[1]]
    for k in expired:
        _store.pop(k, None)
    if len(_store) >= _MAX:
        oldest = sorted(_store.items(), key=lambda x: x[1][1])[: _MAX // 4]
        for k, _ in oldest:
            _store.pop(k, None)
