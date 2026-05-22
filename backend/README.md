# AetherPulse Music — Backend

FastAPI backend for a YouTube Music-based web player.

## Structure

```
app/
├── main.py              # FastAPI app, middleware, lifespan
├── core/
│   ├── config.py        # All env-driven settings
│   └── cache.py         # In-memory TTL cache (shared singleton)
├── db/
│   └── database.py      # SQLite schema + all sync/async DB helpers
├── services/
│   ├── stream.py        # yt-dlp stream URL resolution + TTL cache
│   ├── ytmusic.py       # Async wrappers around ytmusicapi
│   └── enrichment.py    # Last.fm metadata + LRCLIB lyrics
├── api/
│   ├── ytmusic.py       # /api/ytmusic/*  (search, song, album, artist…)
│   ├── downloads.py     # /api/downloads/* (proxy, save, list, delete)
│   ├── user.py          # /api/user/*     (state, recent, favorites, queues)
│   ├── playlists.py     # /api/local/playlists/* + /api/import/playlist
│   └── pages.py         # /api/page/*  /api/recommendations/*  /api/flows/*
└── utils/
    └── normalization.py # ID validation, thumbnail resolution, track shape
```

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 3001
# or
python -m app.main
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `BACKEND_PORT` | `3001` | Port to listen on |
| `CORS_ORIGINS` | `""` | Comma-separated allowed origins |
| `FRONTEND_URL` | `""` | Single extra allowed origin |
| `REPLIT_DEV_DOMAIN` | `""` | Auto-appended Replit domain |
| `LASTFM_API_KEY` | `""` | Enables Last.fm enrichment |

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health + cache stats |
| GET | `/api/ytmusic/search?q=` | Search |
| GET | `/api/ytmusic/song/:id` | Song metadata |
| GET | `/api/ytmusic/album/:id` | Album |
| GET | `/api/ytmusic/artist/:id` | Artist |
| GET | `/api/ytmusic/playlist/:id` | Playlist |
| GET | `/api/ytmusic/charts` | Charts |
| GET | `/api/ytmusic/related/:id` | Watch playlist / related |
| GET | `/api/ytmusic/lyrics?videoId=` | Lyrics (YT + LRCLIB fallback) |
| GET | `/api/page/:key` | Curated page (home, explore, chill, energy…) |
| GET | `/api/downloads/playback/:id` | Streaming proxy (Range support) |
| GET | `/api/downloads/info/:id` | Stream URL + metadata |
| GET | `/api/downloads` | List saved downloads |
| DELETE | `/api/downloads/:id` | Delete saved download |
| POST | `/api/downloads/save/:id` | Download to server disk |
| GET | `/api/user/state` | Get user state |
| PATCH | `/api/user/state` | Replace user state |
| POST | `/api/user/recent` | Add to recent plays |
| POST | `/api/user/favorites/toggle` | Toggle favorite |
| POST | `/api/user/queues` | Save queue |
| DELETE | `/api/user/queues/:id` | Delete queue |
| GET | `/api/local/playlists` | List local playlists |
| POST | `/api/local/playlists` | Create playlist |
| GET | `/api/local/playlists/:id` | Get playlist |
| PATCH | `/api/local/playlists/:id` | Update playlist |
| DELETE | `/api/local/playlists/:id` | Delete playlist |
| POST | `/api/local/playlists/:id/tracks` | Add track |
| DELETE | `/api/local/playlists/:id/tracks/:vid` | Remove track |
| POST | `/api/local/playlists/:id/reorder` | Reorder tracks |
| POST | `/api/import/playlist` | Import YT Music playlist by URL |
| GET | `/api/recommendations/pool` | Related track pool |
| GET | `/api/recommendations/smart-radio/:id` | Smart radio |
| POST | `/api/flows/revolution` | Generate session flow |
| DELETE | `/api/admin/cache` | Clear cache |
