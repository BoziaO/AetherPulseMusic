// SponsorBlock — auto-skip dla segmentów reklamowych/intro/outro.
// Backend (`/api/ytmusic/song/:id`) dostarcza `sponsorSegments` z kategorią
// (`sponsor`, `intro`, `selfpromo`, …) i zakresem czasowym `segment: [start, end]`.

import { reactive } from "vue";

const STORAGE_KEY = "ap:sponsorblock";

// Kategorie obsługiwane przez SponsorBlock — kolory dla wizualizacji.
export const SPONSOR_CATEGORIES = [
  { id: "sponsor",    color: "#00d400", labelKey: "sponsorCatSponsor" },
  { id: "selfpromo",  color: "#ffff00", labelKey: "sponsorCatSelfPromo" },
  { id: "intro",      color: "#00ffff", labelKey: "sponsorCatIntro" },
  { id: "outro",      color: "#0202ed", labelKey: "sponsorCatOutro" },
  { id: "interaction", color: "#cc00ff", labelKey: "sponsorCatInteraction" },
  { id: "music_offtopic", color: "#ff9900", labelKey: "sponsorCatMusicOfftopic" },
  { id: "filler",     color: "#7300ff", labelKey: "sponsorCatFiller" },
];

const DEFAULT_SETTINGS = {
  enabled: true,
  // Mapa kategoria -> action: "skip" | "mark" | "off"
  categories: {
    sponsor: "skip",
    selfpromo: "skip",
    intro: "mark",
    outro: "mark",
    interaction: "mark",
    music_offtopic: "skip",
    filler: "off",
  },
};

export const sponsorSettings = reactive({ ...DEFAULT_SETTINGS, categories: { ...DEFAULT_SETTINGS.categories } });

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    sponsorSettings.enabled = Boolean(parsed.enabled ?? DEFAULT_SETTINGS.enabled);
    sponsorSettings.categories = { ...DEFAULT_SETTINGS.categories, ...(parsed.categories || {}) };
  } catch {
    /* ignore */
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sponsorSettings));
  } catch { /* ignore */ }
}

export function setSponsorEnabled(enabled) {
  sponsorSettings.enabled = Boolean(enabled);
  persist();
}

export function setSponsorCategory(category, action) {
  if (!sponsorSettings.categories.hasOwnProperty(category)) return;
  if (!["skip", "mark", "off"].includes(action)) return;
  sponsorSettings.categories[category] = action;
  persist();
}

loadSettings();

// ----------------------------------------------------------------------
// Skip logic
// ----------------------------------------------------------------------

/**
 * Sprawdza czy `currentTime` mieści się wewnątrz segmentu, którego kategoria
 * ma akcję "skip". Zwraca koniec segmentu (czas do skoku) lub null.
 */
export function findSegmentToSkip(segments, currentTime) {
  if (!sponsorSettings.enabled || !Array.isArray(segments)) return null;
  for (const seg of segments) {
    if (!seg || !Array.isArray(seg.segment) || seg.segment.length < 2) continue;
    const [start, end] = seg.segment;
    if (typeof start !== "number" || typeof end !== "number") continue;
    if (currentTime + 0.3 < start || currentTime > end) continue;
    const action = sponsorSettings.categories[seg.category] || "off";
    if (action === "skip") return { end, segment: seg };
  }
  return null;
}

export function getCategoryColor(categoryId) {
  return SPONSOR_CATEGORIES.find((c) => c.id === categoryId)?.color || "var(--primary)";
}

export function getCategoryAction(categoryId) {
  return sponsorSettings.categories[categoryId] || "off";
}
