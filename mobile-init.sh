#!/bin/bash

# AetherPulse Music - Mobile Setup Script
# Automatycznie przygotowuje środowisko do budowy aplikacji mobilnej

set -e

echo "🎵 AetherPulse Music - Setup Aplikacji Mobilnej"
echo "=================================================="
echo ""

# Kolory do drukowania
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcje pomocnicze
print_step() {
    echo -e "${BLUE}→ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Sprawdzenie wymagań
check_requirement() {
    if command -v $1 &> /dev/null; then
        print_success "$1 zainstalowany"
        return 0
    else
        print_warning "$1 nie znaleziony"
        return 1
    fi
}

# Instalacja zależności npm
print_step "Sprawdzanie wymagań..."
check_requirement "node" || (print_error "Node.js jest wymagany"; exit 1)
check_requirement "npm" || (print_error "npm jest wymagane"; exit 1)

echo ""
print_step "Instalacja zależności npm..."
npm install

echo ""
print_step "Instalacja Capacitor CLI (globalnie)..."
npm install -g @capacitor/cli

echo ""
print_step "Tworzenie budowy produktu..."
npm run build

echo ""
print_step "Inicjalizacja Capacitor (jeśli potrzebne)..."
if [ ! -f "capacitor.config.json" ]; then
    npx cap init com.aetherpulse.music "AetherPulse Music" --web-dir=dist
else
    print_success "Capacitor już skonfigurowany"
fi

echo ""
print_step "Dodanie platform..."

if [ ! -d "android" ]; then
    print_warning "Dodaję Android..."
    npx cap add android
else
    print_success "Android już dodany"
fi

if [ ! -d "ios" ]; then
    print_warning "Dodaję iOS (dostępny tylko na macOS)..."
    npx cap add ios 2>/dev/null || print_warning "iOS setup pominięty (wymaga macOS)"
else
    print_success "iOS już dodany"
fi

echo ""
print_step "Synchronizacja Capacitor..."
npm run cap:sync

echo ""
echo "=================================================="
print_success "Setup zakończony!"
echo ""
echo "Następne kroki:"
echo ""
echo "  🤖 Dla Android:"
echo "     npm run cap:open:android"
echo "     lub"
echo "     npm run cap:build:android"
echo ""
echo "  🍎 Dla iOS (tylko macOS):"
echo "     npm run cap:open:ios"
echo "     lub"
echo "     npm run cap:build:ios"
echo ""
echo "  📖 Dokładnie opisane kroki:"
echo "     cat MOBILE_BUILD_GUIDE.md"
echo ""
