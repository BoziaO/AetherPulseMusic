import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchJson } from '../lib/api';

const LanguageContext = createContext();
const translations = {
  en: {
    navExplore: "Explore",
    navLibrary: "Library",
    home: "Home",
    discover: "Discover",
    favorites: "Favorites",
    history: "History",
    playlists: "Playlists",
    albums: "Albums",
    artists: "Artists",
    settings: "Settings",
    visualPresets: "Visual Presets",
    accentColor: "Accent Color",
    language: "Language",
    glassEffects: "Glass Effects",
    tools: "Tools",
    resetVisual: "Reset visual settings",
    clearQueues: "Clear saved queues",
    personalize: "Personalize your experience",
    customHex: "Custom Hex Code",
    blurIntensity: "Blur Intensity",
    transparency: "Transparency",
    notifications: "Notifications",
    clear: "Clear",
    noNotifications: "No notifications.",
    close: "Close",
    revolutionFlowComposer: "Revolution Flow Composer",
    revolutionFlowDesc: "Creates a 3-act session: warm-up, peak and landing. Adapts to your taste and discovery level.",
    newListeningMode: "New Listening Mode",
    sessionLength: "Session length",
    discoveryLevel: "Discovery level",
    generateFlow: "Generate Flow",
    playFlow: "Play Flow",
    tracksInSession: "tracks in session",
    moreMusic: "More music",
    viewAll: "View all",
    playAll: "Play All",
    tracks: "Tracks",
    items: "items",
    forYouMusic: "Music for You",
    moodSad: "Sad",
    moodCalm: "Calm",
    moodFlow: "Flow",
    moodEnergy: "Energy",
    moodLightning: "Lightning",
    queuePlayback: "Playback Queue",
    queueEmpty: "Queue is empty",
    saveQueue: "Save this queue",
    queueName: "Queue name...",
    save: "Save",
    removeFromQueue: "Remove from queue",
    lyrics: "Lyrics",
    unknownArtist: "Unknown artist",
    lyricsSettings: "Settings",
    lyricsFontSize: "Font size",
    lyricsLineSpacing: "Line spacing",
    lyricsAutoScroll: "Auto-scroll",
    lyricsBackground: "Lyrics background",
    searchingLyrics: "Searching lyrics...",
    noLyricsAvailable: "No lyrics available",
    syncedActive: "Sync active",
    staticLyrics: "Static lyrics",
    queueSaved: "Queue saved successfully.",
    visualPulse: "Visual Pulse",
    visualPulseDesc: "A living weather map for your music session.",
    cloudLayer: "Cloud layer",
    lightningChance: "Lightning chance",
    calm: "Calm",
    medium: "Medium",
    intense: "Intense",
  },
  pl: {
    navExplore: "Odkrywaj",
    navLibrary: "Biblioteka",
    home: "Główna",
    discover: "Odkrywaj",
    favorites: "Ulubione",
    history: "Historia",
    playlists: "Playlisty",
    albums: "Albumy",
    artists: "Wykonawcy",
    settings: "Ustawienia",
    visualPresets: "Motywy wizualne",
    accentColor: "Kolor akcentu",
    language: "Język",
    glassEffects: "Efekty szkła",
    tools: "Narzędzia",
    resetVisual: "Resetuj ustawienia wyglądu",
    clearQueues: "Wyczyść zapisane kolejki",
    personalize: "Dopasuj aplikację do siebie",
    customHex: "Własny kod HEX",
    blurIntensity: "Siła rozmycia",
    transparency: "Przezroczystość",
    notifications: "Powiadomienia",
    clear: "Wyczyść",
    noNotifications: "Brak powiadomień.",
    close: "Zamknij",
    revolutionFlowComposer: "Revolution Flow Composer",
    revolutionFlowDesc: "Tworzy sesję w 3 aktach: wejście, peak i lądowanie. Dopasowuje do Ciebie i poziomu odkrywania.",
    newListeningMode: "Nowy tryb słuchania",
    sessionLength: "Długość sesji",
    discoveryLevel: "Poziom odkrywania",
    generateFlow: "Wygeneruj Flow",
    playFlow: "Odtwórz Flow",
    tracksInSession: "utworów w sesji",
    moreMusic: "Więcej muzyki",
    viewAll: "Zobacz wszystkie",
    playAll: "Odtwórz wszystko",
    tracks: "Utwory",
    items: "elementów",
    forYouMusic: "Muzyka dla Ciebie",
    moodSad: "Smutne",
    moodCalm: "Spokojne",
    moodFlow: "Flow",
    moodEnergy: "Energia",
    moodLightning: "Piorun",
    queuePlayback: "Kolejka odtwarzania",
    queueEmpty: "Kolejka jest pusta",
    saveQueue: "Zapisz tę kolejkę",
    queueName: "Nazwa kolejki...",
    save: "Zapisz",
    removeFromQueue: "Usuń z kolejki",
    lyrics: "Napisy",
    unknownArtist: "Nieznany wykonawca",
    lyricsSettings: "Ustawienia",
    lyricsFontSize: "Rozmiar tekstu",
    lyricsLineSpacing: "Odstęp między wersami",
    lyricsAutoScroll: "Automatyczne przewijanie",
    lyricsBackground: "Tło napisów",
    searchingLyrics: "Szukanie napisów...",
    noLyricsAvailable: "Brak dostępnych napisów",
    syncedActive: "Synchronizacja aktywna",
    staticLyrics: "Napisy statyczne",
    queueSaved: "Kolejka zapisana pomyślnie.",
    visualPulse: "Visual Pulse",
    visualPulseDesc: "Żywa mapa pogodowa Twojej sesji muzycznej.",
    cloudLayer: "Warstwa chmur",
    lightningChance: "Szansa na pioruny",
    calm: "Spokojnie",
    medium: "Średnio",
    intense: "Mocno",
  },
};

export const LanguageProvider = ({ children }) => {
  const backendHydratedRef = useRef(false);
  const lastPersistedLanguageRef = useRef("");
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app-language') || 'en'; // Default to English
  });

  useEffect(() => {
    let cancelled = false;
    fetchJson('/api/user/state', { timeout: 4000 })
      .then((state) => {
        if (!cancelled && (state?.language === 'en' || state?.language === 'pl')) {
          lastPersistedLanguageRef.current = state.language;
          setLanguage(state.language);
        }
      })
      .catch((err) => console.warn('Could not hydrate language:', err.message))
      .finally(() => {
        if (!cancelled) backendHydratedRef.current = true;
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.lang = language;
    if (!backendHydratedRef.current || language === lastPersistedLanguageRef.current) return;
    lastPersistedLanguageRef.current = language;
    fetchJson('/api/user/state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
      timeout: 4000,
    }).catch((err) => console.warn('Could not persist language:', err.message));
  }, [language]);

  const t = (key) => {
    const table = translations[language] || translations.en;
    return table[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
