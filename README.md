<div align="center">

```
 █████╗ ███████╗████████╗██╗  ██╗███████╗██████╗ 
██╔══██╗██╔════╝╚══██╔══╝██║  ██║██╔════╝██╔══██╗
███████║█████╗     ██║   ███████║█████╗  ██████╔╝
██╔══██║██╔══╝     ██║   ██╔══██║██╔══╝  ██╔══██╗
██║  ██║███████╗   ██║   ██║  ██║███████╗██║  ██║
╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
          P U L S E  |  M U S I C
```

**Nowoczesny odtwarzacz muzyczny zintegrowany z YouTube Music**

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-W%20budowie-orange?style=flat-square)]()

</div>

---

## Funkcje

- **Wyszukiwanie** — utwory, playlisty, albumy i wykonawcy z YouTube Music
- **Odtwarzacz** — kolejka, seek, głośność, shuffle, repeat
- **Lokalne playlisty** — tworzenie, edytowanie, importowanie z YouTube Music
- **Ulubione i historia** — przechowywane lokalnie w przeglądarce
- **Motywy** — ciemny, jasny i własny kolor akcentu
- **Skróty klawiszowe** — `/` wyszukuje, `Space`/`K` pauzuje, `←`/`→` przełączają
- **Google OAuth** — opcjonalne logowanie
- **PWA** — manifest i obsługa Media Session API
- **Responsywny** — mobilne menu dolne, wysuwany sidebar, pełny desktop layout

---

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Vue 3, Vue Router, Vite |
| Stylowanie | Tailwind CSS |
| Ikony | Lucide Vue Next |
| Backend | Node.js ≥ 20, Express 5, Python (FastAPI, Pillow) |
| Sesje | express-session |
| Auth | Google OAuth 2.0 (opcjonalne) |
| Dane muzyczne | YouTube Music via Innertube (`server/ytmusic.js`) |
| Storage | SQLite (via Prisma), `localStorage` |
| Wizualizacja | Three.js |
| Edycja obrazów | Cropper.js |
| Drag & Drop | VueDraggable |

---

## Szybki start

```bash
git clone https://github.com/BoziaO/AetherPulseMusic.git
cd AetherPulseMusic

# Zainstaluj zależności Node.js i Python
npm install

npm install
cp .env.example .env
# uzupełnij .env (patrz sekcja Zmienne środowiskowe)

npm run dev
```

| Serwis | URL |
|--------|-----|
| Frontend (Vite) | `http://localhost:5000` |
| Backend API | `http://localhost:3001` |

---

## Zmienne środowiskowe

Skopiuj `.env.example` → `.env` i uzupełnij wartości:

| Zmienna | Opis | Wymagana |
|---------|------|----------|
| `BACKEND_PORT` | Port backendu (domyślnie 3001) | Nie |
| `SESSION_SECRET` | Sekret sesji Express | **Tak (prod)** |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID | Nie |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret | Nie |
| `GOOGLE_CALLBACK_URL` | Callback URL po logowaniu | Nie |
| `REACT_APP_API_BASE_URL` | Niestandardowy adres API | Nie |

---

## Struktura projektu

```
AetherPulseMusic/
├── server/                 # Backend Express
│   ├── index.js            # Entry point, routes
│   └── ytmusic.js          # Warstwa YouTube Music (Innertube)
├── src/
│   ├── components/         # Komponenty UI (Player, Sidebar, modale…)
│   ├── screens/            # Widoki aplikacji (Home, Search, Playlist…)
│   ├── hooks/              # Composables — dane, sesja
│   ├── lib/                # Klient API
│   └── data/               # Nawigacja, fallback content
├── public/                 # Manifest PWA, favicon
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## Skrypty npm

| Komenda | Opis |
|---------|------|
| `npm run dev` | Frontend + backend równolegle |
| `npm run client` | Tylko Vite dev server |
| `npm run server:dev` | Tylko backend z hot-reload (`--watch`) |
| `npm run build` | Build produkcyjny Vite |
| `npm run preview` | Podgląd builda |

---

## Wkład

Pull requesty są mile widziane. Sprawdź [CONTRIBUTING.md](CONTRIBUTING.md) przed wysłaniem zmian. Przed PR upewnij się że `npm run dev` startuje bez błędów.

---

## Licencja

[MIT](LICENSE) © 2026 [Maciej (Bozia)](https://github.com/BoziaO)
