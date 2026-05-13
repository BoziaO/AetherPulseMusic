🎵 AetherPulse Music

<div align="center">AetherPulse Music

Nowoczesny klient YouTube Music bez reklam, z trybem offline i naciskiem na prywatność.

<p>
  <img src="https://img.shields.io/github/license/BoziaO/AetherPulseMusic?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&style=for-the-badge" alt="Vue">
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&style=for-the-badge" alt="Express">
  <img src="https://img.shields.io/badge/Capacitor-5.x-115EF6?logo=capacitor&style=for-the-badge" alt="Capacitor">
  <img src="https://img.shields.io/github/stars/BoziaO/AetherPulseMusic?style=for-the-badge&color=gold" alt="Stars">
</p><p>
  Lekki, szybki i prywatny odtwarzacz muzyki inspirowany YouTube Music.  
  Działa jako aplikacja webowa i natywna aplikacja Android.
</p></div>
---

✨ Funkcje

🎧 Odtwarzanie muzyki

Odtwarzanie bez reklam

Obsługa albumów, playlist i pojedynczych utworów

Kolejka odtwarzania i autoplay

Wyszukiwanie muzyki przez YouTube Music API

Synchronizacja historii słuchania


💾 Tryb offline

Pobieranie utworów i playlist

Lokalna biblioteka offline

Odtwarzanie bez internetu

Cache audio dla szybszego działania


🔊 Audio i DSP

Equalizer

Bass Boost

Pomijanie ciszy

Integracja z SponsorBlock

Web Audio API


🌑 Interfejs

Motyw AMOLED

Responsywny UI

Dynamiczne animacje

Tryb desktop i mobile

Widgety Android


🔒 Prywatność

Brak trackerów reklamowych

Brak telemetryki

Dane przechowywane lokalnie

Pełna kontrola nad biblioteką



---

🛠️ Stack technologiczny

Frontend

Vue 3 (Composition API)

Vite

Tailwind CSS

Pinia

Vue Router


Backend

Node.js

Express

ytmusicapi / Innertube


Mobile

Capacitor

Android SDK


Audio

Web Audio API

DSP Processing



---

📸 Zrzuty ekranu

<div align="center">Home	Player	Library

<img src="./docs/screenshots/home.png" width="220">	<img src="./docs/screenshots/player.png" width="220">	<img src="./docs/screenshots/library.png" width="220">


<sub>Zrzuty ekranu są poglądowe i mogą się zmieniać wraz z rozwojem projektu.</sub>

</div>
---

🚀 Instalacja

Wymagania

Node.js 18+

npm lub yarn

Android Studio (opcjonalnie)



---

1. Klonowanie repozytorium

git clone https://github.com/BoziaO/AetherPulseMusic.git
cd AetherPulseMusic


---

2. Instalacja zależności

npm install


---

3. Konfiguracja środowiska

Skopiuj plik .env.example:

cp .env.example .env

Przykładowa konfiguracja:

SESSION_SECRET=your_secret
BACKEND_PORT=3001
FRONTEND_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

Opcjonalnie

Aby uzyskać dostęp do prywatnej biblioteki YouTube Music:

1. Wyeksportuj nagłówki z przeglądarki


2. Umieść plik headers.json w katalogu głównym projektu




---

▶️ Uruchomienie

Development

npm run dev

Frontend:

http://localhost:3000

Backend:

http://localhost:3001


---

Build produkcyjny

npm run build
npm run server


---

📱 Android

Dodanie platformy

npx cap add android

Synchronizacja

npx cap sync

Otworzenie projektu

npx cap open android

Wymagane jest poprawnie skonfigurowane Android SDK.


---

📂 Struktura projektu

AetherPulseMusic/
│
├── public/                 # Manifest, favicon, statyczne pliki
├── src/
│   ├── assets/             # Style i obrazy
│   ├── components/         # Komponenty UI
│   ├── composables/        # Vue composables
│   ├── lib/                # API i logika aplikacji
│   ├── stores/             # Pinia stores
│   └── views/              # Widoki aplikacji
│
├── server/
│   ├── routes/             # Endpointy API
│   ├── utils/              # Narzędzia backendowe
│   └── ytmusic.js          # Integracja z YouTube Music
│
├── capacitor.config.json
├── package.json
└── README.md


---

🛣️ Roadmap

Aktualnie rozwijane

[x] Podstawowy player

[x] Wyszukiwanie muzyki

[x] Integracja z YouTube Music API

[ ] Offline downloads

[ ] Zaawansowany equalizer

[ ] Synchronizacja między urządzeniami

[ ] Powiadomienia Android

[ ] Widgety Android

[ ] Smart recommendations

[ ] Obsługa iOS



---

🤝 Współpraca

Pull Requesty i sugestie są mile widziane.

Jak pomóc?

1. Fork repozytorium


2. Utwórz branch:



git checkout -b feature/nazwa-funkcji

3. Commit zmian:



git commit -m "Dodano nową funkcję"

4. Push:



git push origin feature/nazwa-funkcji

5. Otwórz Pull Request




---

⚠️ Informacja prawna

AetherPulse Music nie jest powiązany z Google LLC ani YouTube.

Projekt korzysta z nieoficjalnego API YouTube Music.
Pobieranie treści może naruszać regulamin YouTube.
Aplikacja jest przeznaczona wyłącznie do użytku osobistego i edukacyjnego.

Korzystasz z projektu na własną odpowiedzialność.


---

📄 Licencja

Projekt dostępny na licencji MIT.

Więcej informacji znajdziesz w pliku LICENSE.


---

🙏 Podziękowania

Twórcom ytmusicapi

Społeczności SponsorBlock

Wszystkim testerom i contributorom



---

<div align="center">Stworzone przez Bozia ❤️

</div>