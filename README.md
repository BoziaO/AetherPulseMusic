# 🎵 AetherPulse Music

<div align="center">

**Nowoczesny, prywatny odtwarzacz YouTube Music z zaawansowanymi funkcjami offline.**

[![License](https://img.shields.io/github/license/BoziaO/AetherPulseMusic?style=flat-square)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&style=flat-square)](https://vuejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&style=flat-square)](https://expressjs.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-5.x-115EF6?logo=capacitor&style=flat-square)](https://capacitorjs.com/)
[![Stars](https://img.shields.io/github/stars/BoziaO/AetherPulseMusic?style=flat-square&color=gold)](https://github.com/BoziaO/AetherPulseMusic/stargazers)

</div>

---

## ✨ Cechy projektu

AetherPulse to potężna alternatywa dla oficjalnej aplikacji YouTube Music, budowana z myślą o prywatności, wydajności i braku reklam.

### 🚀 Główne funkcjonalności
- **🎧 Odtwarzanie bez reklam:** Pełne korzystanie z nieoficjalnego API YouTube Music bez przerw na reklamy.
- **💾 Tryb Offline:** Pobieraj utwory, albumy i playlisty do pamięci lokalnej (obsługa Androida).
- **🧠 Inteligentne rekomendacje:** Algorytmy sugerujące muzykę na podstawie Twojej historii słuchania i biblioteki z konta.
- **🔊 Zaawansowany dźwięk:** Wbudowany equalizer, Bass Boost, pomijanie ciszy i integracja z **SponsorBlock**.
- **🌑 Motyw AMOLED:** Czysta czerń (#000000) dla oszczędności baterii na ekranach OLED.
- **☁️ Synchronizacja chmurowa:** Zdalne sterowanie odtwarzaniem i synchronizacja kolejki między urządzeniami.
- **📱 Natywna aplikacja Android:** Dedykowana wersja z odtwarzaniem w tle, powiadomieniami i widgetami.
- **🔒 Prywatność:** Brak śledzenia reklamowego, pełna kontrola nad danymi i zgodność z RODO.

### 🛠️ Technologia
Projekt wykorzystuje najnowsze technologie webowe i hybrydowe:
- **Frontend:** Vue 3 (Composition API), Tailwind CSS, Vite.
- **Backend:** Node.js, Express, `ytmusicapi` (Innertube).
- **Mobile:** Capacitor (Android/iOS).
- **Audio:** Web Audio API (DSP, Equalizer, Silence Skipping).

---

## 📸 Zrzuty ekranu

<div align="center">
  <img src="" alt="Main Player" width="200" style="border-radius: 12px; margin: 5px;">
  <br>
  <small><i>*Zrzuty ekranu są ilustracyjne. Interfejs jest w ciągłym rozwoju.*</i></small>
</div>

---

## 🚀 Instalacja i uruchomienie

### Wymagania wstępne
- Node.js (v18+)
- npm lub yarn
- (Opcjonalnie) Android Studio do kompilacji aplikacji mobilnej

### 1. Klonowanie repozytorium
```bash
git clone https://github.com/BoziaO/AetherPulseMusic.git
cd AetherPulseMusic
2. Instalacja zależności
npm install
3. Konfiguracja środowiska
Skopiuj plik .env.example do .env i wypełnij wymagane zmienne:

cp .env.example .env
Wymagane zmienne:

SESSION_SECRET: Losowy ciąg znaków dla sesji.
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: Dla logowania przez Google (opcjonalne).
BACKEND_PORT: Port dla serwera (domyślnie 3001).
FRONTEND_URL: Adres URL frontendu.
Uwaga: Aby odblokować funkcje prywatne (biblioteka, playlisty), umieść plik headers.json z tokenami YouTube Music w głównym katalogu projektu.

4. Uruchomienie w trybie deweloperskim
npm run dev
Aplikacja będzie dostępna pod adresem http://localhost:3000.

5. Budowanie dla produkcji
npm run build
npm run server
6. Kompilacja aplikacji Android
npx cap add android
npx cap sync
npx cap open android
(Wymaga skonfigurowanego środowiska Android SDK)

📂 Struktura projektu
AetherPulseMusic/
├── public/              # Statyczne zasoby (favicon, manifest)
├── src/                 # Kod źródłowy frontendu (Vue 3)
│   ├── components/      # Komponenty UI (Player, Sidebar, Modals)
│   ├── views/           # Widoki (Music, Settings, Insights)
│   ├── lib/             # Logika biznesowa (API, formatowanie)
│   └── assets/          # Style i obrazy
├── server/              # Backend (Express)
│   ├── routes/          # Endpointy API
│   ├── utils/           # Narzędzia pomocnicze
│   └── ytmusic.js       # Klient YouTube Music
├── capacitor.config.json # Konfiguracja aplikacji mobilnej
└── package.json         # Zależności projektu
🛣️ Plan rozwoju (Roadmap)
Aktualny status projektu i planowane funkcje można śledzić w pliku TODO.md.

Najbliższe cele:
 Podstawowy odtwarzacz i wyszukiwanie
 Integracja z nieoficjalnym API
 Tryb offline i pobieranie muzyki
 Motyw AMOLED i pełna optymalizacja wydajności
 Zaawansowane rekomendacje hybrydowe
 Pełna obsługa Androida (tło, powiadomienia)
🤝 Współpraca
Witamy wkład społeczności! Jeśli chcesz pomóc w rozwoju projektu:

Sprawdź listę zadań w TODO.md.
Forkuj repozytorium i twórz nowe branże.
Wysyłaj Pull Requesty z opisem zmian.
Obszary do rozwoju:

Optymalizacja wydajności (Core Web Vitals).
Rozszerzenie funkcji audio (DSP).
Ulepszanie UI/UX.
Testy jednostkowe i integracyjne.
⚠️ Zastrzeżenie prawne
AetherPulse Music jest niezależnym projektem open-source i nie jest powiązany z Google LLC ani YouTube.

Projekt wykorzystuje nieoficjalne API YouTube Music.
Pobieranie muzyki może naruszać Warunki Korzystania z Usługi YouTube. Pliki są przeznaczone wyłącznie do użytku osobistego i offline.
Używasz tę aplikację na własną odpowiedzialność.
📄 Licencja
Projekt jest udostępniany na licencji MIT. Zobacz plik LICENSE dla szczegółów.

🙏 Podziękowania
Twórcy biblioteki ytmusicapi / Innertube.
Społeczności SponsorBlock.
Wszystkim współautorom i testerom.
<div align="center">
Stworzone z ❤️ przez Bozia

</div> ```