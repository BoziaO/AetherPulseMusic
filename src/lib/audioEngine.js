// AetherPulse Audio Engine
// Centralna obsługa Web Audio API dla equalizera, Bass Boost, balansu i wizualizera.
// Hookuje się do dowolnego HTMLMediaElement (audio/video) — głównie w celu obsługi
// pobranych utworów odtwarzanych przez <audio>. Dla iframe YouTube efekty są
// stosowane "best-effort" (cross-origin może uniemożliwić routowanie audio przez
// AudioContext, w takim wypadku zachowywany jest oryginalny strumień).

const STORAGE_KEY = "ap:audio-engine";
const EQ_BANDS = [60, 230, 910, 3600, 14000]; // Hz, klasyczny 5-band EQ

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
let mediaSources = new WeakMap(); // Map<HTMLMediaElement, MediaElementAudioSourceNode>
let chains = new WeakMap(); // Map<HTMLMediaElement, ChainNodes>

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
    /* quota exceeded — silently skip */
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
  // bass boost (lowshelf @ 200Hz)
  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 200;
  bass.gain.value = 0;

  // 5-band peaking EQ
  const filters = EQ_BANDS.map((freq, idx) => {
    const filter = ctx.createBiquadFilter();
    filter.type = idx === 0 ? "lowshelf" : idx === EQ_BANDS.length - 1 ? "highshelf" : "peaking";
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    filter.gain.value = 0;
    return filter;
  });

  // stereo balance via StereoPannerNode (fallback do GainNode jeśli niedostępny)
  let panner = null;
  if (typeof ctx.createStereoPanner === "function") {
    panner = ctx.createStereoPanner();
    panner.pan.value = 0;
  }

  // bypass gain — pozwala szybko wyciszyć łańcuch bez przerywania routingu
  const bypass = ctx.createGain();
  bypass.gain.value = 1;

  // Połączenie: source → bass → eq[0..n] → (panner) → bypass → destination
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
  // EQ pasma
  state.bands.forEach((gain, idx) => {
    const filter = chain.filters[idx];
    if (filter) filter.gain.value = state.enabled ? clamp(gain, -12, 12) : 0;
  });
  // Bass boost
  if (chain.bass) {
    chain.bass.gain.value = state.enabled ? clamp(state.bassBoost, 0, 12) : 0;
  }
  // Balans
  if (chain.panner) {
    chain.panner.pan.value = state.enabled ? clamp(state.balance, -1, 1) : 0;
  }
}

function applyAll() {
  // WeakMap nie iterowalna — tylko aktywne mediaSources
  // Polegamy na tym, że attach utrzymuje chains aż element zostanie GC.
  // Nie da się iterować po wszystkich, ale przy każdej zmianie stanu wystarczy
  // przejść przez listę aktywnych elementów (zarządzaną oddzielnie).
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
  if (mediaSources.has(element)) {
    // już podłączony — tylko reaplikuj stan
    applyState(chains.get(element));
    return true;
  }
  try {
    // Resume context po user gesture (Chrome wymaga aktywacji)
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const source = ctx.createMediaElementSource(element);
    const chain = buildChain(ctx, source);
    mediaSources.set(element, source);
    chains.set(element, chain);
    attachedElements.add(element);
    applyState(chain);
    return true;
  } catch (err) {
    // Najczęstszy błąd: element już podłączony do innego AudioContext
    // (np. createMediaElementSource już został wywołany).
    console.warn("audioEngine.attachMediaElement failed:", err.message);
    return false;
  }
}

// Zwraca AudioContext + ostatni node łańcucha dla danego elementu (do silence detection).
export function getChainForElement(element) {
  const chain = chains.get(element);
  if (!chain) return null;
  return {
    context: audioCtx,
    // bypass to ostatni node przed destination — bezpieczne miejsce na analyser
    tap: chain.bypass,
  };
}

export function detachMediaElement(element) {
  if (!element) return;
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
  attachedElements.delete(element);
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
