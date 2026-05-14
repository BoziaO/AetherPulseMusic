// AetherPulse Library Sync — czyszczenie lokalnych referencji do utworów
// usuniętych z YouTube. Utwory mogą zniknąć:
// - usunięty przez właściciela kanału,
// - zablokowany regionalnie,
// - prywatny,
// - zablokowany za naruszenie praw autorskich (DMCA).
//
// Strategia:
// - Lazy check: gdy backend zwraca 404/410 lub `availability: "removed"` przy
//   `/api/ytmusic/song/:id`, oznaczamy track jako `unavailable: true`
//   i dodajemy do listy "graveyard" w localStorage.
// - W tle aplikacja może okresowo (raz na 7 dni) sprawdzić wszystkie
//   ulubione/historię i wyczyścić martwe wpisy.
// - Użytkownik może w dowolnej chwili kliknąć "Wyczyść niedostępne" w Settings.

import { fetchJson } from "./api";

const GRAVEYARD_KEY = "ap:library-graveyard";
const LAST_SCAN_KEY = "ap:library-last-scan";
const SCAN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni

function readGraveyard() {
  try {
    const raw = localStorage.getItem(GRAVEYARD_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistGraveyard(set) {
  try {
    localStorage.setItem(GRAVEYARD_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

/** Oznacz utwór jako niedostępny (np. po wykryciu 404). */
export function markUnavailable(videoId) {
  if (!videoId) return;
  const grave = readGraveyard();
  grave.add(videoId);
  persistGraveyard(grave);
}

/** Sprawdź czy utwór jest oznaczony jako niedostępny. */
export function isUnavailable(videoId) {
  if (!videoId) return false;
  return readGraveyard().has(videoId);
}

/** Pobierz listę wszystkich niedostępnych ID. */
export function getUnavailableIds() {
  return [...readGraveyard()];
}

/** Wyczyść listę niedostępnych (po faktycznym usunięciu z biblioteki). */
export function clearUnavailable(videoIds) {
  const grave = readGraveyard();
  if (Array.isArray(videoIds)) {
    videoIds.forEach((id) => grave.delete(id));
  } else {
    grave.clear();
  }
  persistGraveyard(grave);
}

/**
 * Skanuje listę utworów (np. favorites) — sprawdza po 5 na raz aby nie
 * uderzać w API. Zwraca listę ID które zostały oznaczone jako niedostępne.
 */
export async function scanLibrary(tracks, { batchSize = 5, onProgress } = {}) {
  if (!Array.isArray(tracks) || !tracks.length) return [];
  const removed = [];
  for (let i = 0; i < tracks.length; i += batchSize) {
    const batch = tracks.slice(i, i + batchSize);
    await Promise.all(batch.map(async (track) => {
      if (!track?.videoId) return;
      try {
        const data = await fetchJson(
          `/api/ytmusic/song/${encodeURIComponent(track.videoId)}`,
          { timeout: 8000, retry: { attempts: 1 } },
        );
        if (!data || data.availability === "removed" || data.error === "not_found") {
          markUnavailable(track.videoId);
          removed.push(track.videoId);
        }
      } catch (err) {
        // 404 z fetchJson rzuci Error("HTTP 404 ...")
        if (/40[049]/.test(err?.message || "")) {
          markUnavailable(track.videoId);
          removed.push(track.videoId);
        }
        // Inne błędy (network) — ignorujemy, spróbujemy następnym razem.
      }
    }));
    onProgress?.({ checked: Math.min(i + batchSize, tracks.length), total: tracks.length });
  }
  try { localStorage.setItem(LAST_SCAN_KEY, String(Date.now())); } catch { /* ignore */ }
  return removed;
}

/**
 * Sprawdza czy minął interval między skanami — wywoływać przy starcie aplikacji.
 */
export function shouldRunBackgroundScan() {
  try {
    const last = Number(localStorage.getItem(LAST_SCAN_KEY) || 0);
    return Date.now() - last > SCAN_INTERVAL_MS;
  } catch {
    return false;
  }
}

/**
 * Filtruje listę usuwając wpisy oznaczone jako niedostępne.
 * Użyteczne dla `recentPlays` / `favorites` — UI nie pokaże martwych utworów.
 */
export function filterAvailable(tracks) {
  if (!Array.isArray(tracks)) return tracks;
  const grave = readGraveyard();
  return tracks.filter((t) => t?.videoId && !grave.has(t.videoId));
}
