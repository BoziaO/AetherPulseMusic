# AetherPulse Music

AetherPulse web player for **YouTube Music**. Built with **Vue 3 + Vite** on the front end and a thin **Express 5** backend that talks to the YouTube Music Innertube API. Includes search, playback (YouTube IFrame API), local + library playlists, favorites, recents, synced lyrics, queue, insights, and PL/EN UI.

---

## Highlights

- **Apple Music UI** — pure-black canvas, glass sidebar/topbar, pink (`#FA243C`) accent (swappable), rounded cards, spinning vinyl in the full player.
- **YouTube Music search & playback** — songs, albums, artists, playlists, charts, moods, lyrics — all via the Innertube backend.
- **Local playlists** — create, import (paste any YouTube playlist ID), and play offline-stored playlists.
- **Smart Flow Composer** — generates a station from your recent listens, tunable by length and discovery level.
- **Insights** — total minutes, average energy, top artists, listening history.
- **Persisted state** — favorites, recents, search history, theme, accent, language, and volume saved in `localStorage` and mirrored to the backend.
- **Optional Google OAuth** — read your YouTube Music library (playlists, liked songs, albums, artists).
- **Keyboard shortcuts** — `Space`/`K` play, `←/→` seek, `Shift+←/→` prev/next, `Q` queue, `L` lyrics, `/` focus search, `Esc` close.

---

## Stack

| Layer | Tech |
|---|---|
| UI | Vue 3, Vue Router 4, Vite 8 |
| Styling | Tailwind CSS 3, custom CSS design tokens |
| Icons | `lucide-vue-next` |
| Player | YouTube IFrame API |
| Server | Express 5, `express-session`, `googleapis` |
| Storage | JSON files via `AETHERPULSE_DATA_DIR` (defaults to OS temp) |

---

## Requirements

- **Node.js** ≥ 20.19
- **npm** ≥ 10

---

## Quick start

```bash
git clone <repo>
cd AetherPulseMusic
npm install
copy .env.example .env       # PowerShell / cmd
# cp .env.example .env       # Bash
npm run dev
```

| URL | What |
|---|---|
| `http://localhost:5000` | Vue dev server (Vite) |
| `http://localhost:3001` | Express API |

The Vite dev server proxies `/api/**` to the Express server, so you do not need to set `VITE_API_BASE_URL` for local development.

---

## Scripts

```bash
npm run dev        # Backend (watch) + Vite dev server, parallel
npm run client     # Vite dev server only
npm run server     # Express server only (no watch)
npm run server:dev # Express server with --watch-path server
npm run build      # Production build → dist/
npm run preview    # Serve the built dist/ via Vite
```

---

## Production

```bash
npm run build
set NODE_ENV=production
set SESSION_SECRET=<long-random-string>
npm run server
```

In production the Express server hosts everything from a single port (`PORT`, default `5000`):

- Static assets from `dist/`.
- API routes under `/api/**`.
- HTML 5 history fallback to `dist/index.html` for client-side routing.

`SESSION_SECRET` is **required** in production — the server refuses to start without it.

---

## Configuration

All variables are documented in [`.env.example`](./.env.example). Key ones:

| Variable | Required | Notes |
|---|---|---|
| `BACKEND_PORT` | dev only | API port in dev (default `3001`). Production uses `PORT`. |
| `FRONTEND_URL` | always | Used for CORS and OAuth redirect resolution. |
| `SESSION_SECRET` | production | Long random string. Dev falls back to a placeholder. |
| `VITE_API_BASE_URL` | optional | Set when frontend and backend live on different origins. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Enable Google OAuth login for library sync. |
| `GOOGLE_CALLBACK_URL` | with OAuth | Must match the redirect URI in Google Cloud Console. |
| `AETHERPULSE_DATA_DIR` | optional | Where the server stores local playlists / user state JSON. |

### YouTube Music auth (optional)

For library/private endpoints (your liked songs, your playlists, etc.) you can drop a YouTube Music headers file at the project root:

```
./headers.json
```

`headers.json` is gitignored. If absent, public endpoints (search, charts, moods, public artist/album/playlist pages) still work.

---

## API surface (selected)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/auth/session` | Auth status. |
| `GET` | `/api/auth/google` | Begin Google OAuth. |
| `POST` | `/api/auth/logout` | Clear session. |
| `GET` | `/api/ytmusic/search?q=&filter=&limit=` | YouTube Music search. |
| `GET` | `/api/ytmusic/artist/:channelId` | Artist details. |
| `GET` | `/api/ytmusic/album/:browseId` | Album with tracks. |
| `GET` | `/api/ytmusic/playlist/:playlistId` | Playlist with tracks. |
| `GET` | `/api/ytmusic/charts` | Top charts. |
| `GET` | `/api/page/:key` | Aggregated page payloads (`home`, `discover`, `chill`, `energy`, `playlists`, `albums`, `artists`, `favorites`, `recent`). |
| `POST` | `/api/flows/revolution` | Generate a Smart Flow station. |
| `GET`/`POST`/`DELETE` | `/api/local/playlists/...` | CRUD for local playlists. |
| `GET`/`PATCH` | `/api/user/state` | Hydrate / persist user state. |
| `POST` | `/api/user/recent` | Append a track to recents. |
| `POST` | `/api/user/favorites/toggle` | Toggle a track in favorites. |
| `POST` | `/api/user/queues` | Save a named queue. |
| `GET` | `/api/lyrics?videoId=&title=&artist=` | Synced lyrics (LRCLIB + fallbacks). |

---

## Project layout

```text
AetherPulseMusic/
├── public/                 favicon, manifest, service worker
├── src/
│   ├── App.vue
│   ├── main.js
│   ├── index.css           Apple Music design tokens
│   ├── router/             Vue Router
│   ├── components/         Sidebar, PlayerBar, FullPlayer, modals, etc.
│   ├── views/              MusicPage, Settings, Insights, Album, Artist
│   ├── data/               i18n.js, navigation.js
│   └── lib/                api.js, format.js
├── server/
│   ├── index.js            Express bootstrap
│   ├── ytmusic.js          Innertube client
│   ├── routes/             auth, ytmusic, pages, flows, lyrics, user, localPlaylists
│   └── utils/helpers.js
├── .env.example
├── tailwind.config.cjs
├── postcss.config.cjs
├── vite.config.js
└── package.json
```

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Empty home page, "Blad polaczenia z API" toast | Backend not running. Start `npm run server` or `npm run dev`. |
| `SESSION_SECRET must be set in production` | Set the env var before running with `NODE_ENV=production`. |
| Album page is empty | Some albums are region-locked or video-only on YouTube — try another. |
| Google login does nothing | `GOOGLE_CLIENT_ID` / secret missing or callback URL mismatch with Cloud Console. |
| Lyrics say "No results" | LRCLIB has no entry for that title/artist. Try a different version. |

---

## Notes

- Playback uses the YouTube IFrame Player at `#yt-hidden-player`. Tracks without a `videoId` cannot be played — they are still listed for browsing.
- Local playlists, recents, and favorites live in `localStorage` first; the backend mirror is best-effort.
- All UI strings are in `src/data/i18n.js` and ship in Polish (default) and English.
