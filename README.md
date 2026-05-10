# 🎵 AetherPulse Music

> **A next-generation YouTube Music player with stunning visuals and immersive themes**

[![Vue 3](https://img.shields.io/badge/Vue%203-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Vite 8](https://img.shields.io/badge/Vite%208-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express 5](https://img.shields.io/badge/Express%205-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![YouTube Music API](https://img.shields.io/badge/YouTube%20Music-FF0000?style=for-the-badge&logo=youtube-music&logoColor=white)](https://music.youtube.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## ✨ Features

### 🎨 **Immersive Themes**
Choose from **12+ handcrafted themes** that transform your entire experience:
- **Apple Dark/Light** — Clean, minimal, familiar
- **Cyberpunk Edgerunners** — Neon glitch aesthetics with scanlines
- **Gothic** — Crimson Victorian vibes with candle flicker
- **Metal** — Industrial chrome with sharp edges
- **Kai Angel** — Dreamy pastels with floating haze
- **Phonk** — Aggressive drift culture with bass pulse
- **Y2K** — Futuristic chrome with rotating gradients
- **Synthwave** — Retrowave sunset grids
- **Vampire** — Bloodmoon baroque elegance
- **Matrix** — Classic terminal green
- **Emo Revival** — Raw emotional aesthetics
- **Industrial** — Mechanical hazard yellow

### 🎭 **Dynamic Animations**
- **Now-playing ambience** — Background pulses with your music
- **Vinyl spin** — Album art rotates during playback
- **Equalizer bars** — Animated indicators on active tracks
- **Cover art breathing** — Subtle scale animation while playing
- **Progress bar glow** — Pulsing thumb during playback
- **Theme effects** — Scanlines, glitch, flicker, chrome glow, and more

### 🎵 **Full Playback Experience**
- **YouTube Music integration** — Search, play, discover
- **Smart Flow Composer** — AI-generated stations from your taste
- **Queue management** — Shuffle, repeat, save playlists
- **Timestamp notes** — Add contextual notes at any point
- **Synced lyrics** — Follow along with LRCLIB integration
- **Audio visualizer** — Real-time frequency visualization

### 📊 **Insights & Statistics**
- **My Wrapped** — Listening time, top artists, favorite hours
- **Genre analysis** — Discover your weekly taste patterns
- **Energy tracking** — Average energy of your listening sessions
- **Evolution chart** — See how your taste changes over time

### 🔒 **Privacy-First**
- **Local storage** — Your data stays on your device
- **No telemetry** — Zero tracking, zero analytics
- **Optional sync** — Google OAuth only if you want library access
- **Open source** — Fully transparent codebase

### 🌍 **Bilingual**
- **Polish** 🇵🇱 (default)
- **English** 🇬🇧

### ⌨️ **Keyboard Shortcuts**
| Key | Action |
|---|---|
| `Space` / `K` | Play / Pause |
| `←` / `→` | Seek -10s / +10s |
| `Shift + ←` / `Shift + →` | Previous / Next track |
| `Q` | Open queue |
| `L` | Open lyrics |
| `/` | Focus search |
| `Esc` | Close modals |

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

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd AetherPulseMusic2

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start development servers
npm run dev
```

**You're ready to go!** 🎉

| Service | URL |
|---|---|
| 🎨 Frontend (Vite) | `http://localhost:5000` |
| 🔧 Backend (Express) | `http://localhost:3001` |

> The Vite dev server automatically proxies `/api/**` to Express, so no extra configuration needed for local development.

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

## 🏗️ Production Deployment

```bash
# Build the frontend
npm run build

# Set production environment variables
export NODE_ENV=production
export SESSION_SECRET=<your-long-random-string>

# Start the server
npm run server
```

**Production mode:**
- Express serves static files from `dist/`
- Single port deployment (default `5000`)
- API routes at `/api/**`
- SPA fallback to `dist/index.html`

> ⚠️ `SESSION_SECRET` is **required** in production — the server will refuse to start without it.

---

## ⚙️ Configuration

All environment variables are documented in [`.env.example`](./.env.example).

### Key Variables

| Variable | Environment | Default | Description |
|---|---|---|---|
| `BACKEND_PORT` | Development | `3001` | API server port |
| `PORT` | Production | `5000` | Unified server port |
| `FRONTEND_URL` | Both | `http://localhost:5000` | CORS & OAuth redirect |
| `SESSION_SECRET` | Production | *Required* | Session encryption key |
| `VITE_API_BASE_URL` | Both | *Empty* | Custom API origin |
| `GOOGLE_CLIENT_ID` | Optional | *Empty* | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | *Empty* | Google OAuth secret |
| `GOOGLE_CALLBACK_URL` | With OAuth | *Empty* | OAuth redirect URI |
| `AETHERPULSE_DATA_DIR` | Optional | OS temp | Data storage location |

### YouTube Music Authentication (Optional)

For access to private library features (liked songs, personal playlists):

1. Create `headers.json` in the project root (already gitignored)
2. Add your YouTube Music cookies/headers
3. Public endpoints work without this file

---

## 🗺️ API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/session` | Get current auth status |
| `GET` | `/api/auth/google` | Initiate Google OAuth flow |
| `POST` | `/api/auth/logout` | Clear user session |

### YouTube Music
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/ytmusic/search?q=&filter=&limit=` | Search YouTube Music |
| `GET` | `/api/ytmusic/artist/:channelId` | Get artist details |
| `GET` | `/api/ytmusic/album/:browseId` | Get album with tracks |
| `GET` | `/api/ytmusic/playlist/:playlistId` | Get playlist with tracks |
| `GET` | `/api/ytmusic/charts` | Get top charts |

### Pages & Flows
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/page/:key` | Get aggregated page data |
| `POST` | `/api/flows/revolution` | Generate Smart Flow station |

### User Data
| Method | Endpoint | Description |
|---|---|---|
| `GET`/`PATCH` | `/api/user/state` | Get/update user state |
| `POST` | `/api/user/recent` | Add track to recent plays |
| `POST` | `/api/user/favorites/toggle` | Toggle favorite track |
| `POST` | `/api/user/queues` | Save named queue |

### Local Playlists & Lyrics
| Method | Endpoint | Description |
|---|---|---|
| `GET`/`POST`/`DELETE` | `/api/local/playlists/*` | Manage local playlists |
| `GET` | `/api/lyrics?videoId=&title=&artist=` | Get synced lyrics |

---

## 📁 Project Structure

```
AetherPulseMusic2/
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── manifest.json
│   └── sw.js                  # Service worker
├── src/                        # Frontend source
│   ├── App.vue                # Root component
│   ├── main.js                # Application entry
│   ├── index.css              # Design tokens & base styles
│   ├── components/            # Reusable Vue components
│   │   ├── AppLayout.vue      # Main layout with player
│   │   ├── FullPlayer.vue     # Expanded player view
│   │   ├── PlayerBar.vue      # Bottom player bar
│   │   ├── Sidebar.vue        # Navigation sidebar
│   │   └── ...                # More components
│   ├── views/                 # Page components
│   │   ├── MusicPage.vue      # Dynamic page renderer
│   │   ├── InsightsPage.vue   # Statistics dashboard
│   │   ├── SettingsPage.vue   # User settings
│   │   └── ...                # More views
│   ├── data/                  # Static data
│   │   ├── i18n.js            # Translations (PL/EN)
│   │   └── themes.js          # Theme definitions
│   ├── lib/                   # Utilities
│   │   ├── api.js             # API client
│   │   ├── format.js          # Data formatters
│   │   └── useTheme.js        # Theme engine
│   └── router/                # Vue Router config
├── server/                     # Backend source
│   ├── index.js               # Express bootstrap
│   ├── ytmusic.js             # YouTube Music client
│   ├── routes/                # API route handlers
│   └── utils/                 # Helpers & database
├── .env.example               # Environment template
├── package.json               # Dependencies & scripts
├── vite.config.js             # Vite configuration
└── README.md                  # This file
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|---|---|
| Empty home page, "Blad polaczenia z API" toast | Backend not running. Run `npm run dev` or `npm run server` |
| `SESSION_SECRET must be set in production` | Set the environment variable before starting in production mode |
| Album page is empty | Some albums are region-locked or video-only on YouTube |
| Google login doesn't work | Check `GOOGLE_CLIENT_ID`, secret, and callback URL match Google Cloud Console |
| Lyrics show "No results" | LRCLIB may not have entries for all tracks; try different versions |
| Visualizer not working | Ensure music is playing; visualizer captures audio from the player |

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow the existing code style
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation if needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💡 Notes

- **Playback**: Uses YouTube IFrame Player at `#yt-hidden-player`. Tracks without `videoId` are listed but not playable
- **Storage**: Local data (playlists, recents, favorites) uses `localStorage` with backend mirror (best-effort)
- **i18n**: All UI strings in `src/data/i18n.js` - Polish (default) and English
- **Performance**: Optimized with code splitting, lazy loading, and efficient reactivity

---

<div align="center">

**Made with ❤️ for music lovers**

⭐ If you like this project, please consider giving it a star!

</div>
