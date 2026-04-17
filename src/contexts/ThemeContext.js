import React, { createContext, useContext, useEffect, useState } from "react";

export const PRESET_THEMES = {
  dark: {
    name: "Ciemny",
    vars: {
      "--bg-main": "#050816",
      "--bg-sidebar": "#0b1020",
      "--bg-panel": "#10172a",
      "--bg-card": "#151f35",
      "--bg-card-hover": "#1d2a45",
      "--bg-input": "#111a2e",
      "--bg-player": "#070b16",
      "--bg-overlay": "#0b1020",
      "--bg-hover": "rgba(255,255,255,0.05)",
      "--bg-hover-strong": "rgba(255,255,255,0.10)",
      "--text-main": "#ffffff",
      "--text-muted": "#a0a0a0",
      "--text-soft": "#606060",
      "--text-placeholder": "#555555",
      "--surface-line": "rgba(255,255,255,0.07)",
      "--surface-line-strong": "rgba(255,255,255,0.12)",
      "--shadow-card": "0 8px 32px rgba(0,0,0,0.5)",
      "--scrollbar-track": "rgba(255,255,255,0.05)",
      "--scrollbar-thumb": "rgba(255,255,255,0.15)",
    },
  },
  light: {
    name: "Jasny",
    vars: {
      "--bg-main": "#f3f4f6",
      "--bg-sidebar": "#ffffff",
      "--bg-panel": "#ffffff",
      "--bg-card": "#f9f9fa",
      "--bg-card-hover": "#efefef",
      "--bg-input": "#ebebeb",
      "--bg-player": "#ffffff",
      "--bg-overlay": "#f0f0f0",
      "--bg-hover": "rgba(0,0,0,0.04)",
      "--bg-hover-strong": "rgba(0,0,0,0.08)",
      "--text-main": "#111111",
      "--text-muted": "#666666",
      "--text-soft": "#999999",
      "--text-placeholder": "#aaaaaa",
      "--surface-line": "rgba(0,0,0,0.07)",
      "--surface-line-strong": "rgba(0,0,0,0.12)",
      "--shadow-card": "0 4px 24px rgba(0,0,0,0.10)",
      "--scrollbar-track": "rgba(0,0,0,0.05)",
      "--scrollbar-thumb": "rgba(0,0,0,0.15)",
    },
  },
};

const DEFAULT_PRIMARY = "#8b5cf6";

function buildCustomVars(base, primaryColor, bgColor, textColor) {
  const baseVars = PRESET_THEMES[base]?.vars || PRESET_THEMES.dark.vars;
  const overrides = {};
  if (primaryColor) overrides["--primary"] = primaryColor;
  if (bgColor) {
    overrides["--bg-main"] = bgColor;
    const isLight = isLightColor(bgColor);
    overrides["--text-main"] = textColor || (isLight ? "#111111" : "#ffffff");
    overrides["--text-muted"] = isLight ? "#666666" : "#a0a0a0";
    overrides["--text-soft"] = isLight ? "#999999" : "#606060";
    overrides["--surface-line"] = isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)";
    overrides["--bg-hover"] = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)";
    overrides["--bg-hover-strong"] = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.10)";
    const darken = darkenColor(bgColor, 8);
    overrides["--bg-sidebar"] = isLight ? lightenColor(bgColor, 6) : darken;
    overrides["--bg-panel"] = isLight ? lightenColor(bgColor, 4) : darken;
    overrides["--bg-card"] = isLight ? darkenColor(bgColor, 3) : lightenColor(bgColor, 4);
    overrides["--bg-card-hover"] = isLight ? darkenColor(bgColor, 6) : lightenColor(bgColor, 7);
    overrides["--bg-player"] = isLight ? "#ffffff" : "#000000";
    overrides["--bg-input"] = isLight ? darkenColor(bgColor, 4) : lightenColor(bgColor, 4);
    overrides["--scrollbar-track"] = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";
    overrides["--scrollbar-thumb"] = isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";
    overrides["--shadow-card"] = isLight ? "0 4px 24px rgba(0,0,0,0.10)" : "0 8px 32px rgba(0,0,0,0.5)";
  }
  return { ...baseVars, ...overrides };
}

function isLightColor(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function hexToRgb(hex) {
  const c = hex.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function lightenColor(hex, pct) {
  try {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * (pct / 100), g + (255 - g) * (pct / 100), b + (255 - b) * (pct / 100));
  } catch {
    return hex;
  }
}

function darkenColor(hex, pct) {
  try {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r * (1 - pct / 100), g * (1 - pct / 100), b * (1 - pct / 100));
  } catch {
    return hex;
  }
}

const ThemeContext = createContext(null);

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem("bm-theme-state") || "null");
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const saved = loadSaved();
  const [theme, setThemeState] = useState(saved?.theme || "dark");
  const [primaryColor, setPrimaryColorState] = useState(saved?.primaryColor || DEFAULT_PRIMARY);
  const [bgColor, setBgColorState] = useState(saved?.bgColor || "");
  const [textColor, setTextColorState] = useState(saved?.textColor || "");
  const [customBase, setCustomBaseState] = useState(saved?.customBase || "dark");

  // Ustawienia strony
  const [liquidGlassEnabled, setLiquidGlassEnabledState] = useState(() => {
    try {
      const pageSettings = JSON.parse(localStorage.getItem("bm-page-settings") || "{}");
      return pageSettings.liquidGlassEnabled ?? true;
    } catch {
      return true;
    }
  });
  const [blurIntensity, setBlurIntensityState] = useState(() => {
    try {
      const pageSettings = JSON.parse(localStorage.getItem("bm-page-settings") || "{}");
      return pageSettings.blurIntensity ?? 10;
    } catch {
      return 10;
    }
  });
  const [transparency, setTransparencyState] = useState(() => {
    try {
      const pageSettings = JSON.parse(localStorage.getItem("bm-page-settings") || "{}");
      return pageSettings.transparency ?? 0.8;
    } catch {
      return 0.8;
    }
  });

  // Ustawienia dźwięku
  const [defaultVolume, setDefaultVolumeState] = useState(() => {
    try {
      const audioSettings = JSON.parse(localStorage.getItem("bm-audio-settings") || "{}");
      return audioSettings.defaultVolume ?? 80;
    } catch {
      return 80;
    }
  });
  const [audioEffects, setAudioEffectsState] = useState(() => {
    try {
      const audioSettings = JSON.parse(localStorage.getItem("bm-audio-settings") || "{}");
      return audioSettings.audioEffects ?? true;
    } catch {
      return true;
    }
  });

  function applyVars(themeName, primary, bg, text, base) {
    let vars;
    if (themeName === "custom") {
      vars = buildCustomVars(base || "dark", primary, bg, text);
    } else {
      vars = { ...PRESET_THEMES[themeName].vars };
    }
    if (primary && themeName !== "custom") vars["--primary"] = primary;
    else if (!primary) vars["--primary"] = DEFAULT_PRIMARY;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.setAttribute("data-theme", themeName);
  }

  useEffect(() => {
    applyVars(theme, primaryColor, bgColor, textColor, customBase);
  });

  function persist(state) {
    localStorage.setItem("bm-theme-state", JSON.stringify(state));
  }

  function setTheme(name) {
    setThemeState(name);
    const state = { theme: name, primaryColor, bgColor, textColor, customBase };
    persist(state);
    applyVars(name, primaryColor, bgColor, textColor, customBase);
  }

  function setPrimaryColor(color) {
    setPrimaryColorState(color);
    const state = { theme, primaryColor: color, bgColor, textColor, customBase };
    persist(state);
    applyVars(theme, color, bgColor, textColor, customBase);
  }

  function applyCustomTheme({ primary, bg, text, base }) {
    const p = primary ?? primaryColor;
    const b = bg ?? bgColor;
    const t = text ?? textColor;
    const base2 = base ?? customBase;
    setPrimaryColorState(p);
    setBgColorState(b);
    setTextColorState(t);
    setCustomBaseState(base2);
    setThemeState("custom");
    const state = { theme: "custom", primaryColor: p, bgColor: b, textColor: t, customBase: base2 };
    persist(state);
    applyVars("custom", p, b, t, base2);
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      primaryColor,
      setPrimaryColor,
      applyCustomTheme,
      bgColor,
      textColor,
      customBase,
      liquidGlassEnabled,
      setLiquidGlassEnabled: setLiquidGlassEnabledState,
      blurIntensity,
      setBlurIntensity: setBlurIntensityState,
      transparency,
      setTransparency: setTransparencyState,
      defaultVolume,
      setDefaultVolume: setDefaultVolumeState,
      audioEffects,
      setAudioEffects: setAudioEffectsState
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
