# AetherPulse|Music

A modern, responsive music player powered by YouTube Music, featuring local playlists, favorites, and real-time synchronized lyrics. Optimized for both desktop and mobile experiences.

## 🚀 Key Features

- **Advanced Search**: Find tracks, playlists, albums, and artists directly from YouTube Music.
- **Dynamic Player**: Full-featured playback with queue management, seeking, volume control, shuffle, and repeat modes.
- **Synchronized Lyrics**: Real-time lyric synchronization via LRCLIB and YouTube Music, featuring karaoke-style highlighting and auto-scroll.
- **Interactive Lyrics**: Click any lyric line to jump to that specific moment in the song.
- **Local Playlists**: Create and manage personal playlists locally.
- **YT Import**: Import any YouTube Music playlist into your editable local storage.
- **Library Management**: Keep track of your favorites and recently played songs (stored in browser local storage).
- **Customizable Themes**: Toggle between light/dark modes and pick your own primary accent color.
- **Keyboard Shortcuts**:
  - `/` Focus search
  - `Space` or `K` Toggle play/pause
  - `Arrows` Seek or change tracks
  - `L` Toggle lyrics modal
  - `Q` Toggle queue modal
- **Responsive Design**: Modern UI with a mobile-friendly bottom navigation and glassmorphism effects.

## 🛠 Tech Stack

- **Frontend**: React, React Router, Tailwind CSS, Context API.
- **Backend**: Node.js, Express, Google OAuth integration.
- **Music Data**: Integrated YouTube Music via `ytmusic.js` (Innertube).
- **Lyrics Engine**: Integration with LRCLIB.net and YouTube Music for synced and static lyrics.
- **Storage**: Local JSON for persistent playlists and `localStorage` for user preferences.

## 🏁 Getting Started

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development (client + server)
npm run dev
```

- **Frontend**: `http://localhost:5000`
- **Backend API**: `http://localhost:3001`

## ⚙️ Environment Variables

| Variable | Description | Required |
|---|---|---|
| `BACKEND_PORT` | Backend development port (default 3001) | No |
| `SESSION_SECRET` | Express session secret | Yes (Prod) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | No |
| `GOOGLE_CALLBACK_URL` | OAuth Callback URL | No |

## 📂 Project Structure

```text
server/                 Express backend & YouTube Music integration logic
src/components/         Reusable UI components (Player, Sidebar, Modals)
src/screens/            Main application views
src/hooks/              Custom data fetching and auth hooks
src/contexts/           Theme and state management
src/lib/                API client and utility functions
public/                 Static assets and PWA manifest
```

## 🤝 Contributing

Contributions are welcome! Please check our `CONTRIBUTING.md` for guidelines. Before submitting a PR, ensure that the application starts correctly using `npm run dev`.

## 📜 License

This project is licensed under the MIT License.
