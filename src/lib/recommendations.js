// AetherPulse — lokalny silnik rekomendacji
// Generuje podpowiedzi na podstawie historii odsłuchów + ulubionych z localStorage,
// kontekstu pory dnia oraz heurystyk wokół tytułu/artysty.

import { trackKey } from "./format";

const HISTORY_WINDOW = 50; // ostatnie N odtworzeń branych pod uwagę
const DAILY_MIX_COUNT = 3;
const DAILY_MIX_SIZE = 18;

const TIME_BUCKETS = [
  { id: "morning", from: 5, to: 11, labelKey: "morningMood", keywords: ["energy", "morning", "energia", "wake", "fresh"] },
  { id: "afternoon", from: 11, to: 17, labelKey: "afternoonMood", keywords: ["chill", "lofi", "lo-fi", "study", "spokojnie"] },
  { id: "evening", from: 17, to: 22, labelKey: "eveningMood", keywords: ["sunset", "vibes", "relax", "wieczór"] },
  { id: "night", from: 22, to: 5, labelKey: "nightMood", keywords: ["night", "dark", "sleep", "ambient", "noc"] },
];

function bucketForHour(hour) {
  return TIME_BUCKETS.find((bucket) => {
    if (bucket.from < bucket.to) return hour >= bucket.from && hour < bucket.to;
    return hour >= bucket.from || hour < bucket.to; // np. nocna 22..5
  }) || TIME_BUCKETS[0];
}

export function getCurrentTimeBucket(now = new Date()) {
  return bucketForHour(now.getHours());
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeArtist(track) {
  const raw = track?.artist || track?.author || track?.subtitle || "";
  return String(raw).split(/[,&·•]/)[0].trim().toLowerCase();
}

function tokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9ąćęłńóśźż\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

// Tokeny z tytułu + tagi gatunkowe (gdy obecne)
function trackTokens(track) {
  const set = new Set();
  tokens(track?.title).forEach((token) => set.add(token));
  tokens(track?.album?.name || track?.detail).forEach((token) => set.add(token));
  if (Array.isArray(track?.tags)) track.tags.forEach((tag) => set.add(String(tag).toLowerCase()));
  return Array.from(set);
}

// ----------------------------------------------------------------------
// Profil użytkownika
// ----------------------------------------------------------------------

export function buildProfile({ history = [], favorites = [] } = {}) {
  const recent = safeArray(history).slice(0, HISTORY_WINDOW);
  const favoriteList = safeArray(favorites);

  const artistScore = new Map();
  const tokenScore = new Map();
  const playedKeys = new Set();

  function bump(map, key, delta) {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + delta);
  }

  recent.forEach((track, idx) => {
    const weight = 1 - idx / (HISTORY_WINDOW * 1.2); // świeższe odsłuchy więcej znaczą
    bump(artistScore, normalizeArtist(track), 1.0 * weight);
    trackTokens(track).forEach((token) => bump(tokenScore, token, 0.6 * weight));
    playedKeys.add(trackKey(track));
  });

  favoriteList.forEach((track) => {
    bump(artistScore, normalizeArtist(track), 1.4);
    trackTokens(track).forEach((token) => bump(tokenScore, token, 0.8));
    playedKeys.add(trackKey(track));
  });

  return {
    artistScore,
    tokenScore,
    playedKeys,
    historyCount: recent.length,
    favoritesCount: favoriteList.length,
  };
}

// ----------------------------------------------------------------------
// Score kandydatów
// ----------------------------------------------------------------------

export function scoreTracks(candidates, profile, options = {}) {
  if (!profile) return [];
  const list = safeArray(candidates);
  if (!list.length) return [];

  const excludePlayed = options.excludePlayed !== false;
  const noveltyBonus = Number(options.noveltyBonus) || 0; // 0..1 dodatkowy bonus dla niegranych
  const contextTokens = new Set(safeArray(options.contextTokens));

  return list
    .filter((track) => track && (excludePlayed ? !profile.playedKeys.has(trackKey(track)) : true))
    .map((track) => {
      const artist = normalizeArtist(track);
      let score = (profile.artistScore.get(artist) || 0) * 1.6;
      const trackTok = trackTokens(track);
      trackTok.forEach((token) => {
        score += (profile.tokenScore.get(token) || 0) * 0.5;
        if (contextTokens.has(token)) score += 0.8;
      });
      if (!profile.playedKeys.has(trackKey(track))) score += noveltyBonus;
      return { track, score };
    })
    .filter((entry) => entry.score > 0 || noveltyBonus > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.track);
}

// ----------------------------------------------------------------------
// Generatory zestawów rekomendacji
// ----------------------------------------------------------------------

function uniqueByKey(list) {
  const seen = new Set();
  const out = [];
  list.forEach((item) => {
    const key = trackKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

function shuffle(list, seed = 1) {
  const out = [...list];
  let pseudo = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    pseudo = (pseudo * 9301 + 49297) % 233280;
    const j = Math.floor((pseudo / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildDailyMixes({ history = [], favorites = [], pool = [] } = {}) {
  const profile = buildProfile({ history, favorites });
  if (!profile.historyCount && !profile.favoritesCount) return [];
  if (!pool.length) {
    // Brak puli zewnętrznej — buduj mixy z historii/ulubionych
    const seedDate = new Date().getDate();
    const base = uniqueByKey([...favorites, ...history]);
    return Array.from({ length: DAILY_MIX_COUNT }).map((_, idx) => ({
      id: `daily-${idx}`,
      title: `Mix ${idx + 1}`,
      tracks: shuffle(base, seedDate + idx).slice(0, DAILY_MIX_SIZE),
    }));
  }
  const ranked = scoreTracks(pool, profile, { excludePlayed: true, noveltyBonus: 0.4 });
  const seedDate = new Date().getDate();
  return Array.from({ length: DAILY_MIX_COUNT }).map((_, idx) => ({
    id: `daily-${idx}`,
    title: `Mix ${idx + 1}`,
    tracks: shuffle(ranked, seedDate + idx).slice(0, DAILY_MIX_SIZE),
  }));
}

export function buildContextual({ history = [], favorites = [], pool = [], now = new Date() } = {}) {
  const bucket = getCurrentTimeBucket(now);
  const profile = buildProfile({ history, favorites });
  if (!pool.length) {
    return {
      bucket,
      tracks: [...favorites, ...history]
        .filter((track) => trackTokens(track).some((token) => bucket.keywords.includes(token)))
        .slice(0, 18),
    };
  }
  return {
    bucket,
    tracks: scoreTracks(pool, profile, {
      excludePlayed: true,
      noveltyBonus: 0.3,
      contextTokens: bucket.keywords,
    }).slice(0, 18),
  };
}

// "Powrót do starych hitów" — szukaj utworów słuchanych dawno temu, ale często
export function buildRetroHits({ history = [], minPlays = 1 } = {}) {
  const counts = new Map();
  const meta = new Map();
  const stamps = new Map();

  safeArray(history).forEach((track) => {
    const key = trackKey(track);
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!meta.has(key)) meta.set(key, track);
    const date = track.playedAt ? Date.parse(track.playedAt) : 0;
    stamps.set(key, Math.max(stamps.get(key) || 0, date || 0));
  });

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const ranked = Array.from(counts.entries())
    .filter(([, count]) => count >= minPlays)
    .map(([key, count]) => {
      const stamp = stamps.get(key) || 0;
      const ageDays = stamp > 0 ? (now - stamp) / dayMs : 30;
      const score = count * Math.log10(Math.max(ageDays, 1) + 1);
      return { key, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => meta.get(entry.key))
    .filter(Boolean);

  return ranked.slice(0, 18);
}

// "Smart Radio" — generuj nasiona dla watch playlist
export function pickSmartRadioSeed({ history = [], favorites = [] } = {}) {
  const list = uniqueByKey([...favorites, ...history]);
  for (const track of list) {
    if (track?.videoId) return track;
  }
  return null;
}

export function summarizeProfile(profile) {
  if (!profile) return null;
  const topArtists = Array.from(profile.artistScore.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([artist, score]) => ({ artist, score }));
  return { topArtists };
}
