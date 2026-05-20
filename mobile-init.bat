@echo off
REM AetherPulse Music - Mobile Setup Script (Windows)
REM Automatycznie przygotowuje srodowisko do budowy aplikacji mobilnej

setlocal enabledelayedexpansion

echo.
echo AetherPulse Music - Setup Aplikacji Mobilnej
echo ==============================================
echo.

REM Sprawdzenie node.js
echo Sprawdzanie wymagań...
node --version >nul 2>&1
if errorlevel 1 (
    echo [BLAD] Node.js jest wymagany. Pobierz z: https://nodejs.org/
    exit /b 1
)
echo [OK] Node.js znaleziony

npm --version >nul 2>&1
if errorlevel 1 (
    echo [BLAD] npm jest wymagane
    exit /b 1
)
echo [OK] npm znaleziony

echo.
echo Instalacja zależności npm...
call npm install

echo.
echo Instalacja Capacitor CLI...
call npm install -g @capacitor/cli

echo.
echo Tworzenie budowy produktu...
call npm run build

echo.
echo Inicjalizacja Capacitor...
if not exist "capacitor.config.json" (
    echo Konfigurowanie Capacitor...
    call npx cap init com.aetherpulse.music "AetherPulse Music" --web-dir=dist
) else (
    echo [OK] Capacitor juz skonfigurowany
)

echo.
echo Dodanie platform...

if not exist "android" (
    echo Dodawanie Android...
    call npx cap add android
) else (
    echo [OK] Android juz dodany
)

if not exist "ios" (
    echo Uwaga: iOS moze byc budowany tylko na macOS
) else (
    echo [OK] iOS juz dodany
)

echo.
echo Synchronizacja Capacitor...
call npm run cap:sync

echo.
echo ==============================================
echo [SUKCES] Setup zakonczony!
echo.
echo Nastepne kroki:
echo.
echo   1. Dla Android (wymaga Android Studio):
echo      npm run cap:open:android
echo.
echo   2. Lub pełna budowa z polecenia:
echo      npm run cap:build:android
echo.
echo   3. Szczegółowe instrukcje w:
echo      MOBILE_BUILD_GUIDE.md
echo.
pause
