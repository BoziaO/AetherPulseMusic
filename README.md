# AetherPulse|Music

A modern, responsive music player powered by YouTube Music. Features local playlists, favorites, real-time synchronized lyrics, and a fully customizable glassmorphism UI. Optimized for both desktop and mobile experiences.

## Overview

AetherPulse|Music is a fullstack React + Node.js application that streams music via YouTube Music's Innertube API. It offers a complete music discovery and playback experience with local playlist management, synced lyrics, keyboard-driven controls, and a theme system supporting light, dark, and custom color presets.

## Key Features

- **Advanced Search**: Find tracks, playlists, albums, and artists directly from YouTube Music with filter tabs and search history.
- **Dynamic Player**: Full-featured playback with queue management, seeking, volume control, shuffle, and repeat modes (none / one / all).
- **Synchronized Lyrics**: Real-time lyric sync via LRCLIB and YouTube Music, featuring karaoke-style highlighting, auto-scroll, and click-to-seek.
- **Local Playlists**: Create, edit, and manage personal playlists stored locally in JSON.
- **YT Import**: Import any YouTube Music playlist into your local library for offline-style editing.
- **Favorites & History**: Track favorites and recently played songs via browser `localStorage`.
- **Customizable Themes**: 7+ visual presets (Classic Dark, Light, Cyberpunk, Tokyo Night, AMOLED, etc.) plus custom accent colors and background overrides.
- **Keyboard Shortcuts**:
  - `/` — Focus search
  - `Space` or `K` — Toggle play/pause
  - `ArrowLeft` / `ArrowRight` — Seek ±10s (Shift + Arrow to change track)
  - `ArrowUp` / `ArrowDown` — Volume ±5%
  - `M` — Mute/unmute
  - `L` — Toggle lyrics modal
  - `Q` — Toggle queue modal
- **Responsive Design**: Mobile-first layout with collapsible sidebar, bottom player, and glassmorphism effects.
- **Google OAuth**: Optional authentication for accessing your personal YouTube Music library.

---

## Architecture

### System Overview

```
┌─────────────────┐      HTTP / REST      ┌──────────────────┐      HTTPS      ┌─────────────────┐
│   React Client  │ ◄──────────────────► │  Express Server  │ ◄─────────────► │ YouTube Music   │
│   (Port 5000)   │                      │   (Port 3001)    │                 │  (Innertube)    │
└─────────────────┘                      └──────────────────┘                 └─────────────────┘
        │                                        │
        │ localStorage                           │ local JSON
        ▼                                        ▼
┌─────────────────┐                      ┌──────────────────┐
│  User Prefs,    │                      │  localPlaylists  │
│  Favorites,     │                      │     .json        │
│  Recent Plays   │                      └──────────────────┘
└─────────────────┘
```

### Frontend Architecture

The frontend is a **Single Page Application (SPA)** built with React 19 and React Router 7.

```
App.js
├── LanguageProvider (Context)
├── ThemeProvider    (Context)
└── BrowserRouter
    └── AppShell
        ├── Sidebar          (Navigation)
        ├── Header           (Search, Notifications, Auth)
        ├── Outlet           (Route-specific screen)
        │   ├── MusicPage        (Home, Discover, Playlists, Artists, Albums)
        │   ├── ArtistDetailPage
        │   ├── AlbumDetailPage
        │   ├── InsightsPage
        │   └── SettingsPage
        ├── Player           (Fixed bottom playback bar)
        ├── QueueModal
        └── LyricsModal
```

**State Management**
- **Global UI State**: `ThemeContext` (theme, colors, glass effects) and `LanguageContext` (i18n: EN / PL).
- **Global App State**: `AppShell` centralizes player state (now playing, queue, favorites, recent plays) via React `useState` / `useRef` and exposes it to child routes through `Outlet` context.
- **Server State**: `useAuthSession` and `usePageData` custom hooks handle async data fetching with loading/error states.
- **Persistence**: `localStorage` stores theme preferences, player volume, favorites, recent plays, and search history.

**Media Playback**
- Audio playback uses the **YouTube IFrame API** with a hidden player div.
- The player communicates state changes (PLAYING, PAUSED, ENDED) back to React via callbacks.
- The **Media Session API** integrates with OS-level media controls (play/pause, prev/next, seek).

### Backend Architecture

The backend is a modular **Express 5** application using factory-pattern routers.

```
server/index.js
├── CORS & Session Middleware
├── Content-Security-Policy Headers
├── Router Mounting
│   ├── /api/auth          → createAuthRouter       (Google OAuth, sessions)
│   ├── /api/ytmusic       → createYtmusicRouter    (Search, artists, albums, playlists)
│   ├── /api/local/        → createLocalPlaylistsRouter (JSON-based local playlists)
│   ├── /api/lyrics        → createLyricsRouter     (LRCLIB + YTM lyrics aggregation)
│   └── /api/page          → createPagesRouter      (Screen data aggregation)
└── Static File Serving (production)
```

**Design Patterns**
- **Factory Routers**: Each route module exports a factory function that receives dependencies (e.g., `yt` client, `oauth2Client`) and returns a fresh `express.Router()` instance. This avoids shared mutable state between router instances.
- **Async Wrapper**: `utils/helpers.js` provides a `wrap(fn)` utility that catches async errors and returns standardized `500` JSON responses, eliminating repetitive `try/catch` blocks.
- **Shared Utilities**: `helpers.js` centralizes common logic like thumbnail resolution (`pickThumbnailUrl`), media normalization (`toMediaItem`), queue enrichment (`toQueueItem`), and local playlist persistence (`loadLocalPlaylists`, `saveLocalPlaylists`).

**YouTube Music Integration**
- `server/ytmusic.js` implements a custom **Innertube API client** using Node.js `https`.
- It sends authenticated `POST` requests to `music.youtube.com/youtubei/v1/` with a `WEB_REMIX` client context.
- Responses are parsed via deep-safe navigation utilities (`nav`, `getText`, `getThumbnails`) to handle YouTube's deeply nested JSON structure.

### Data Flow

1. **Search**: User types in `AppShell` → debounced API call to `/api/ytmusic/search` → backend calls Innertube → parsed results returned → React renders search dropdown.
2. **Playback**: User clicks a track → `AppShell.play()` loads `videoId` into hidden YT player → YT IFrame API events update React state (time, duration, play/pause) → UI re-renders progress bar and controls.
3. **Lyrics**: `LyricsModal` mounts → fetches `/api/lyrics?q=...` → backend tries LRCLIB first, falls back to YTM → lyrics are parsed into timed lines → `currentTime` state drives active line highlighting and auto-scroll.
4. **Page Data**: Route mounts (e.g., `/playlists`) → `usePageData` calls `/api/page/playlists` → backend aggregates YTM library + local playlists into a single screen payload → `MusicPage` renders sections.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19.2, React Router DOM 7.14, Tailwind CSS 3.4 |
| **State** | React Context API, `useState`, `useRef`, `useCallback` |
| **Backend** | Node.js, Express 5.2, Express Session 1.19 |
| **Auth** | Google OAuth 2.0 (`googleapis` 165.0.0) |
| **Music API** | YouTube Music Innertube (`server/ytmusic.js`) |
| **Lyrics API** | LRCLIB.net + YouTube Music |
| **Storage** | Browser `localStorage`, local JSON file |
| **Tooling** | `react-scripts` 5.0, `concurrently` 9.2, `cross-env` |

---

## Project Structure

```text
AetherPulseMusic-main/
├── public/                     # Static assets, PWA manifest
├── server/
│   ├── index.js                # Express app entry point
│   ├── ytmusic.js              # YouTube Music Innertube client & parsers
│   ├── routes/
│   │   ├── auth.js             # Google OAuth & session routes
│   │   ├── ytmusic.js          # YTM data routes (search, artists, albums...)
│   │   ├── localPlaylists.js   # Local JSON playlist CRUD
│   │   ├── lyrics.js           # Lyrics aggregation (LRCLIB + YTM)
│   │   └── pages.js            # Screen data aggregation
│   └── utils/
│       └── helpers.js          # Async wrapper, media mappers, playlist I/O
├── src/
│   ├── App.js                  # Root component with providers & routing
│   ├── index.css               # Global styles & CSS variables
│   ├── components/
│   │   ├── AppShell.js         # Main layout, player state, search
│   │   ├── Player.js           # Bottom playback controls
│   │   ├── Sidebar.js          # Navigation sidebar
│   │   ├── QueueModal.js       # Queue management modal
│   │   ├── LyricsModal.js      # Synced lyrics display
│   │   ├── Toast.js            # Notification system
│   │   ├── ThemeSettings.js    # Theme customization modal
│   │   ├── music/              # Music-specific UI (MediaCard, QueueTable...)
│   │   └── ...
│   ├── screens/
│   │   ├── MusicPage.js        # Generic page renderer (home, playlists, etc.)
│   │   ├── ArtistDetailPage.js
│   │   ├── AlbumDetailPage.js
│   │   ├── InsightsPage.js
│   │   └── SettingsPage.js
│   ├── contexts/
│   │   ├── ThemeContext.js     # Theme, colors, glass effects
│   │   └── LanguageContext.js  # i18n (EN / PL)
│   ├── hooks/
│   │   ├── useAuthSession.js   # Auth state & session refresh
│   │   └── usePageData.js      # Screen data fetching
│   ├── lib/
│   │   ├── api.js              # HTTP client helpers
│   │   └── energy.js           # Track energy estimation
│   └── data/
│       └── musicData.js        # Static navigation config
├── .env.example
├── package.json
└── tailwind.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd AetherPulseMusic-main

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and fill in your Google OAuth credentials (optional)
```

### Development

```bash
# Start both frontend and backend
npm run dev
```

- **Frontend**: `http://localhost:5000`
- **Backend API**: `http://localhost:3001`

You can also run them separately:

```bash
npm run client        # React dev server only
npm run server:dev    # Express backend with auto-reload (Node --watch)
```

### Production Build

```bash
npm run build         # Create optimized React build
npm run server        # Start production Express server
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `BACKEND_PORT` | Backend development port (default: `3001`) | No |
| `BACKEND_URL` | Backend URL for proxying (default: `http://localhost:3001`) | No |
| `FRONTEND_URL` | Frontend URL for OAuth redirects (default: `http://localhost:5000`) | No |
| `SESSION_SECRET` | Express session secret | Yes (production) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | No |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL (default: `http://localhost:3001/api/auth/google/callback`) | No |
| `REACT_APP_API_BASE_URL` | Frontend API base URL | No |

> **Note**: Google OAuth is optional. Without it, the app works in anonymous mode with local playlists and favorites.

---

## API Overview

| Endpoint | Description |
|---|---|
| `GET /api/auth/session` | Get current auth status |
| `GET /api/auth/google` | Initiate Google OAuth flow |
| `POST /api/auth/logout` | Destroy session |
| `GET /api/ytmusic/search?q=...&filter=...` | Search YTM |
| `GET /api/ytmusic/artist/:id` | Artist details |
| `GET /api/ytmusic/album/:id` | Album details |
| `GET /api/ytmusic/playlist/:id` | Playlist tracks |
| `GET /api/lyrics?q=...&videoId=...` | Fetch lyrics (LRCLIB + YTM) |
| `GET /api/local/playlists` | List local playlists |
| `POST /api/local/playlists` | Create local playlist |
| `GET /api/page/:key` | Get aggregated screen data |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run client` | Start React dev server (`localhost:5000`) |
| `npm run server` | Start production backend |
| `npm run server:dev` | Start backend with Node `--watch` |
| `npm run build` | Build optimized production bundle |
| `npm test` | Run React test suite |

---

## Contributing

Contributions are welcome! Please check [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

Before submitting a PR, ensure the application starts correctly:

```bash
npm run dev
```

---

## License

This project is licensed under the MIT License.
