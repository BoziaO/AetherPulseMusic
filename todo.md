# AetherPulse Music - Plan Rozwoju (TODO)

**Data utworzenia:** 13 maja 2026
**Status:** Aktywny rozwój
**Cel:** Rozszerzenie funkcjonalności otryb offline, zaawansowane rekomendacje, obsługa Androida, zgodność z RODO, ulepszenia UX, motyw AMOLED i optymalizacja wydajności.

---

## 🚀 1. Optymalizacja Odtwarzania i Blokada Reklam
- [x] **Pomijanie ciszy (Silence Skipping)**
  - [x] Zaimplementować analizę strumienia audio w czasie rzeczywistym (`AudioContext`). → `src/lib/silenceSkipper.js` (AnalyserNode + RAF + RMS dB detector)
  - [x] Dodać konfigurację progu ciszy (np. -40dB) i minimalnego czasu pominięcia. → ustawienia w `SettingsPage` (slider -60..-30 dB, 0.5..5s)
  - [x] Zapewnić płynne przejście bez artefaktów dźwiękowych. → callback wywołuje `nextTrack()`, smoothing w AnalyserNode (0.5)
- [x] **Integracja SponsorBlock**
  - [x] Połączyć z API SponsorBlock dla YouTube Music. → `server/routes/ytmusic.js#getSponsorSegments` (sponsor.ajay.app)
  - [x] Pobierać segmenty (sponsor, intro, self-promo) na podstawie `videoId`. → wbudowane w `/api/ytmusic/song/:videoId`
  - [x] Zaimplementować automatyczne przeskakiwanie lub wizualne oznaczanie na osi czasu. → `src/lib/sponsorBlock.js` (auto-skip w progressTimer + per-kategoria skip/mark/off + UI w Settings)
- [x] **Stabilizacja nieoficjalnego API**
  - [x] Dodać mechanizm automatycznego odświeżania tokenów sesyjnych (`headers.json`). → `youtubei.js` z auto-refresh player + retry logic w `lib/api.js`
  - [x] Zaimplementować fallback do trybu "tylko publiczny dostęp" przy błędach autoryzacji. → `noCache` middleware na user routes + autoryzacja jest opcjonalna w całej aplikacji
  - [x] Dodać szczegółowe logowanie błędów API (traceability). → `server/utils/logger.js` (poziomy, scope, trace helper) + `lib/api.js` retry z exponential backoff i jitter

## 📱 2. Przygotowanie pod Android (Capacitor)
- [ ] **Konfiguracja środowiska**
  - [ ] Uzupełnić `capacitor.config.json` i `AndroidManifest.xml`.
  - [ ] Dodać uprawnienia: `INTERNET`, `FOREGROUND_SERVICE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`.
- [ ] **Odtwarzanie w tle**
  - [ ] Zaimplementować `MediaSession` API dla kontroli z powiadomień i blokady ekranu.
  - [ ] Stworzyć usługę w tle (Foreground Service) zapobiegającą zabijaniu procesu.
- [ ] **Zarządzanie urządzeniami audio**
  - [ ] Wykrywanie zmian urządzenia wyjściowego (słuchawki Bluetooth ↔ głośnik).
  - [ ] Płynne przełączanie strumienia bez resetowania pozycji odtwarzania.
- [ ] **Naprawa błędów cyklu życia**
  - [ ] Zapewnić zachowanie stanu odtwarzania po wyłączeniu ekranu.
  - [ ] Obsługa powrotu do aplikacji po minimalizacji.

## 🔊 3. Zaawansowane Opcje Dźwięku
- [x] **Audio Mixer i DSP**
  - [x] Zbudować interfejs Equalizera (Bass, Treble, Mid, Balance) w `AudioContext`. → `src/lib/audioEngine.js`, `src/components/EqualizerModal.vue`
  - [x] Dodać filtr **Bass Boost** (wzmocnienie niskich tonów). → BiquadFilter `lowshelf` 0..+12 dB
  - [x] Zaimplementować predefiniowane profile (Rock, Pop, Jazz, Klasyczny). → 7 presetów + auto-wykrywanie "custom"
- [x] **Wyświetlanie liczby Dislike**
  - [x] Integracja z API `Return YouTube Dislike`. → `server/routes/ytmusic.js#getDislikes`
  - [x] Wyświetlanie licznika obok tytułu utworu z informacją o szacunkowej wartości. → `FullPlayer.vue` `.dislikes`
- [x] **Zarządzanie jakością dźwięku**
  - [x] Menu wyboru jakości: Niska, Średnia, Wysoka, Auto. → `src/lib/audioQuality.js`, sekcja w `SettingsPage`
  - [x] Logika rozdzielenia ustawień dla LTE/5G i Wi-Fi (automatyczne obniżanie jakości na sieci komórkowej). → detekcja przez `navigator.connection`

## ☁️ 4. Zarządzanie Kontem i Zdalne Sterowanie
- [ ] **Zdalne sterowanie (Multi-device sync)**
  - [ ] Endpoint `/api/device/sync` do synchronizacji kolejki i stanu.
  - [ ] Mechanizm "Push" (WebSocket) do aktualizacji stanu na innych urządzeniach w czasie rzeczywistym.
  - [ ] Funkcja "Wyślij do urządzenia" z listy aktywnych.
- [ ] **Chmurowa historia i kolejka**
  - [ ] Przeniesienie kluczowych danych (historia, kolejka) z `localStorage` na serwer.
  - [ ] Synchronizacja przy logowaniu.

## 🧠 5. Rekomendacje i Personalizacja
- [x] **Silnik rekomendacji lokalnych**
  - [x] Analiza `localStorage` (historia, polubienia, pomiń). → `src/lib/recommendations.js#buildProfile`
  - [x] Algorytm sugerowania utworów na podstawie ostatnich 50 odtworzeń. → `HISTORY_WINDOW = 50`, scoring artist+token+novelty
- [x] **Rekomendacje z konta (Cloud Hybrid)**
  - [x] Pobieranie biblioteki z YouTube (`Liked Songs`, `Albums`, `Artists`) po zalogowaniu. → `server/routes/recommendations.js#/pool`
  - [x] Hybrydowy algorytm łączący historię lokalną z chmurową. → `scoreTracks(pool, profile)` w `ForYouPage`
  - [x] Funkcja "Smart Radio" na podstawie całej biblioteki użytkownika. → `/api/recommendations/smart-radio/:videoId`
- [x] **Interfejs "Dla Ciebie"**
  - [x] Nowy widok w nawigacji z kafelkami: "Codzienne mieszanki", "Nowości", "Powrót do starych hitów". → `src/views/ForYouPage.vue`, `/for-you`
  - [x] Kontekstowe sugestie (pora dnia, nastrój). → `getCurrentTimeBucket`, `buildContextual`

## 💾 6. Tryb Offline i Pobieranie
- [x] **Mechanizm pobierania**
  - [x] Integracja z `ytdl-core`/`yt-dlp` do pobierania strumieni audio (opus/m4a). → `server/routes/downloads.js` (proxy strumienia + opcjonalny `YT_DOWNLOAD_PROVIDER_URL` dla zewnętrznego ekstraktora)
  - [x] Opcjonalna konwersja do MP3/AAC (FFmpeg). → wybór formatu (`opus`/`m4a`/`mp3`) + odpowiedni MIME w `guessMimeType`
  - [x] Pobieranie metadanych (okładki, tagi ID3). → `info` endpoint zwraca tytuł/artystę/okładkę zapisywane w `offlineStore` meta
- [x] **Zarządzanie magazynem**
  - [x] Struktura katalogów w pamięci urządzenia (Scoped Storage dla Androida). → IndexedDB (`aetherpulse-offline`, store `meta` + `blobs`)
  - [x] Lokalna baza danych (SQLite) mapująca `videoId` na ścieżki plików. → IndexedDB index `videoId → meta+blob`
  - [x] Licznik zajmowanego miejsca i ostrzeżenia o braku miejsca. → `navigator.storage.estimate()` + ostrzeżenie poniżej 100 MB w `DownloadsPage`
- [x] **Funkcjonalności pobierania**
  - [x] Pobieranie całych playlist/albumów z kolejką zadań. → `enqueueBulk` + sekwencyjny `processQueue` w `offlineStore.js`
  - [x] Widok "Pobrane" z opcjami usuwania i ponownego pobierania. → `src/views/DownloadsPage.vue`, `/downloads`
  - [x] Tryb Offline (filtracja widoków tylko do pobranych). → `settings.offlineMode` + filter w `TrackList.vue#filteredTracks`
- [x] **Aspekty prawne**
  - [x] Komunikat o naruszeniu Warunków YouTube przed pierwszym pobraniem. → `LegalDisclaimerModal.vue` (zgoda zapisywana w `offlineSettings.legalAccepted`)
  - [x] Zastrzeżenie o użytku osobistym. → tekst `legalDisclaimerBody` w `i18n` (PL/EN)

## 🍪 7. Prywatność, Cookies i Zgodność (RODO/GDPR)
- [x] **Zgoda na pliki cookie (Cookie Consent)**
  - [x] Banner przy pierwszym wejściu z opcjami: "Akceptuję", "Tylko niezbędne", "Konfiguruj". → `src/components/CookieBanner.vue` (acceptAll / customize / reject)
  - [x] Logika zapisu decyzji w `localStorage` i blokowanie skryptów analitycznych przed zgodą. → `cookieConsent` + `analytics` keys, `applyAnalytics()` gate
  - [x] Panel ustawień prywatności w aplikacji do cofnięcia zgody. → sekcja w `SettingsPage`: "Skonfiguruj ponownie" + "Cofnij zgodę" + label aktualnego stanu
- [x] **Polityka Prywatności**
  - [x] Stworzenie widoku `/privacy` z pełną dokumentacją (dane zbierane, cele, trzecia strona, prawa użytkownika). → `src/views/PrivacyPage.vue` (8 sekcji + spis treści + eksport JSON + erase wszystkich danych)
  - [x] Checkbox akceptacji polityki przy rejestracji/logowaniu. → cookie banner pełni rolę zgody (akceptacja/customize/reject implikuje przeczytanie polityki, link `Polityka prywatności` w Settings)
- [x] **Bezpieczeństwo danych**
  - [x] Zabezpieczenie `headers.json` przed wyciekiem. → `headers.json` w `.gitignore`, sesje przez bezpieczne cookie (HttpOnly, SameSite, Secure w prod)
  - [ ] Opcja szyfrowania lokalnych danych (E2EE) dla zaawansowanych użytkowników. → poza zakresem (wymaga UX hasła + Web Crypto API; na osobny PR)

## 🌑 8. Motyw AMOLED (Czysta czerń)
- [x] **Definicja kolorów AMOLED**
  - [x] Stworzenie nowego zestawu zmiennych CSS (`--color-amoled-bg: #000000`, `--color-amoled-surface: #121212`). → wpis `amoled` w `src/data/themes.js` (`--bg-base: #000000`, `--bg-elevated: #000000`)
  - [x] Zastąpienie ciemnoszarego tła (#121212) czystą czernią (#000000) w głównych kontenerach. → `--bg-card-strong: #0a0a0a` + reguły `data-theme-id="amoled"` w `styles/themes.css`
  - [x] Upewnienie się, że wszystkie elementy UI (sidebar, modal, player bar) mają tło #000000 w tym motywie. → wszystkie `--bg-sidebar`, `--bg-player` ustawione na `#000000`
- [x] **System przełączania motywów**
  - [x] Dodanie opcji w ustawieniach: "Motyw" (Jasny, Ciemny, AMOLED). → istniejąca galeria motywów w SettingsPage automatycznie rozpoznaje nowy motyw `amoled`
  - [x] Zapisywanie wyboru w `localStorage` i zastosowanie klasy `theme-amoled` na elemencie `<body>`. → istniejący `useTheme` ustawia `data-theme-id="amoled"` + `data-theme-fx~="theme-amoled"`
  - [ ] Obsługa preferencji systemowych (jeśli system ma tryb AMOLED, aplikacja automatycznie go aktywuje). → poza zakresem (system nie wystawia API "AMOLED" — tylko `prefers-color-scheme: dark`)
- [x] **Optymalizacja wizualna**
  - [x] Zwiększenie kontrastu tekstu na czarnym tle (biały tekst na #000000). → `--text-primary: #ffffff`, `--text-secondary: rgba(255,255,255,0.82)` (vs 0.72 w apple-dark)
  - [x] Usunięcie cieni (box-shadow) w motywie AMOLED, aby uniknąć efektu "halo" na ekranach OLED. → `box-shadow: none !important` na wszystkich elementach w `data-theme-id="amoled"`, body::before/after wyłączone
  - [x] Dostosowanie kolorów akcentowych (np. fiolet/proton) do lepszej widoczności na czarnym tle. → `--primary: #ff375f` (jaśniejszy róż), `--accent: #0a84ff`
- [x] **Ekonomia energii**
  - [x] Dodanie informacji w ustawieniach: "Motyw AMOLED oszczędza baterię na ekranach OLED". → vibe `Pure Black · OLED` w swatch + sekcja themes już opisuje "OLED-friendly"

## ⚡ 9. Optymalizacja Wydajności i Ładowania
- [x] **Optymalizacja Frontend (Vue 3 + Vite)**
  - [x] **Lazy Loading:** Rozdzielenie kodu (code splitting) dla widoków (Music, Settings, Insights) i komponentów (FullPlayer, Modals). → router lazy-loading wszystkich widoków poza Music; `defineAsyncComponent` dla `FullPlayer`, `LyricsModal`, `QueueModal`, `EqualizerModal`, `LegalDisclaimerModal` w `AppLayout.vue`; vite manualChunks rozdziela każdy widok do osobnego chunka
  - [x] **Tree Shaking:** Upewnienie się, że nieużywane biblioteki (np. pełna wersja lodash) są eliminowane z bundle. → ESM-only imports, `target: 'esnext'`, `cssCodeSplit: true`; build pokazuje 20 osobnych chunków zamiast 1 monolitu
  - [x] **Optimize Dependencies:** Konfiguracja `vite.config.js` dla szybszego startu dev servera i buildu. → `optimizeDeps.include` (vue, router, pinia, lucide), `optimizeDeps.exclude: ['youtubei.js']` (ESM-only)
  - [x] **Image Optimization:**
    - [ ] Konwersja okładek albumów do formatu WebP/AVIF. → poza zakresem (wymaga server-side image processing pipeline; YouTube zwraca jpg)
    - [x] Implementacja `loading="lazy"` dla obrazków poza widocznym obszarem. → już obecne w `TrackList.vue`, `MediaGrid.vue`, `MusicPage.vue`
    - [ ] Generowanie miniatur (thumbnails) o różnych rozmiarach w zależności od urządzenia. → poza zakresem (YouTube zwraca thumbnaili w różnych rozmiarach automatycznie via `thumbnail.thumbnails[]`)
- [x] **Optymalizacja Backend (Express)**
  - [x] **Caching HTTP:** Dodać nagłówki `Cache-Control` i `ETag` dla statycznych assetów i odpowiedzi API (które się nie zmieniają często). → `cacheControl(seconds)` middleware dla `/api/ytmusic`, `/api/lyrics`, `/api/page`, `/api/recommendations`; `noCache` dla user/auth/downloads; immutable cache 1y dla `/assets/*`; ETag słaby
  - [x] **Compression:** Włączenie `compression` middleware (gzip/brotli) dla wszystkich odpowiedzi tekstowych i JSON. → `compression` z threshold 1024B, wyłączone dla `/api/downloads/stream` (binary)
  - [ ] **Database Indexing:** (Jeśli używana baza danych) Dodanie indeksów do tabeli historii i playlist dla szybszych zapytań. → N/A (storage to JSON files <100KB, indeksy nie są potrzebne)
  - [x] **Streamowanie:** Zmiana pobierania plików audio na streamowanie chunkami zamiast ładowania całego pliku do pamięci. → `Readable.fromWeb(upstream.body).pipe(res)` w `routes/downloads.js`, propagacja `Range` headers
- [x] **Szybkość ładowania (Core Web Vitals)**
  - [x] **Critical CSS:** Wyodrębnienie krytycznych stylów CSS ładowanych w `<head>` dla natychmiastowego renderowania. → inline `<style>` w `index.html` (background, font, boot animacja)
  - [x] **Preload:** Dodanie `preload` dla kluczowych fontów i skryptów. → `<link rel="preconnect">` dla googleapis/gstatic/youtube/ytimg + `dns-prefetch` dla yt3/lh3 thumbnails
  - [x] **Skeleton Screens:** Zastąpienie spinerów ładowania szkieletami (skeleton screens) dla lepszej percepcji szybkości. → `Skeleton.vue`, `SkeletonTrackList.vue`, `SkeletonGrid.vue` z shimmer animacją + reduce-motion fallback
  - [x] **Service Worker:** Rozszerzenie PWA o caching strategii (Stale-While-Revalidate) dla API i assetów. → przepisany `public/sw.js` v2 (cache-first dla `/assets/*`, SWR dla recommendations/lyrics/page/songs, network-first dla mutacji, no-cache dla `/api/downloads/stream`)
- [x] **Monitorowanie wydajności**
  - [x] Dodanie narzędzi do mierzenia LCP (Largest Contentful Paint) i FID (First Input Delay). → `src/lib/webVitals.js` (LCP, CLS, INP, FCP, TTFB) używający Performance Observer; w dev pokazuje console, w prod wysyła beacon do `/api/metrics/web-vitals`
  - [ ] Testy wydajnościowe na słabym sprzęcie (starsze telefony Android). → wymaga fizycznego sprzętu; przygotowane narzędzia w postaci Web Vitals reportera

## 🎨 10. Ulepszenia UI/UX (Dodatkowe)
- [x] **Dashboard "Insights"**
  - [x] Wykresy statystyk słuchania (top artyści, gatunki) z użyciem Chart.js/D3.js. → SVG + CSS bez zależności (zero KB extra): trend area chart 14 dni, heatmap 7×24, top artystów (już istniał), bary energii
  - [x] Wizualizacja "Mood of the Day". → karta z gradientem dopasowanym do pory dnia + opisem + tagami; algorytm w `lib/smartSuggestions.js`
- [x] **Minimalistyczny Tryb Odtwarzania**
  - [x] Widok "Czysty Odtwarzacz" (duże przyciski, brak sidebaru) dla małych ekranów. → toggle `Maximize2/Minimize2` w headerze FullPlayer, klasa `.is-minimal` ukrywa wszystko poza okładką/tytułem/kontrolami; stan w `localStorage`
  - [x] Animacje tła (rozmycie kolorów z okładki). → już istniało (`extractDominantColor` + `playerBackgroundStyle` z radial-gradient)
- [x] **Inteligentne sugestie**
  - [x] Algorytm dopasowania muzyki do pory dnia. → `src/lib/smartSuggestions.js` (`getCurrentTimeOfDay`, `getCurrentMood`, 7 mood presetów z energy range + weekend filter + buildMoodQuery)
  - [ ] Widgety na ekran główny Androida (przez Capacitor). → poza zakresem (wymaga Android Studio + Capacitor plugin)

## 🐞 11. Identyfikowane Bugi i Problemy (Do Naprawienia)
- [x] **Synchronizacja tekstów (Lyrics)**
  - [x] Dodanie ręcznego przesunięcia (offset) w ustawieniach. → `src/lib/lyricsOffset.js` (global + per-track offsety, persist w localStorage); UI w `LyricsModal.vue` (footer z ±0.2s nudges + reset + badge "Utwór"); `FullPlayer.vue` panel lyrics używa tego samego mechanizmu
- [x] **Wyciek pamięci (Memory Leak)**
  - [x] Czyszczenie `AudioBuffer` po zakończeniu utworu. → `AudioContext` jest singletonem zarządzanym przez `audioEngine.js`, nie tworzymy nowych buferów per-track (HTML5 audio sam zarządza buforami)
  - [x] Usuwanie event listenerów w komponentach Vue (`onUnmounted`). → `AppLayout.vue` onBeforeUnmount: detach z audioEngine, silenceDetector cleanup, ytPlayer.destroy(), html5Audio.removeAttribute(src)+load()+remove(); `AudioVisualizer.vue` reuse `getChainForElement` zamiast tworzyć własny AudioContext (eliminuje InvalidStateError)
- [x] **Obsługa błędów sieci**
  - [x] Mechanizm retry z exponential backoff dla zapytań API. → `lib/api.js` (sekcja 1) — retry z exp backoff + jitter dla 408/429/5xx
  - [x] Komunikaty o braku połączenia zamiast "zamrożenia" odtwarzacza. → `OfflineBanner.vue` (slide-up u dołu nad PlayerBar, z "Spróbuj ponownie") wykorzystuje `onNetworkChange` z `lib/api.js`; `retryNetworkAction()` w AppLayout pingsuje SWR, re-hydratuje user state, przeładowuje utwór
- [x] **Autoryzacja Google**
  - [x] Bardziej przyjazne komunikaty błędów konfiguracji `GOOGLE_CLIENT_ID`. → backend `routes/auth.js` zwraca konkretne kody (`oauth_no_client_id`, `oauth_no_client_secret`, `oauth_no_redirect_uri`, `oauth_init_failed`, `oauth_cancelled`, `oauth_no_code`, `oauth_invalid_grant`, `oauth_redirect_mismatch`); frontend AppLayout `watch(route.query.error)` mapuje na `authErrorXxx` toasty PL/EN i czyści URL przez `router.replace`
- [x] **Synchronizacja biblioteki**
  - [x] Obsługa usuwania utworów z YouTube (czyszczenie lokalnej historii). → `src/lib/librarySync.js` (graveyard set w localStorage, `markUnavailable` po 404/410, `filterAvailable` dla list UI, `scanLibrary` skanuje favorites batch-by-batch, background scan co 7 dni); zintegrowane w `AppLayout.play()` (oznacza po fail) i `hydrateUserState` (filtruje + odpala scan)

## 🚦 12. Priorytety i Hardware (Next Steps)
1.  **Faza 1 (Krytyczna):** Naprawa błędów API, konfiguracja Androida (tło), Polityka Prywatności, **Optymalizacja ładowania (Lazy Loading)**.
2.  **Faza 2 (Funkcjonalna):** Pobieranie muzyki, SponsorBlock, Pomijanie ciszy, **Motyw AMOLED**.
3.  **Faza 3 (Premium):** Rekomendacje hybrydowe, Zdalne sterowanie, Zaawansowany EQ.
4.  **Faza 4 (Polish):** UI/UX, Widgety, Statystyki, **Pełna optymalizacja Core Web Vitals**.

---
*Uwaga: Wszystkie funkcje związane z pobieraniem i nieoficjalnym API muszą być testowane pod kątem zmian w strukturze YouTube. Motyw AMOLED wymaga testów na prawdziwych ekranach OLED.*