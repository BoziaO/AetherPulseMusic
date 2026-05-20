# ✅ Mobile Optimization Verification Checklist

## 📋 Przed Budową

### Środowisko
- [ ] Node.js 20.19+ zainstalowany (`node --version`)
- [ ] npm 10+ zainstalowany (`npm install --version`)
- [ ] Git zainstalowany (opcjonalnie)
- [ ] Android Studio 2024+ (dla Android) lub Xcode 15+ (dla iOS)
- [ ] Minimum 10GB wolnej przestrzeni

### Projekt
- [ ] `npm install` zakończony bez błędów
- [ ] Brak błędów w `npm run build`
- [ ] `dist/` folder istnieje i zawiera pliki HTML/CSS/JS
- [ ] `capacitor.config.json` istnieje i jest poprawny
- [ ] `package.json` zawiera mobile scripts

---

## 🎯 Optymalizacja Mobilna

### HTML & Meta Tagi
- [x] `viewport-fit=cover` w meta viewport
- [x] `apple-mobile-web-app-capable` = yes
- [x] `apple-mobile-web-app-status-bar-style` = black-translucent
- [x] Theme color dla systemu
- [x] Format detection disabled (nie 'dzwonić' na linki)

### CSS & Responsive
- [x] Safe area insets zdeklarowane w `:root`
- [x] Mobile breakpoints (< 640px, < 1024px)
- [x] Landscape support (< 600px height)
- [x] Touch-friendly buttons (44x44px minimum)
- [x] Input fields 44px+ dla mobile
- [x] Font size 16px+ na input (prevent zoom)

### Komponenty
- [x] AppLayout - safe area padding dla topbar
- [x] PlayerBar - safe area padding dla bottom
- [x] FullPlayer - landscape orientation support
- [x] Sidebar - hidden na mobile (hamburger menu)
- [x] Modals - mobile-optimized (full width na male ekrany)

### Capacitor
- [x] `capacitor.config.json` - webDir=dist
- [x] iOS config - contentInsetAdjustmentBehavior
- [x] Android config - backgroundColor, uiMode
- [x] Plugins - SplashScreen, StatusBar

---

## 🚀 Konfiguracja Przed Budową

### Zmień App Details (Opcjonalnie)

`capacitor.config.json`:
```json
{
  "appId": "com.twoja.nazwa",
  "appName": "Twoja Nazwa Aplikacji"
}
```

### Dodaj Ikony (Opcjonalnie)

Umieść w `public/`:
- `icon.svg` - logo (SVG)
- `icon-192.png` - 192x192px
- `icon-512.png` - 512x512px

---

## 🔨 Proces Budowy

### Android

```bash
# 1. Zainstaluj narzędzia (jeśli potrzebne)
npm install

# 2. Zbuduj projekt
npm run build

# 3. Skopiuj do Capacitor
npm run cap:copy

# 4. Synchronizuj zależności
npm run cap:sync

# 5. Otwórz Android Studio
npm run cap:open:android

# 6. W Android Studio: Build → Build APK
```

- [ ] Android Studio się otworzył
- [ ] Projekt się zaindeksował
- [ ] Build variant: debug
- [ ] Build successful
- [ ] APK created w `android/app/build/outputs/apk/`

### iOS (tylko Mac)

```bash
# Kroki 1-4 wspólne z Android

# 5. Otwórz Xcode
npm run cap:open:ios

# 6. W Xcode: Product → Build / Run
```

- [ ] Xcode się otworzył
- [ ] Zaznaczony correct scheme
- [ ] Zaznaczony device/simulator
- [ ] Build successful
- [ ] App zainstalował się

---

## 🧪 Testowanie na Urządzeniu

### Android Phone
- [ ] Podłącz USB + włącz USB Debugging
- [ ] `adb devices` pokazuje urządzenie
- [ ] Aplikacja instaluje się bez błędów
- [ ] Aplikacja startuje bez crash
- [ ] Guziki są dobrze widoczne (nie za małe)
- [ ] Offline mode działa
- [ ] Rotacja ekranu działa
- [ ] Status bar nie przesłania contentu

### iOS Device
- [ ] Podłącz przez Lightning
- [ ] Zaznacz device w Xcode
- [ ] Zaloguj się Apple Developer Account
- [ ] App installs bez błędów
- [ ] App starts bez crash
- [ ] Safe area (notch) jest obsługiwany
- [ ] Offline mode działa
- [ ] Home indicator nie przeszkadza

### Emulator/Simulator
- [ ] Android Emulator: min. API 24
- [ ] iOS Simulator: min. iOS 13
- [ ] Performance jest acceptable
- [ ] Offline mode działa
- [ ] Wszystkie funkcje działają

---

## 📱 Funkcjonalność Aplikacji

### Główne Funkcje
- [ ] Wczytanie muzyki z YouTube
- [ ] Offline playback (jeśli jest)
- [ ] Search działa
- [ ] Playlists / Favorites działają
- [ ] Player controls (play/pause/next/prev)
- [ ] Volume control
- [ ] Progress bar seek

### Responsywność
- [ ] Mobile (360-480px) - OK
- [ ] Small tablet (481-768px) - OK
- [ ] Tablet (769-1024px) - OK
- [ ] Desktop (1025px+) - OK
- [ ] Landscape mode - OK

### Performance
- [ ] Aplikacja startuje < 3 sekundy
- [ ] Smooth scroll na listach
- [ ] No janky animations
- [ ] Battery usage reasonable
- [ ] No memory leaks (overnight test)

---

## 🔐 Uprawnienia & Bezpieczeństwo

### Android (`AndroidManifest.xml`)
- [ ] `android.permission.INTERNET`
- [ ] `android.permission.WRITE_EXTERNAL_STORAGE` (jeśli offline)
- [ ] `android.permission.READ_EXTERNAL_STORAGE` (jeśli offline)

### iOS (`Info.plist`)
- [ ] NSLocationWhenInUseUsageDescription (jeśli GPS)
- [ ] NSCameraUsageDescription (jeśli kamera)
- [ ] NSPhotoLibraryUsageDescription (jeśli zdjęcia)

### Network
- [ ] HTTPS połączenia
- [ ] No mixed content (HTTP + HTTPS)
- [ ] CSP headers poprawne
- [ ] CORS skonfigurowany dla API

---

## 📦 Przed Publikacją w Sklepie

### Version & Build Number
- [ ] `package.json` - version updated (np. 1.0.0)
- [ ] Android `build.gradle` - versionCode incremented
- [ ] iOS `Info.plist` - CFBundleShortVersionString updated

### Icons & Assets
- [ ] App icon 512x512px minimum
- [ ] Splash screen przygotowany (1080x1920px)
- [ ] iOS icon 1024x1024px
- [ ] Android icon vector drawable

### Screenshots
- [ ] 3-5 screenshotów (1080x1920px)
- [ ] Przedstawiają główne funkcje
- [ ] Tekst jest czytelny
- [ ] Bez osobistych danych

### Tekst & Metadane
- [ ] App name (< 50 znaków)
- [ ] Short description (< 80 znaków)
- [ ] Long description (< 4000 znaków)
- [ ] App category poprawna
- [ ] Keywords relevantne

### Tested Devices
- [ ] Minimum 3 urządzenia Android (różne rozmiary)
- [ ] iPhone 12 mini + iPhone 14 Pro Max (jeśli iOS)
- [ ] Tablet (jeśli horizontal layout)
- [ ] Różne wersje OS

---

## 🎯 Checklist Przed Release

### Finalne Testy
- [ ] QA test wszystkich funkcji
- [ ] Beta test na rzeczywistych użytkownikach
- [ ] Crash reporting configured
- [ ] Analytics configured (jeśli chcesz)
- [ ] Privacy Policy prepared

### Legal
- [ ] Terms of Service (jeśli potrzebne)
- [ ] Privacy Policy (wymagane)
- [ ] License compliance (open source libraries)
- [ ] GDPR compliant (jeśli EU)

### Dokumentacja
- [ ] MOBILE_BUILD_GUIDE.md - przeczytane
- [ ] QUICK_START_MOBILE.md - sprawdzone
- [ ] Build notes dla zespołu
- [ ] Deployment checklist

### Configuration
- [ ] Production URLs configured
- [ ] API endpoints correct
- [ ] Analytics keys updated
- [ ] Crash reporting configured

---

## ✨ Post-Launch

### Monitoring
- [ ] Crash reports monitoring
- [ ] User feedback collecting
- [ ] Performance monitoring
- [ ] Analytics tracking

### Updates
- [ ] Bug fixes dla reported issues
- [ ] Performance improvements
- [ ] Feature requests consideration
- [ ] Regular updates plan

### Support
- [ ] Help/FAQ page prepared
- [ ] Support email/contact
- [ ] Issue tracker setup
- [ ] Community forum (opcjonalnie)

---

## 🎓 Przydatne Komendy

```bash
# Budowa
npm run build              # Build web
npm run build:mobile       # Build + copy to Capacitor
npm run cap:sync           # Sync Capacitor
npm run cap:copy           # Copy web to native

# Android
npm run cap:open:android   # Open Android Studio
npm run cap:build:android  # Full build process

# iOS
npm run cap:open:ios       # Open Xcode
npm run cap:build:ios      # Full build process

# Debugging
adb logcat                 # Android logs
adb devices                # List Android devices
npm run dev                # Development server
```

---

## 📞 Troubleshooting

### Problem: "npm run cap:open:android" error
```bash
npm install -g @capacitor/cli
npx cap open android
```

### Problem: White screen w aplikacji
```bash
npm run build
npm run cap:sync
# In Android Studio: Build → Clean Build
# In Xcode: Product → Clean Build Folder
```

### Problem: "Pod install failed"
```bash
cd ios/App
pod install --repo-update
cd ../../
npm run cap:sync
```

### Problem: Emulator nie widzi aplikacji
```bash
adb kill-server
adb start-server
adb devices  # Sprawdzić czy device się pokazuje
```

---

## 🎉 Sukces!

Jeśli wszystko jest zaznaczone, aplikacja jest gotowa do publikacji! 🚀

Powodzenia! 🎵
