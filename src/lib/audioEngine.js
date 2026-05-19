/**
 * AudioEngine: Rdzeń obsługi Web Audio API. 
 * Zarządza węzłami procesora dźwięku (EQ, Bass Boost, Balans) i ich połączeniem z elementami HTML5 Audio.
 */

const STORAGE_KEY = "ap:audio-engine";
const EQ_BANDS = [60, 230, 910, 3600, 14000];

const PRESETS = {
  flat: [0, 0, 0, 0, 0],
  rock: [4, 3, -2, 3, 5],
  pop: [-1, 2, 4, 2, -1],
  jazz: [3, 2, -1, 2, 3],
  classical: [4, 3, -2, 3, 4],
  electronic: [5, 4, 0, 3, 5],
  vocal: [-2, 0, 4, 3, 0],
};

const DEFAULT_STATE = {
  enabled: false,
  preset: "flat",
  bands: [0, 0, 0, 0, 0],
  bassBoost: 0, // 0..12 dB
  balance: 0, // -1..1
};

let audioCtx = null;
let mediaSources = new WeakMap();
let chains = new WeakMap();

const subscribers = new Set();
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      bands: Array.isArray(parsed.bands) && parsed.bands.length === EQ_BANDS.length
        ? parsed.bands.map((value) => clamp(Number(value) || 0, -12, 12))
        : [...DEFAULT_STATE.bands],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function notify() {
  subscribers.forEach((handler) => {
    try {
      handler(getState());
    } catch (err) {
      console.warn("audioEngine subscriber error:", err);
    }
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ensureContext() {
  if (audioCtx) return audioCtx;
  const Ctor = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
  } catch (err) {
    console.warn("AudioContext init failed:", err);
    return null;
  }
  return audioCtx;
}

function buildChain(ctx, source) {
  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 200;
  bass.gain.value = 0;

  const filters = EQ_BANDS.map((freq, idx) => {
    const filter = ctx.createBiquadFilter();
    filter.type = idx === 0 ? "lowshelf" : idx === EQ_BANDS.length - 1 ? "highshelf" : "peaking";
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    filter.gain.value = 0;
    return filter;
  });

  let panner = null;
  if (typeof ctx.createStereoPanner === "function") {
    panner = ctx.createStereoPanner();
    panner.pan.value = 0;
  }

  const bypass = ctx.createGain();
  bypass.gain.value = 1;

  source.connect(bass);
  let prev = bass;
  filters.forEach((filter) => {
    prev.connect(filter);
    prev = filter;
  });
  if (panner) {
    prev.connect(panner);
    prev = panner;
  }
  prev.connect(bypass);
  bypass.connect(ctx.destination);

  return { source, bass, filters, panner, bypass };
}

function applyState(chain) {
  if (!chain) return;
  state.bands.forEach((gain, idx) => {
    const filter = chain.filters[idx];
    if (filter) filter.gain.value = state.enabled ? clamp(gain, -12, 12) : 0;
  });
  if (chain.bass) {
    chain.bass.gain.value = state.enabled ? clamp(state.bassBoost, 0, 12) : 0;
  }
  if (chain.panner) {
    chain.panner.pan.value = state.enabled ? clamp(state.balance, -1, 1) : 0;
  }
}

function applyAll() {
  attachedElements.forEach((el) => {
    const chain = chains.get(el);
    applyState(chain);
  });
}

const attachedElements = new Set();

export function attachMediaElement(element) {
  if (!element || !(element instanceof HTMLMediaElement)) return false;
  const ctx = ensureContext();
  if (!ctx) return false;

  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  if (mediaSources.has(element)) {
    applyState(chains.get(element));
    return true;
  }
  try {
    const source = ctx.createMediaElementSource(element);
    const chain = buildChain(ctx, source);
    mediaSources.set(element, source);
    chains.set(element, chain);
    attachedElements.add(element);
    applyState(chain);
    return true;
  } catch (err) {
    console.warn("audioEngine.attachMediaElement failed:", err.message);
    return false;
  }
}

export function getChainForElement(element) {
  const chain = chains.get(element);
  if (!chain) return null;
  return {
    context: audioCtx,
    tap: chain.bypass,
  };
}

export function detachMediaElement(element) {
  if (!element) return;
  attachedElements.delete(element);
  const chain = chains.get(element);
  if (chain) {
    try {
      chain.source.disconnect();
      chain.bass.disconnect();
      chain.filters.forEach((filter) => filter.disconnect());
      chain.panner?.disconnect();
      chain.bypass.disconnect();
    } catch {
      /* ignore */
    }
  }
  mediaSources.delete(element);
  chains.delete(element);
}

export function getState() {
  return {
    ...state,
    bands: [...state.bands],
    bandFrequencies: [...EQ_BANDS],
    presetNames: Object.keys(PRESETS).concat("custom"),
  };
}

export function subscribe(handler) {
  subscribers.add(handler);
  handler(getState());
  return () => subscribers.delete(handler);
}

export function setEnabled(enabled) {
  state = { ...state, enabled: Boolean(enabled) };
  persistState();
  applyAll();
  notify();
}

export function setPreset(name) {
  const safeName = PRESETS[name] ? name : "flat";
  state = {
    ...state,
    preset: safeName,
    bands: [...PRESETS[safeName]],
  };
  persistState();
  applyAll();
  notify();
}

export function setBand(index, value) {
  if (!Number.isInteger(index) || index < 0 || index >= EQ_BANDS.length) return;
  const next = [...state.bands];
  next[index] = clamp(Number(value) || 0, -12, 12);
  state = { ...state, bands: next, preset: matchPreset(next) };
  persistState();
  applyAll();
  notify();
}

export function setBassBoost(value) {
  state = { ...state, bassBoost: clamp(Number(value) || 0, 0, 12) };
  persistState();
  applyAll();
  notify();
}

export function setBalance(value) {
  state = { ...state, balance: clamp(Number(value) || 0, -1, 1) };
  persistState();
  applyAll();
  notify();
}

export function reset() {
  state = { ...DEFAULT_STATE, enabled: state.enabled };
  persistState();
  applyAll();
  notify();
}

function matchPreset(bands) {
  const entries = Object.entries(PRESETS);
  for (const [name, preset] of entries) {
    if (preset.every((value, idx) => Math.abs(value - bands[idx]) < 0.5)) return name;
  }
  return "custom";
}

export const EQ_BAND_LABELS = ["60Hz", "230Hz", "910Hz", "3.6kHz", "14kHz"];
export const EQ_PRESETS = Object.keys(PRESETS);
