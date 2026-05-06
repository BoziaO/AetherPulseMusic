# AetherPulse Music

AetherPulse Music is a Vue 3 + Express music web app powered by YouTube Music endpoints. It includes search, playback through the YouTube IFrame API, local playlists, favorites, recent plays, synced lyrics, queue controls, settings, and listening insights.

## Stack

- Vue 3, Vue Router, Vite
- Tailwind CSS
- Lucide Vue icons
- Express 5 backend
- Google OAuth support for YouTube Music library access
- Local JSON storage for local playlists and persisted user state

## Requirements

- Node.js 20+ recommended
- npm 10+

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Open:

- Frontend: `http://localhost:5000`
- Backend API: `http://localhost:3001`

Google OAuth is optional. Fill these values in `.env` if you want account/library sync:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
SESSION_SECRET=change-me
```

## Scripts

```bash
npm run dev       # backend + Vue dev server
npm run client    # Vue dev server only
npm run server    # Express server only
npm run build     # production Vue build to dist/
npm run preview   # preview built frontend
```

## Production

```bash
npm run build
set NODE_ENV=production
npm run server
```

In production the Express server serves `dist/index.html` for Vue Router fallback routes.

## Project Layout

```text
src/
  App.vue
  main.js
  router/
  components/
  views/
  data/
  lib/
server/
  index.js
  routes/
  utils/
public/
```

## Notes

- The frontend uses Vite proxying for `/api` during development.
- User state is saved locally first and mirrored to `/api/user/state` when the backend is available.
- Local playlists are stored by the backend in local JSON files.
- The player requires playable YouTube `videoId` values.
