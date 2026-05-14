// Zarządzanie jakością audio + detekcja sieci.
// Mapuje user-friendly poziomy jakości na YouTube IFrame `setPlaybackQuality()`.
// Automatycznie obniża jakość gdy `navigator.connection.type` = "cellular".

import { reactive, watch } from "vue";

const STORAGE_KEY = "ap:audio-quality";

const DEFAULTS = {
  wifi: "high", // low | medium | high | auto
  cellular: "medium",
  default: "auto",
};

// Mapowanie naszych poziomów na klucze YT IFrame API
const YT_QUALITY_MAP = {
  low: "small",
  medium: "medium",
  high: "hd720",
  auto: "default",
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* skip */
  }
}

const settings = reactive(load());
const network = reactive({
  type: detectNetwork(),
  saveData: false,
  effectiveType: null,
});

watch(settings, persist, { deep: true });

function detectNetwork() {
  if (typeof navigator === "undefined") return "unknown";
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return "unknown";
  if (conn.type === "wifi" || conn.type === "ethernet") return "wifi";
  if (conn.type === "cellular") return "cellular";
  // Heurystyka: jeżeli effectiveType < 4g, traktuj jak cellular
  if (conn.effectiveType && conn.effectiveType !== "4g") return "cellular";
  return "wifi";
}

function syncNetwork() {
  if (typeof navigator === "undefined") return;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  network.type = detectNetwork();
  network.saveData = Boolean(conn?.saveData);
  network.effectiveType = conn?.effectiveType || null;
}

if (typeof navigator !== "undefined") {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn?.addEventListener) {
    conn.addEventListener("change", syncNetwork);
  }
  syncNetwork();
}

export function getEffectiveQuality() {
  // Save-Data włączone → wymuś low
  if (network.saveData) return "low";
  if (network.type === "cellular") {
    return settings.cellular === "auto" ? "medium" : settings.cellular;
  }
  if (network.type === "wifi") {
    return settings.wifi === "auto" ? "high" : settings.wifi;
  }
  return settings.default === "auto" ? "medium" : settings.default;
}

export function getYouTubeQuality() {
  return YT_QUALITY_MAP[getEffectiveQuality()] || "default";
}

export function applyToYouTubePlayer(ytPlayer) {
  if (!ytPlayer || typeof ytPlayer.setPlaybackQuality !== "function") return;
  try {
    ytPlayer.setPlaybackQuality(getYouTubeQuality());
  } catch {
    /* iframe not ready */
  }
}

export function setQuality(scope, value) {
  if (!["wifi", "cellular", "default"].includes(scope)) return;
  const allowed = ["low", "medium", "high", "auto"];
  if (!allowed.includes(value)) return;
  settings[scope] = value;
}

export function getSettings() {
  return { ...settings };
}

export function getNetworkInfo() {
  return { ...network };
}

export { settings, network };
