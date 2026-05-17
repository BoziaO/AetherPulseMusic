🎵 AetherPulse Music

<div align="center">AetherPulse Music

Nowoczesny klient YouTube Music bez reklam, z trybem offline i naciskiem na prywatność.

<p>
  <img src="https://img.shields.io/github/license/BoziaO/AetherPulseMusic?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&style=for-the-badge" alt="Vue">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&style=for-the-badge" alt="FastAPI">
  <img src="https://img.shields.io/badge/Capacitor-5.x-115EF6?logo=capacitor&style=for-the-badge" alt="Capacitor">
  <img src="https://img.shields.io/github/stars/BoziaO/AetherPulseMusic?style=for-the-badge&color=gold" alt="Stars">
</p><p>
  Lekki, szybki i prywatny odtwarzacz muzyki inspirowany YouTube Music.  
  Działa jako aplikacja webowa i natywna aplikacja Android.
</p></div>
---

✨ Funkcje

🎧 Odtwarzanie muzyki
- Odtwarzanie bez reklam
- Obsługa albumów, playlist i pojedynczych utworów
- Kolejka odtwarzania i autoplay
- Wyszukiwanie muzyki przez YouTube Music API
- Synchronizacja historii słuchania (lokalnie)

💾 Tryb offline
- Pobieranie utworów i playlist
- Lokalna biblioteka offline (IndexedDB)
- Odtwarzanie bez internetu
- Cache audio dla szybszego działania

🔊 Audio i DSP
- Equalizer
- Bass Boost
- Pomijanie ciszy
- Integracja z SponsorBlock
- Web Audio API

🌑 Interfejs
- Motyw AMOLED
- Responsywny UI
- Dynamiczne animacje
- Tryb desktop i mobile
- Widgety Android (via Capacitor)

🔒 Prywatność
- Brak trackerów reklamowych
- Brak telemetryki
- Dane przechowywane lokalnie
- Pełna kontrola nad biblioteką

---

🛠️ Stack technologiczny

Frontend
- Vue 3 (Composition API)
- Vite
- Tailwind CSS
- Pinia
- Vue Router

Backend
- Python 3.10+
- FastAPI
- ytmusicapi
- yt-dlp (Stream extraction)

Mobile
- Capacitor
- Android SDK

Audio
- Web Audio API
- DSP Processing

---

📸 Zrzuty ekranu

<div align="center">
<table>
  <tr>
    <th>Home</th>
    <th>Player</th>
    <th>Library</th>
  </tr>
  <tr>
    <td><img src="./docs/screenshots/home.png" width="220"></td>
    <td><img src="./docs/screenshots/player.png" width="220"></td>
    <td><img src="./docs/screenshots/library.png" width="220"></td>
  </tr>
</table>

<sub>Zrzuty ekranu są poglądowe i mogą się zmieniać wraz z rozwojem projektu.</sub>
</div>

---

🚀 Instalacja

Wymagania
- Node.js 18+
- Python 3.10+
- npm lub yarn
- Android Studio (opcjonalnie dla aplikacji mobilnej)

---

1. Klonowanie repozytorium
```bash
git clone https://github.com/BoziaO/AetherPulseMusic.git
cd AetherPulseMusic
```

---

2. Instalacja zależności

Frontend:
```bash
npm install
```

Backend:
```bash
pip install -r backend/requirements.txt
```

---

3. Konfiguracja środowiska

Skopiuj plik .env.example:
```bash
cp .env.example .env
```

---

▶️ Uruchomienie

Development

1. Uruchom backend:
```bash
npm run server
```
(Dostępny pod http://localhost:3001)

2. Uruchom frontend:
```bash
npm run dev
```
(Dostępny pod http://localhost:5000)

---

Build produkcyjny
```bash
npm run build
```

---

📱 Android

Dodanie platformy:
```bash
npx cap add android
```

Synchronizacja:
```bash
npx cap sync
```

Otworzenie projektu:
```bash
npx cap open android
```

---

📂 Struktura projektu

AetherPulseMusic/
│
├── public/                 # Manifest, favicon, statyczne pliki
├── src/                    # Frontend Vue
│   ├── components/         # Komponenty UI
│   ├── lib/                # API, Audio Engine, Offline Store
│   ├── stores/             # Pinia stores
│   └── views/              # Widoki aplikacji
│
├── backend/                # Backend FastAPI (Python)
│   ├── main.py             # Główny serwer i endpointy
│   └── requirements.txt    # Zależności Pythona
│
├── capacitor.config.json
├── package.json
└── README.md

---

🛣️ Roadmap

[x] Podstawowy player
[x] Wyszukiwanie muzyki
[x] Integracja z YouTube Music API
[x] Offline downloads (IndexedDB + Backend Proxy)
[x] Dynamiczne motywy
[ ] Zaawansowany equalizer
[ ] Synchronizacja między urządzeniami
[ ] Powiadomienia Android
[ ] Widgety Android
[ ] Smart recommendations

---

⚠️ Informacja prawna

AetherPulse Music nie jest powiązany z Google LLC ani YouTube.
Projekt korzysta z nieoficjalnego API YouTube Music.
Pobieranie treści może naruszać regulamin YouTube.
Aplikacja jest przeznaczona wyłącznie do użytku osobistego i edukacyjnego.

---

📄 Licencja

Projekt dostępny na licencji MIT.

---

<div align="center">Stworzone przez Bozia ❤️</div>
