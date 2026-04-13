# 🎵 BoziaMusic

Moderny odtwarzacz muzyczny zintegrowany z YouTube Music, oferujący płynne doświadczenie użytkownika, importowanie playlist oraz nowoczesny interfejs w stylu Dark Mode.

## 🚀 Główne Funkcje

- **YouTube Music (Innertube)**: Wyszukiwanie, playlisty, albumy i trendy bezpośrednio z YouTube Music.
- **Google Auth**: Logowanie kontem Google i pobieranie własnych playlist z YouTube.
- **Dopracowane Playlisty**: Widok listy oraz szczegółów playlist (okładka + tracklista).
- **Nowoczesny Design**: Responsywny interfejs zbudowany w oparciu o Tailwind CSS z dedykowaną paletą barw (Dark Theme).
- **Dynamiczne Dane**: Dane stron (home/discover/chill/energy/artists/albums) z endpointów `ytmusic`.
- **Wydajność**: Frontend React 19 + Backend Express.

## 🛠️ Technologie

- **Frontend**: React, Tailwind CSS, React Router, Lucide Icons (Icons.js).
- **Backend**: Node.js, Express, Google OAuth.
- **API**: Zintegrowane endpointy inspirowane `BoziaYT4PI` (YouTube Music Innertube).

## 📦 Instalacja i Konfiguracja

1. **Sklonuj repozytorium**:
   ```bash
   git clone https://github.com/BoziaO/BoziaMusic.git
   cd BoziaMusic
   ```

2. **Zainstaluj zależności**:
   ```bash
   npm install
   ```

3. **Skonfiguruj zmienne środowiskowe**:
   Skopiuj plik `.env.example` jako `.env` i uzupełnij swoje dane:
   ```bash
   cp .env.example .env
   ```
   Opcjonalnie:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL`
   - Jeśli chcesz edytować bibliotekę (dodawanie/usuwanie tracków z playlist) utwórz `headers.json` w root projektu z nagłówkami zalogowanej sesji YouTube Music.

## 🏃 Uruchamianie

Projekt korzysta z `concurrently`, co pozwala na uruchomienie frontendu i backendu jedną komendą:

```bash
npm run dev
```

- **Frontend**: http://localhost:3002
- **Backend**: http://localhost:3001

### Osobne uruchamianie:
- Tylko frontend: `npm run client`
- Tylko backend: `npm run server`
- Backend w trybie watch: `npm run server:dev`

## 📁 Struktura Projektu

- `/server` - Backend Express (obsługa API i OAuth).
- `/src/components` - Komponenty interfejsu (Sidebar, Player, AppShell).
- `/src/screens` - Widoki stron (MusicPage).
- `/src/lib` - Narzędzia pomocnicze (API fetcher).
- `/src/hooks` - Customowe hooki React (Auth, PageData).
- `/src/data` - Dane statyczne i konfiguracja nawigacji.

## 🎨 Design

Aplikacja wykorzystuje dedykowany system projektowy zdefiniowany w `tailwind.config.js` oraz `src/index.css`. Główne kolory to `#f84f39` (Bozia Red) oraz głęboka czerń `#0a0a0a`.

---
Autor: [BoziaO](https://github.com/BoziaO)
Licencja: MIT
