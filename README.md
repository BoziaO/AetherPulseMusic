# AetherPulse|Music

Responsywny odtwarzacz muzyczny z YouTube Music, lokalnymi playlistami, ulubionymi utworami i historią odtwarzania. Aplikacja jest zoptymalizowana pod desktop i telefony.

## Funkcje

- Wyszukiwanie utworów, playlist, albumów i wykonawców z YouTube Music.
- Odtwarzacz z kolejką, przewijaniem, głośnością, losowaniem i powtarzaniem.
- Lokalne playlisty z dodawaniem oraz usuwaniem utworów.
- Import playlist YouTube Music do edytowalnej playlisty lokalnej.
- Ulubione utwory zapisywane lokalnie w przeglądarce.
- Historia ostatnio odtwarzanych utworów.
- Motywy: ciemny, jasny i własny kolor akcentu.
- Ergonomiczne skróty: `/` wyszukuje, `Spacja` lub `K` pauzuje, strzałki przełączają utwory.
- Mobilne menu dolne, wysuwane menu boczne i responsywny player.

## Technologie

- Frontend: React, Create React App, React Router, Tailwind CSS.
- Backend: Node.js, Express, sesje i opcjonalny Google OAuth.
- Dane muzyczne: integracja YouTube Music przez moduł `server/ytmusic.js`.
- Storage: lokalny plik `localPlaylists.json` oraz `localStorage` dla ulubionych i historii.

## Start lokalny

```bash
npm install
cp .env.example .env
npm run dev
```

- Frontend: `http://localhost:5000`
- Backend API: `http://localhost:3001`

## Zmienne środowiskowe

| Zmienna | Opis | Wymagana |
|---|---|---|
| `BACKEND_PORT` | Port backendu w development | Nie |
| `SESSION_SECRET` | Sekret sesji Express | Tak w produkcji |
| `GOOGLE_CLIENT_ID` | OAuth Google | Nie |
| `GOOGLE_CLIENT_SECRET` | OAuth Google | Nie |
| `GOOGLE_CALLBACK_URL` | Callback OAuth | Nie |
| `REACT_APP_API_BASE_URL` | Niestandardowy adres API; domyślnie puste dla proxy | Nie |

## Struktura

```text
server/                 Backend Express i API muzyczne
src/components/         Komponenty UI, player, sidebar, modale
src/screens/            Główne widoki aplikacji
src/hooks/              Hooki danych i sesji
src/lib/                Klient API
src/data/               Nawigacja i fallback content
public/                 Manifest PWA i HTML
.github/                Szablony GitHub
```

## Przygotowanie pod GitHub

Repo zawiera szablon pull requesta, zgłoszenia błędu, prośby o funkcję, zasady kontrybucji i politykę bezpieczeństwa. Przed wysłaniem zmian upewnij się, że aplikacja uruchamia się przez `npm run dev`.

## Licencja

MIT
