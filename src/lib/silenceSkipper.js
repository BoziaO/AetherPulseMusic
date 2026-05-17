// Silence Skipper — analizuje strumień audio przez AnalyserNode (RMS),
// wykrywa ciszę poniżej progu i wywołuje callback gdy trwa wystarczająco długo.
// Działa wyłącznie dla HTMLMediaElement podpiętych do AudioContext.
// (W trybie YouTube iframe cross-origin nie da się analizować strumienia.)

import { reactive } from "vue";

const STORAGE_KEY = "ap:silence-skipper";

const DEFAULT_SETTINGS = {
  enabled: false,
  thresholdDb: -45, // poziom ciszy (dB)
  minSilenceMs: 1500, // minimalny czas ciszy aby pomijać
};

export const silenceSettings = reactive({ ...DEFAULT_SETTINGS });

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(silenceSettings, DEFAULT_SETTINGS, parsed);
  } catch {
    /* ignore */
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(silenceSettings));
  } catch { /* ignore */ }
}

export function updateSilenceSettings(patch = {}) {
  Object.assign(silenceSettings, patch);
  persist();
}

loadSettings();

// ----------------------------------------------------------------------
// Detector
// ----------------------------------------------------------------------

let analyser = null;
let dataArray = null;
let rafId = null;
let mediaCtx = null;
let activeElement = null;
let lastSilentSince = null;
let onSkipCallback = null;

function dbFromRms(rms) {
  if (rms <= 0) return -Infinity;
  return 20 * Math.log10(rms);
}

function tick() {
  if (!analyser || !activeElement) {
    rafId = null;
    return;
  }

  // Skip analysis entirely when disabled — saves ~60 getFloatTimeDomainData calls/sec
  if (!silenceSettings.enabled || activeElement.paused || activeElement.ended) {
    lastSilentSince = null;
    rafId = window.requestAnimationFrame(tick);
    return;
  }

  analyser.getFloatTimeDomainData(dataArray);
  let sumSquares = 0;
  for (let i = 0; i < dataArray.length; i += 1) sumSquares += dataArray[i] * dataArray[i];
  const rms = Math.sqrt(sumSquares / dataArray.length);
  const db = dbFromRms(rms);

  if (db < silenceSettings.thresholdDb) {
    if (lastSilentSince == null) lastSilentSince = performance.now();
    const elapsed = performance.now() - lastSilentSince;
    if (elapsed >= silenceSettings.minSilenceMs) {
      lastSilentSince = null;
      try {
        onSkipCallback?.({ db, durationMs: elapsed });
      } catch (err) {
        console.warn("silenceSkipper callback error:", err);
      }
    }
  } else {
    lastSilentSince = null;
  }

  rafId = window.requestAnimationFrame(tick);
}

/**
 * Inicjalizuje detektor dla danego elementu i AudioContext.
 * @param {HTMLMediaElement} element
 * @param {AudioContext} ctx
 * @param {AudioNode} sourceNode — node przed `destination`, do którego podpinamy AnalyserNode równolegle
 */
export function attachSilenceDetector(element, ctx, sourceNode) {
  detachSilenceDetector();
  if (!element || !ctx || !sourceNode) return false;
  try {
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.5;
    dataArray = new Float32Array(analyser.fftSize);
    // Równoległe podłączenie — analyser nie przerywa łańcucha audio
    sourceNode.connect(analyser);
    activeElement = element;
    mediaCtx = ctx;
    if (rafId == null) rafId = window.requestAnimationFrame(tick);
    return true;
  } catch (err) {
    console.warn("attachSilenceDetector failed:", err.message);
    detachSilenceDetector();
    return false;
  }
}

export function detachSilenceDetector() {
  if (rafId != null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (analyser) {
    try { analyser.disconnect(); } catch { /* ignore */ }
  }
  analyser = null;
  dataArray = null;
  activeElement = null;
  mediaCtx = null;
  lastSilentSince = null;
}

export function setSkipCallback(callback) {
  onSkipCallback = typeof callback === "function" ? callback : null;
}
