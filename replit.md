# AetherPulse|Music

A modern music player application integrated with YouTube Music. Features a fully themeable UI, mobile-first responsive layout, playlist management, YouTube Music streaming, favorites, recent playback history, and optional Google Authentication for personalized playlist management.

## Architecture

- **Frontend**: React 19 (Create React App) with Tailwind CSS and React Router v7
- **Backend**: Node.js + Express serving the API on port 3001 (dev) / 5000 (production)
- **YouTube Music**: Custom InnerTube API integration via `server/ytmusic.js`
- **Auth**: Optional Google OAuth via `googleapis`
- **Theme system**: CSS custom properties + ThemeContext (dark/light/custom themes)
- **Personal library**: Favorites and recent playback history persist in browser localStorage.
- **Mobile UX**: Desktop sidebar, mobile slide-out sidebar, bottom tab navigation, and responsive bottom player.
- **Security**: API requests use same-origin relative URLs in the client; backend CORS is limited to local development, Replit preview, and deployed Replit app origins.

## Development

Run both frontend and backend with:
```
npm run dev
```

- Frontend: `http://localhost:5000` (CRA dev server with hot reload)
- Backend: `http://localhost:3001` (Express API)

CRA proxies all `/api` requests to the backend (configured via `"proxy"` in package.json).

## Production

Build the React app and serve everything from the Express server on port 5000:
```
npm run build
NODE_ENV=production node server/index.js
```

## Key Files

- `server/index.js` — Express API, session management, Google OAuth, YouTube Music routes
- `server/ytmusic.js` — InnerTube API client for YouTube Music
- `src/lib/api.js` — Frontend API client (uses relative URLs via CRA proxy)
- `src/App.js` — React root (wraps with ThemeProvider)
- `src/contexts/ThemeContext.js` — Theme state management (dark/light/custom), CSS variable injection, localStorage persistence
- `src/screens/MusicPage.js` — Main music page (playlists, home, artists, albums, favorites, recent history, import YT playlists)
- `src/components/AddTrackModal.js` — Search modal for adding songs to playlists
- `src/components/CreatePlaylistModal.js` — Modal for creating local/YT playlists
- `src/components/ThemeSettings.js` — Theme picker modal (preset colors, custom primary/background)
- `src/components/AppShell.js` — Global layout, playback state, YouTube IFrame player, search
- `src/components/Sidebar.js` — Navigation sidebar with theme quick-toggles (dark/light/custom)
- `src/components/Player.js` — Bottom player bar (theme-aware)
- `src/index.css` — CSS custom properties for all themes + light/custom theme override rules
- `src/hooks/` — Custom React hooks (`useAuthSession`, `usePageData`)
- `localPlaylists.json` — Local playlists storage (auto-created)
- `headers.json` — Optional: YouTube Music authenticated headers for library access

## Theme System

The app supports three themes:
- **Dark** (default): Deep black background, white text, red accents
- **Light**: Light gray background, dark text, same red accents
- **Custom**: User-defined primary color and background color

Theme toggles are at the bottom of the sidebar. The full settings modal (accessible via the palette icon or "Ustawienia motywu") allows:
- Choosing preset primary colors (8 presets + color picker)
- Choosing preset backgrounds (8 presets + color picker)
- Selecting dark or light base for custom theme

Theme state persists in `localStorage` under key `bm-theme-state`. CSS variables are injected on `document.documentElement`.

## YouTube Playlist Import

Non-editable YouTube playlists can be copied to local storage via the "Importuj i edytuj" button on any YouTube Music playlist detail page. The copy is saved to `localPlaylists.json` and becomes fully editable (add/remove tracks, delete playlist).

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `BACKEND_PORT` | Dev backend port | 3001 |
| `SESSION_SECRET` | Express session secret | (required in production) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | optional |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | http://localhost:3001/api/auth/google/callback |

## Workflow

- **Start application**: `npm run dev` — runs both servers via concurrently, serves frontend on port 5000

## Migration Notes

- Dependencies are installed for the Replit Node.js 20 environment.
- The Replit workflow launches `npm run dev` and waits for the frontend on port 5000.
- The backend remains separated on port 3001 in development while the frontend proxies `/api` requests.
