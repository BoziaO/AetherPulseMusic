"""
AetherPulse Music — FastAPI application entrypoint.
Run with: uvicorn app.main:app --host 0.0.0.0 --port 3001
"""
from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse

from api import ytmusic
from core import cache
from core.config import ALLOWED_ORIGINS, APP_VERSION, BACKEND_PORT, COVER_DIR, MAX_BODY_SIZE
from db.database import initialize_database
from services import stream as stream_svc
from api import downloads, pages, playlists, user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("aetherpulse")


# ---------------------------------------------------------------------------
# Lifespan: startup / shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    log.info("Database ready")
    asyncio.create_task(_warm_cache())
    yield
    log.info("Shutting down")


async def _warm_cache() -> None:
    """Pre-populate home & explore pages so the first visitor doesn't wait."""
    await asyncio.sleep(2)
    for page_key in ("home", "explore"):
        ck = f"page:{page_key}"
        if cache.get(ck) is None:
            try:
                log.info("[warm] pre-loading %s", page_key)
                await pages._build_page(page_key)
            except Exception as exc:
                log.warning("[warm] failed %s: %s", page_key, exc)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AetherPulse Music Backend",
    version=APP_VERSION,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > MAX_BODY_SIZE:
            return StarletteResponse("Payload too large", status_code=413)
        return await call_next(request)


class RequestTimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        t0 = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
        if elapsed_ms > 3000:
            log.warning("SLOW %s %s — %.0fms", request.method, request.url.path, elapsed_ms)
        return response


app.add_middleware(RequestTimingMiddleware)
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=512)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "If-None-Match"],
    expose_headers=["ETag"],
    allow_origin_regex=r"https://.*\.(replit\.dev|replit\.app|repl\.co)$",
)

app.mount("/api/covers", StaticFiles(directory=COVER_DIR), name="covers")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
for router in (ytmusic.router, downloads.router, user.router, playlists.router, pages.router):
    app.include_router(router)


# ---------------------------------------------------------------------------
# Utility endpoints
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "version": APP_VERSION,
        "cache": {
            "entries": cache.size(),
            "hits": cache.stats["hits"],
            "misses": cache.stats["misses"],
            "hit_rate": cache.hit_rate(),
        },
        "stream_cache_entries": stream_svc.cache_size(),
        "timestamp": time.time(),
    }


@app.delete("/api/admin/cache")
async def clear_cache(prefix: str | None = None):
    count = cache.delete_prefix(prefix) if prefix else cache.clear()
    return {"status": "ok", "cleared": count}


# Stub auth endpoints (no auth required for local player)
@app.get("/api/auth/session")
async def auth_session():
    return {"auth": {"enabled": False, "connected": False}}


@app.post("/api/auth/logout")
async def auth_logout():
    return {"status": "ok"}


@app.get("/api/auth/youtube/playlists")
async def yt_playlists():
    return []


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=BACKEND_PORT, log_level="info")
