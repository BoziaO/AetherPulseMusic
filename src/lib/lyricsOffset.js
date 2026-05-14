// AetherPulse Lyrics Offset — manualne przesunięcie synchronizacji tekstów.
//
// Dwa poziomy offsetu:
// - global: domyślny offset stosowany do wszystkich utworów (np. opóźnienie audio
//   pipeline'u wprowadzane przez EQ/Bass Boost — zwykle 0 do ~300ms).
// - per-track: indywidualne dostrojenie konkretnego utworu (gdy LRCLIB ma
//   źle zsynchronizowane teksty); przesunięcia per-track NADPISUJĄ globalny.
//
// Przechowywanie:
// - global: pojedyncza liczba `seconds` w `localStorage["ap-lyrics-offset-global"]`.
// - per-track: mapa `videoId → seconds` w `localStorage["ap-lyrics-offset-tracks"]`.
//
// Jednostka: SEKUNDY z dokładnością do 0.1s. Zakres rekomendowany: [-10, +10].

import { reactive, watch } from "vue";

const GLOBAL_KEY = "ap-lyrics-offset-global";
const TRACKS_KEY = "ap-lyrics-offset-tracks";

function readNumber(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const num = Number(raw);
    return Number.isFinite(num) ? num : fallback;
  } catch {
    return fallback;
  }
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) || fallback;
  } catch {
    return fallback;
  }
}

export const lyricsOffsetState = reactive({
  global: readNumber(GLOBAL_KEY, 0),
  perTrack: readJson(TRACKS_KEY, {}),
});

// Persist na każdej zmianie (deep watch dla perTrack)
watch(
  () => lyricsOffsetState.global,
  (value) => {
    try { localStorage.setItem(GLOBAL_KEY, String(value)); } catch { /* ignore */ }
  },
);

watch(
  () => lyricsOffsetState.perTrack,
  (value) => {
    try { localStorage.setItem(TRACKS_KEY, JSON.stringify(value)); } catch { /* ignore */ }
  },
  { deep: true },
);

/**
 * Zwraca offset (sekundy) jaki należy DODAĆ do `currentTime` przed
 * porównaniem z timestampami w syncedLyrics.
 *
 * Konwencja:
 *   visibleTime = currentTime + offset
 * Jeśli teksty wyświetlają się ZA WCZEŚNIE → offset ujemny (cofamy w czasie).
 * Jeśli teksty wyświetlają się ZA PÓŹNO → offset dodatni.
 */
export function getEffectiveOffset(videoId) {
  if (videoId && Object.prototype.hasOwnProperty.call(lyricsOffsetState.perTrack, videoId)) {
    return Number(lyricsOffsetState.perTrack[videoId]) || 0;
  }
  return Number(lyricsOffsetState.global) || 0;
}

/** Ustaw offset globalny (sekundy, zaokrąglone do 0.1). */
export function setGlobalOffset(seconds) {
  const clamped = Math.max(-10, Math.min(10, Math.round(Number(seconds) * 10) / 10));
  lyricsOffsetState.global = Number.isFinite(clamped) ? clamped : 0;
}

/** Ustaw offset dla konkretnego utworu. `null` aby usunąć i wrócić do global. */
export function setTrackOffset(videoId, seconds) {
  if (!videoId) return;
  if (seconds === null || seconds === undefined) {
    const next = { ...lyricsOffsetState.perTrack };
    delete next[videoId];
    lyricsOffsetState.perTrack = next;
    return;
  }
  const clamped = Math.max(-10, Math.min(10, Math.round(Number(seconds) * 10) / 10));
  lyricsOffsetState.perTrack = {
    ...lyricsOffsetState.perTrack,
    [videoId]: Number.isFinite(clamped) ? clamped : 0,
  };
}

/** Usuń offset per-track dla danego videoId. */
export function clearTrackOffset(videoId) {
  setTrackOffset(videoId, null);
}

/** Reset wszystkich offsetów (global + per-track). */
export function resetAllOffsets() {
  lyricsOffsetState.global = 0;
  lyricsOffsetState.perTrack = {};
}
