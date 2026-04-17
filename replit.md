# BoziaMusic

A modern music player application integrated with YouTube Music. Features a dark-themed, responsive UI for searching music, importing playlists, and streaming from YouTube Music. Supports optional Google Authentication for personalized playlist management.

## Architecture

- **Frontend**: React 19 (Create React App) with Tailwind CSS and React Router v7
- **Backend**: Node.js + Express serving the API on port 3001 (dev) / 5000 (production)
- **YouTube Music**: Custom InnerTube API integration via `server/ytmusic.js`
- **Auth**: Optional Google OAuth via `googleapis`

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
- `src/App.js` — React root component
- `src/screens/MusicPage.js` — Main music page view
- `src/hooks/` — Custom React hooks (`useAuthSession`, `usePageData`)
- `localPlaylists.json` — Local playlists storage (auto-created)
- `headers.json` — Optional: YouTube Music authenticated headers for library access

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
