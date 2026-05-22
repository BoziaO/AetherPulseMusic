"""
Application configuration — all settings read from environment or hard defaults.
"""
from __future__ import annotations

import os
from typing import List

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BACKEND_DIR: str = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
DOWNLOAD_DIR: str = os.path.join(BACKEND_DIR, "downloads")
COVER_DIR: str = os.path.join(BACKEND_DIR, "covers")
DATABASE_PATH: str = os.path.join(BACKEND_DIR, "aetherpulse.db")

os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(COVER_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_DEV_ORIGINS: List[str] = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

_env_raw = os.environ.get("CORS_ORIGINS", "") + "," + os.environ.get("FRONTEND_URL", "")
ALLOWED_ORIGINS: List[str] = [o.strip() for o in _env_raw.split(",") if o.strip()] or _DEV_ORIGINS

_replit_dev = os.environ.get("REPLIT_DEV_DOMAIN", "")
if _replit_dev:
    ALLOWED_ORIGINS.append(f"https://{_replit_dev}")

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------
LASTFM_API_KEY: str = os.environ.get("LASTFM_API_KEY", "")
MAX_BODY_SIZE: int = 2 * 1024 * 1024          # 2 MB
BACKEND_PORT: int = int(os.environ.get("BACKEND_PORT", 3001))
APP_VERSION: str = "2.1.0"
