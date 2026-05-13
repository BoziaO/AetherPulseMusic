# AetherPulse Music - Plan Rozwoju (TODO)

**Data utworzenia:** 13 maja 2026
**Status:** Aktywny rozwój
**Cel:** Rozszerzenie funkcjonalności otryb offline, zaawansowane rekomendacje, obsługa Androida, zgodność z RODO, ulepszenia UX, motyw AMOLED i optymalizacja wydajności.

---

## 🚀 1. Optymalizacja Odtwarzania i Blokada Reklam
- [ ] **Pomijanie ciszy (Silence Skipping)**
  - [ ] Zaimplementować analizę strumienia audio w czasie rzeczywistym (`AudioContext`).
  - [ ] Dodać konfigurację progu ciszy (np. -40dB) i minimalnego czasu pominięcia.
  - [ ] Zapewnić płynne przejście bez artefaktów dźwiękowych.
- [ ] **Integracja SponsorBlock**
  - [ ] Połączyć z API SponsorBlock dla YouTube Music.
  - [ ] Pobierać segmenty (sponsor, intro, self-promo) na podstawie `videoId`.
  - [ ] Zaimplementować automatyczne przeskakiwanie lub wizualne oznaczanie na osi czasu.
- [ ] **Stabilizacja nieoficjalnego API**
  - [ ] Dodać mechanizm automatycznego odświeżania tokenów sesyjnych (`headers.json`).
  - [ ] Zaimplementować fallback do trybu "tylko publiczny dostęp" przy błędach autoryzacji.
  - [ ] Dodać szczegółowe logowanie błędów API (traceability).

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
- [ ] **Audio Mixer i DSP**
  - [ ] Zbudować interfejs Equalizera (Bass, Treble, Mid, Balance) w `AudioContext`.
  - [ ] Dodać filtr **Bass Boost** (wzmocnienie niskich tonów).
  - [ ] Zaimplementować predefiniowane profile (Rock, Pop, Jazz, Klasyczny).
- [ ] **Wyświetlanie liczby Dislike**
  - [ ] Integracja z API `Return YouTube Dislike`.
  - [ ] Wyświetlanie licznika obok tytułu utworu z informacją o szacunkowej wartości.
- [ ] **Zarządzanie jakością dźwięku**
  - [ ] Menu wyboru jakości: Niska, Średnia, Wysoka, Auto.
  - [ ] Logika rozdzielenia ustawień dla LTE/5G i Wi-Fi (automatyczne obniżanie jakości na sieci komórkowej).

## ☁️ 4. Zarządzanie Kontem i Zdalne Sterowanie
- [ ] **Zdalne sterowanie (Multi-device sync)**
  - [ ] Endpoint `/api/device/sync` do synchronizacji kolejki i stanu.
  - [ ] Mechanizm "Push" (WebSocket) do aktualizacji stanu na innych urządzeniach w czasie rzeczywistym.
  - [ ] Funkcja "Wyślij do urządzenia" z listy aktywnych.
- [ ] **Chmurowa historia i kolejka**
  - [ ] Przeniesienie kluczowych danych (historia, kolejka) z `localStorage` na serwer.
  - [ ] Synchronizacja przy logowaniu.

## 🧠 5. Rekomendacje i Personalizacja
- [ ] **Silnik rekomendacji lokalnych**
  - [ ] Analiza `localStorage` (historia, polubienia, pomiń).
  - [ ] Algorytm sugerowania utworów na podstawie ostatnich 50 odtworzeń.
- [ ] **Rekomendacje z konta (Cloud Hybrid)**
  - [ ] Pobieranie biblioteki z YouTube (`Liked Songs`, `Albums`, `Artists`) po zalogowaniu.
  - [ ] Hybrydowy algorytm łączący historię lokalną z chmurową.
  - [ ] Funkcja "Smart Radio" na podstawie całej biblioteki użytkownika.
- [ ] **Interfejs "Dla Ciebie"**
  - [ ] Nowy widok w nawigacji z kafelkami: "Codzienne mieszanki", "Nowości", "Powrót do starych hitów".
  - [ ] Kontekstowe sugestie (pora dnia, nastrój).

## 💾 6. Tryb Offline i Pobieranie
- [ ] **Mechanizm pobierania**
  - [ ] Integracja z `ytdl-core`/`yt-dlp` do pobierania strumieni audio (opus/m4a).
  - [ ] Opcjonalna konwersja do MP3/AAC (FFmpeg).
  - [ ] Pobieranie metadanych (okładki, tagi ID3).
- [ ] **Zarządzanie magazynem**
  - [ ] Struktura katalogów w pamięci urządzenia (Scoped Storage dla Androida).
  - [ ] Lokalna baza danych (SQLite) mapująca `videoId` na ścieżki plików.
  - [ ] Licznik zajmowanego miejsca i ostrzeżenia o braku miejsca.
- [ ] **Funkcjonalności pobierania**
  - [ ] Pobieranie całych playlist/albumów z kolejką zadań.
  - [ ] Widok "Pobrane" z opcjami usuwania i ponownego pobierania.
  - [ ] Tryb Offline (filtracja widoków tylko do pobranych).
- [ ] **Aspekty prawne**
  - [ ] Komunikat o naruszeniu Warunków YouTube przed pierwszym pobraniem.
  - [ ] Zastrzeżenie o użytku osobistym.

## 🍪 7. Prywatność, Cookies i Zgodność (RODO/GDPR)
- [ ] **Zgoda na pliki cookie (Cookie Consent)**
  - [ ] Banner przy pierwszym wejściu z opcjami: "Akceptuję", "Tylko niezbędne", "Konfiguruj".
  - [ ] Logika zapisu decyzji w `localStorage` i blokowanie skryptów analitycznych przed zgodą.
  - [ ] Panel ustawień prywatności w aplikacji do cofnięcia zgody.
- [ ] **Polityka Prywatności**
  - [ ] Stworzenie widoku `/privacy` z pełną dokumentacją (dane zbierane, cele, trzecia strona, prawa użytkownika).
  - [ ] Checkbox akceptacji polityki przy rejestracji/logowaniu.
  - [ ] Hostowanie polityki na serwerze dla Google Play Store.
- [ ] **Bezpieczeństwo danych**
  - [ ] Zabezpieczenie `headers.json` przed wyciekiem.
  - [ ] Opcja szyfrowania lokalnych danych (E2EE) dla zaawansowanych użytkowników.

## 🌑 8. Motyw AMOLED (Czysta czerń)
- [ ] **Definicja kolorów AMOLED**
  - [ ] Stworzenie nowego zestawu zmiennych CSS (`--color-amoled-bg: #000000`, `--color-amoled-surface: #121212`).
  - [ ] Zastąpienie ciemnoszarego tła (#121212) czystą czernią (#000000) w głównych kontenerach.
  - [ ] Upewnienie się, że wszystkie elementy UI (sidebar, modal, player bar) mają tło #000000 w tym motywie.
- [ ] **System przełączania motywów**
  - [ ] Dodanie opcji w ustawieniach: "Motyw" (Jasny, Ciemny, AMOLED).
  - [ ] Zapisywanie wyboru w `localStorage` i zastosowanie klasy `theme-amoled` na elemencie `<body>`.
  - [ ] Obsługa preferencji systemowych (jeśli system ma tryb AMOLED, aplikacja automatycznie go aktywuje).
- [ ] **Optymalizacja wizualna**
  - [ ] Zwiększenie kontrastu tekstu na czarnym tle (biały tekst na #000000).
  - [ ] Usunięcie cieni (box-shadow) w motywie AMOLED, aby uniknąć efektu "halo" na ekranach OLED.
  - [ ] Dostosowanie kolorów akcentowych (np. fiolet/proton) do lepszej widoczności na czarnym tle.
- [ ] **Ekonomia energii**
  - [ ] Dodanie informacji w ustawieniach: "Motyw AMOLED oszczędza baterię na ekranach OLED".

## ⚡ 9. Optymalizacja Wydajności i Ładowania
- [ ] **Optymalizacja Frontend (Vue 3 + Vite)**
  - [ ] **Lazy Loading:** Rozdzielenie kodu (code splitting) dla widoków (Music, Settings, Insights) i komponentów (FullPlayer, Modals).
  - [ ] **Tree Shaking:** Upewnienie się, że nieużywane biblioteki (np. pełna wersja lodash) są eliminowane z bundle.
  - [ ] **Optimize Dependencies:** Konfiguracja `vite.config.js` dla szybszego startu dev servera i buildu.
  - [ ] **Image Optimization:**
    - [ ] Konwersja okładek albumów do formatu WebP/AVIF.
    - [ ] Implementacja `loading="lazy"` dla obrazków poza widocznym obszarem.
    - [ ] Generowanie miniatur (thumbnails) o różnych rozmiarach w zależności od urządzenia.
- [ ] **Optymalizacja Backend (Express)**
  - [ ] **Caching HTTP:** Dodać nagłówki `Cache-Control` i `ETag` dla statycznych assetów i odpowiedzi API (które się nie zmieniają często).
  - [ ] **Compression:** Włączenie `compression` middleware (gzip/brotli) dla wszystkich odpowiedzi tekstowych i JSON.
  - [ ] **Database Indexing:** (Jeśli używana baza danych) Dodanie indeksów do tabeli historii i playlist dla szybszych zapytań.
  - [ ] **Streamowanie:** Zmiana pobierania plików audio na streamowanie chunkami zamiast ładowania całego pliku do pamięci.
- [ ] **Szybkość ładowania (Core Web Vitals)**
  - [ ] **Critical CSS:** Wyodrębnienie krytycznych stylów CSS ładowanych w `<head>` dla natychmiastowego renderowania.
  - [ ] **Preload:** Dodanie `preload` dla kluczowych fontów i skryptów.
  - [ ] **Skeleton Screens:** Zastąpienie spinerów ładowania szkieletami (skeleton screens) dla lepszej percepcji szybkości.
  - [ ] **Service Worker:** Rozszerzenie PWA o caching strategii (Stale-While-Revalidate) dla API i assetów.
- [ ] **Monitorowanie wydajności**
  - [ ] Dodanie narzędzi do mierzenia LCP (Largest Contentful Paint) i FID (First Input Delay).
  - [ ] Testy wydajnościowe na słabym sprzęcie (starsze telefony Android).

## 🎨 10. Ulepszenia UI/UX (Dodatkowe)
- [ ] **Dashboard "Insights"**
  - [ ] Wykresy statystyk słuchania (top artyści, gatunki) z użyciem Chart.js/D3.js.
  - [ ] Wizualizacja "Mood of the Day".
- [ ] **Minimalistyczny Tryb Odtwarzania**
  - [ ] Widok "Czysty Odtwarzacz" (duże przyciski, brak sidebaru) dla małych ekranów.
  - [ ] Animacje tła (rozmycie kolorów z okładki).
- [ ] **Inteligentne sugestie**
  - [ ] Algorytm dopasowania muzyki do pory dnia.
  - [ ] Widgety na ekran główny Androida (przez Capacitor).

## 🐞 11. Identyfikowane Bugi i Problemy (Do Naprawienia)
- [ ] **Synchronizacja tekstów (Lyrics)**
  - [ ] Dodanie ręcznego przesunięcia (offset) w ustawieniach.
- [ ] **Wyciek pamięci (Memory Leak)**
  - [ ] Czyszczenie `AudioBuffer` po zakończeniu utworu.
  - [ ] Usuwanie event listenerów w komponentach Vue (`onUnmounted`).
- [ ] **Obsługa błędów sieci**
  - [ ] Mechanizm retry z exponential backoff dla zapytań API.
  - [ ] Komunikaty o braku połączenia zamiast "zamrożenia" odtwarzacza.
- [ ] **Autoryzacja Google**
  - [ ] Bardziej przyjazne komunikaty błędów konfiguracji `GOOGLE_CLIENT_ID`.
- [ ] **Synchronizacja biblioteki**
  - [ ] Obsługa usuwania utworów z YouTube (czyszczenie lokalnej historii).

## 🚦 12. Priorytety i Harware (Next Steps)
1.  **Faza 1 (Krytyczna):** Naprawa błędów API, konfiguracja Androida (tło), Polityka Prywatności, **Optymalizacja ładowania (Lazy Loading)**.
2.  **Faza 2 (Funkcjonalna):** Pobieranie muzyki, SponsorBlock, Pomijanie ciszy, **Motyw AMOLED**.
3.  **Faza 3 (Premium):** Rekomendacje hybrydowe, Zdalne sterowanie, Zaawansowany EQ.
4.  **Faza 4 (Polish):** UI/UX, Widgety, Statystyki, **Pełna optymalizacja Core Web Vitals**.

---
*Uwaga: Wszystkie funkcje związane z pobieraniem i nieoficjalnym API muszą być testowane pod kątem zmian w strukturze YouTube. Motyw AMOLED wymaga testów na prawdziwych ekranach OLED.*