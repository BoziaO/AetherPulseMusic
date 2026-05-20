# 📱 AetherPulse Music - Przewodnik Budowy Aplikacji Mobilnej

## 🎯 Przygotowanie Projektu

Projekt został zoptymalizowany do budowy natywnych aplikacji mobilnych na Android i iOS przy użyciu Capacitor 6.

### ✅ Co zostało zoptymalizowane:
- ✓ Safe area insets dla urządzeń z notchami (wcięcie na ekranie)
- ✓ Responsywny UI dla wszystkich rozmiarów ekranu
- ✓ Powiększone przyciski dotykowe (44x44px minimum)
- ✓ Obsługa orientacji portret i krajobraz
- ✓ Optymalizacja dla OLED (czarny background #000)
- ✓ Pełna obsługa na iOS i Android

---

## 🚀 Szybki Start - Budowa Aplikacji

### 1. **Instalacja Zależności**

```bash
npm install
```

### 2. **Budowa dla Android**

```bash
# Opcja 1: Pełna budowa + otwarcie Android Studio
npm run cap:build:android

# Opcja 2: Tylko budowa
npm run build:mobile

# Opcja 3: Ręcznie
npm run build
npm run cap:copy
npm run cap:sync
npx cap open android
```

### 3. **Budowa dla iOS**

```bash
# Opcja 1: Pełna budowa + otwarcie Xcode
npm run cap:build:ios

# Opcja 2: Ręcznie
npm run build
npm run cap:copy
npm run cap:sync
npx cap open ios
```

---

## 📋 Wymagania Wstępne

### Android
- **Android Studio** (wersja 2024.1+)
- **Java Development Kit (JDK)** 17+
- **Android SDK** (API level 24+)

Instalacja: https://developer.android.com/studio

### iOS
- **Xcode** (wersja 15+)
- **macOS** (12.0+)
- **iOS Deployment Target** 13.0+

Instalacja: App Store lub https://developer.apple.com/xcode/

---

## 📦 Struktura Budowy

```
projekt/
├── dist/                    # Budowa produktu (HTML/CSS/JS)
├── android/                 # Projekt Android (utworzony przez Capacitor)
├── ios/                     # Projekt iOS (utworzony przez Capacitor)
├── src/                     # Kod źródłowy Vue
└── capacitor.config.json    # Konfiguracja Capacitor
```

---

## ⚙️ Opis Skryptów

| Skrypt | Opis |
|--------|------|
| `npm run build` | Budowanie produktu (HTML/CSS/JS) |
| `npm run build:mobile` | Budowanie produktu + kopiowanie do Capacitor |
| `npm run cap:sync` | Synchronizacja zależności Capacitor |
| `npm run cap:build:android` | Pełna budowa dla Android |
| `npm run cap:build:ios` | Pełna budowa dla iOS |
| `npm run cap:open:android` | Otwarcie Android Studio |
| `npm run cap:open:ios` | Otwarcie Xcode |

---

## 🔧 Konfiguracja Capacitor

Plik `capacitor.config.json` zawiera:

```json
{
  "appId": "com.aetherpulse.music",
  "appName": "AetherPulse Music",
  "webDir": "dist",
  "ios": {
    "contentInsetAdjustmentBehavior": "always",
    "statusBarStyle": "default",
    "statusBarBackgroundColor": "#000000"
  },
  "android": {
    "backgroundColor": "#000000",
    "uiMode": "dark",
    "allowMixedContent": true
  }
}
```

---

## 🎨 Ikon i Splash Screen

### Wymagane Wymiary:

**Android:**
- Icon: 192x192px, 512x512px (PNG)
- Splash: 1080x1920px (PNG)

**iOS:**
- Icon: 1024x1024px (PNG)
- Splash: 2732x2732px (PNG)

### Gdzie Umieścić:

```
android/app/src/main/res/
├── mipmap-hdpi/
├── mipmap-xhdpi/
├── mipmap-xxhdpi/
└── mipmap-xxxhdpi/

ios/App/App/Assets.xcassets/
├── AppIcon.appiconset/
└── LaunchImage.imageset/
```

---

## 🛠️ Proces Budowy - Szczegółowo

### Dla Android:

1. **Buduj projekt web:**
   ```bash
   npm run build
   ```

2. **Kopiuj do Capacitor:**
   ```bash
   npm run cap:copy
   ```

3. **Synchronizuj zależności:**
   ```bash
   npm run cap:sync
   ```

4. **Otwórz Android Studio:**
   ```bash
   npm run cap:open:android
   ```

5. **W Android Studio:**
   - Poczekaj na indeksowanie
   - Kliknij **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - APK będzie w: `android/app/build/outputs/apk/debug/`

### Dla iOS:

1. **Wykonaj kroki 1-3 z Android** (wspólne)

2. **Otwórz Xcode:**
   ```bash
   npm run cap:open:ios
   ```

3. **W Xcode:**
   - Wybierz swoje urządzenie lub symulator
   - Kliknij **Product** → **Build**
   - Lub: **Product** → **Archive** dla TestFlight/App Store

---

## 📱 Testowanie na Urządzeniu

### Android:
```bash
# Zmontuj urządzenie USB i:
adb devices  # Sprawdź, czy urządzenie jest widoczne
npm run cap:open:android
# Zmień Build Variant na "debug" (lewy panel)
# Kliknij Play (▶)
```

### iOS:
```bash
# Zarejestruj urządzenie w Apple Developer
# Otwórz Xcode i skonfiguruj signing
# Zmień scheme na swoje urządzenie
# Kliknij Play (▶)
```

---

## 🐛 Rozwiązywanie Problemów

### Problem: "Capacitor not installed"
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

### Problem: "Android Studio nie widzi projektu"
```bash
# Otwórz folder android/ jako projekt
File → Open → android/
```

### Problem: "iOS build fails"
```bash
cd ios/App
pod install
cd ../../
npm run cap:open:ios
```

### Problem: "White screen w aplikacji"
- Sprawdź: `capacitor.config.json` → `webDir` wskazuje na `dist`
- Uruchom: `npm run build` ponownie
- Uruchom: `npm run cap:sync`

### Problem: "Brak dostępu do danych offline"
- Android: Dodaj do `android/app/src/main/AndroidManifest.xml`:
  ```xml
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  ```

---

## 📊 Optymalizacje Mobilne

### Safe Area Insets
CSS automatycznie obsługuje:
- Notches (wcięcia) na ekranie
- Home Indicator na iOS
- Zaokrąglone rogi

### Responsywność
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Orientacja
- Portret: Domyślnie
- Krajobraz: Obsługiwane z zmianami layoutu

---

## 📈 Release - Publikacja w Sklepach

### Google Play Store:
1. Stwórz Google Play Developer Account
2. Buduj release APK/AAB w Android Studio
3. Załaduj do Google Play Console
4. Skonfiguruj listing, screenshoty, opis
5. Wysłań do recenzji

### Apple App Store:
1. Stwórz Apple Developer Account
2. Stwórz App ID i certyfikaty
3. Buduj archive w Xcode
4. Załaduj przez Xcode lub Transporter
5. Skonfiguruj listing na App Store Connect
6. Wysłań do recenzji

---

## 📚 Przydatne Linki

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

---

## ✨ Checklist Pre-Release

- [ ] Testuj na rzeczywistych urządzeniach
- [ ] Sprawdź offline mode
- [ ] Przetestuj wszystkie główne funkcje
- [ ] Sprawdź ikony i splash screen
- [ ] Sprawdź uprawnienia na Android/iOS
- [ ] Zaktualizuj `version` w `package.json`
- [ ] Zaktualizuj `capacitor.config.json` jeśli trzeba
- [ ] Zrób screenshoty dla sklepów
- [ ] Napraw wszystkie aktualne problemy

---

## 🎓 Zaawansowane

### Plugins Capacitor
Dostępne wtyczki do dodania:
- `@capacitor/camera` - dostęp do aparatu
- `@capacitor/geolocation` - lokalizacja
- `@capacitor/filesystem` - system plików
- `@capacitor/device` - informacje urządzenia

Dodaj: `npm install @capacitor/nazwa`

### Wersjonowanie
Zaktualizuj w obu miejscach:
- `package.json` - `version`
- `capacitor.config.json` - przy potrzebie

### Debugging
```bash
# Chrome DevTools dla Android
chrome://inspect/#devices

# Safari dla iOS
Safari Menu → Develop → [device]
```

---

Powodzenia w budowie aplikacji! 🚀

Jeśli masz pytania, sprawdź dokumentację Capacitor lub community forum.
