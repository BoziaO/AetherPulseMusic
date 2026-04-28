import React, { createContext, useContext, useEffect, useState } from "react";
import { clearDynamicColors } from "../lib/colorExtractor";

export const PRESET_THEMES = {
  dark: {
    name: "Classic Dark",
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
      "--primary": "#8b5cf6",
      "--primary-rgb": "139, 92, 246",
      "--radius-main": "24px",
    },
  },
  light: {
    name: "Classic Light",
    vars: {
      "--bg-main": "#ffffff",
      "--bg-sidebar": "#f8f9fa",
      "--bg-panel": "#ffffff",
      "--bg-card": "#f9f9fa",
      "--bg-card-hover": "#f0f0f0",
      "--bg-input": "#e9ecef",
      "--bg-player": "#ffffff",
      "--bg-overlay": "#f8f9fa",
      "--bg-hover": "rgba(0,0,0,0.04)",
      "--bg-hover-strong": "rgba(0,0,0,0.08)",
      "--text-main": "#000000",
      "--text-muted": "#666666",
      "--text-soft": "#999999",
      "--text-placeholder": "#cccccc",
      "--surface-line": "rgba(0,0,0,0.12)",
      "--surface-line-strong": "rgba(0,0,0,0.24)",
      "--shadow-card": "0 2px 8px rgba(0,0,0,0.10)",
      "--scrollbar-track": "rgba(0,0,0,0.05)",
      "--scrollbar-thumb": "rgba(0,0,0,0.15)",
      "--primary": "#8b5cf6",
      "--primary-rgb": "139, 92, 246",
      "--radius-main": "24px",
    },
  },
  cyberpunk: {
    name: "Night City (Cyberpunk)",
    vars: {
      "--bg-main": "#020204",
      "--bg-sidebar": "#020204",
      "--bg-panel": "#050508",
      "--bg-card": "#0a0a0f",
      "--bg-card-hover": "#151520",
      "--bg-input": "#08080c",
      "--bg-player": "#000000",
      "--bg-overlay": "#020204",
      "--bg-hover": "rgba(0, 255, 255, 0.1)",
      "--bg-hover-strong": "rgba(255, 0, 128, 0.15)",
      "--text-main": "#00f3ff",
      "--text-muted": "#ff0080",
      "--text-soft": "#b537f2",
      "--text-placeholder": "#444466",
      "--surface-line": "#00f3ff33",
      "--surface-line-strong": "#ff008066",
      "--shadow-card": "0 0 25px rgba(0, 243, 255, 0.3)",
      "--scrollbar-track": "#020204",
      "--scrollbar-thumb": "#00f3ff",
      "--primary": "#00f3ff",
      "--primary-rgb": "0, 243, 255",
      "--radius-main": "0px",
      "--font-display": "'Orbitron', sans-serif",
    },
  },
  kaiangel: {
    name: "Kai Angel (Industrial)",
    vars: {
      "--bg-main": "#000000",
      "--bg-sidebar": "#000000",
      "--bg-panel": "#000000",
      "--bg-card": "#050505",
      "--bg-card-hover": "#0a0a0a",
      "--bg-input": "#080808",
      "--bg-player": "#000000",
      "--bg-overlay": "#000000",
      "--bg-hover": "rgba(255,255,255,0.05)",
      "--bg-hover-strong": "rgba(255,255,255,0.1)",
      "--text-main": "#ffffff",
      "--text-muted": "#888888",
      "--text-soft": "#444444",
      "--text-placeholder": "#222222",
      "--surface-line": "#111111",
      "--surface-line-strong": "#222222",
      "--shadow-card": "none",
      "--scrollbar-track": "#000000",
      "--scrollbar-thumb": "#ffffff",
      "--primary": "#ffffff",
      "--primary-rgb": "255, 255, 255",
      "--radius-main": "0px",
      "--font-display": "'Helvetica', sans-serif",
    },
  },
  bloodborne: {
    name: "Yharnam (Gothic)",
    vars: {
      "--bg-main": "#0a0807",
      "--bg-sidebar": "#0d0b09",
      "--bg-panel": "#120f0c",
      "--bg-card": "#1a1612",
      "--bg-card-hover": "#251f19",
      "--bg-input": "#0d0b09",
      "--bg-player": "#050403",
      "--bg-overlay": "#0a0807",
      "--bg-hover": "rgba(139, 0, 0, 0.1)",
      "--bg-hover-strong": "rgba(139, 0, 0, 0.2)",
      "--text-main": "#c4b494",
      "--text-muted": "#8b0000",
      "--text-soft": "#5c503d",
      "--text-placeholder": "#3d3428",
      "--surface-line": "#2a221a",
      "--surface-line-strong": "#4d0000",
      "--shadow-card": "0 10px 40px rgba(0,0,0,0.8)",
      "--scrollbar-track": "#050403",
      "--scrollbar-thumb": "#8b0000",
      "--primary": "#8b0000",
      "--primary-rgb": "139, 0, 0",
      "--radius-main": "8px",
      "--font-display": "'Cinzel', serif",
    },
  },
  tokyo: {
    name: "Tokyo Night",
    vars: {
      "--bg-main": "#1a1b26",
      "--bg-sidebar": "#16161e",
      "--bg-panel": "#1f2335",
      "--bg-card": "#24283b",
      "--bg-card-hover": "#292e42",
      "--bg-input": "#1a1b26",
      "--bg-player": "#16161e",
      "--bg-overlay": "#1a1b26",
      "--bg-hover": "rgba(122, 162, 247, 0.1)",
      "--bg-hover-strong": "rgba(187, 154, 247, 0.15)",
      "--text-main": "#c0caf5",
      "--text-muted": "#7aa2f7",
      "--text-soft": "#565f89",
      "--text-placeholder": "#414868",
      "--surface-line": "#292e42",
      "--surface-line-strong": "#bb9af7",
      "--shadow-card": "0 8px 32px rgba(0,0,0,0.4)",
      "--scrollbar-track": "#16161e",
      "--scrollbar-thumb": "#7aa2f7",
      "--primary": "#bb9af7",
      "--primary-rgb": "187, 154, 247",
      "--radius-main": "20px",
    },
  },
  amoled: {
    name: "Pure Black (AMOLED)",
    vars: {
      "--bg-main": "#000000",
      "--bg-sidebar": "#000000",
      "--bg-panel": "#000000",
      "--bg-card": "#0a0a0a",
      "--bg-card-hover": "#1a1a1a",
      "--bg-input": "#0a0a0a",
      "--bg-player": "#000000",
      "--bg-overlay": "#000000",
      "--bg-hover": "rgba(255,255,255,0.08)",
      "--bg-hover-strong": "rgba(255,255,255,0.15)",
      "--text-main": "#ffffff",
      "--text-muted": "#cccccc",
      "--text-soft": "#888888",
      "--text-placeholder": "#555555",
      "--surface-line": "#222222",
      "--surface-line-strong": "#444444",
      "--shadow-card": "none",
      "--scrollbar-track": "#000000",
      "--scrollbar-thumb": "#444444",
      "--primary": "#3b82f6",
      "--primary-rgb": "59, 130, 246",
      "--radius-main": "16px",
    },
  }
};

const DEFAULT_PRIMARY = "#8b5cf6";

function hexToRgb(hex) {
  const c = hex.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function cssVarToRgb(value) {
  // If already rgb format like "139, 92, 246"
  if (value.includes(",")) return value;
  // If hex
  if (value.startsWith("#")) {
    const [r, g, b] = hexToRgb(value);
    return `${r}, ${g}, ${b}`;
  }
  return "139, 92, 246";
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function darkenColor(hex, pct) {
  try {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r * (1 - pct / 100), g * (1 - pct / 100), b * (1 - pct / 100));
  } catch {
    return hex;
  }
}

function lightenColor(hex, pct) {
  try {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * (pct / 100), g + (255 - g) * (pct / 100), b + (255 - b) * (pct / 100));
  } catch {
    return hex;
  }
}

function isLightColor(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function buildCustomVars(base, primaryColor, bgColor, textColor) {
  const baseVars = PRESET_THEMES[base]?.vars || PRESET_THEMES.dark.vars;
  const overrides = {};
  if (primaryColor) {
    overrides["--primary"] = primaryColor;
    const [r, g, b] = hexToRgb(primaryColor);
    overrides["--primary-rgb"] = `${r}, ${g}, ${b}`;
  }
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
  const [dynamicColors, setDynamicColorsState] = useState(saved?.dynamicColors ?? false);

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

  function applyVars(themeName, primary, bg, text, base) {
    let vars;
    if (themeName === "custom") {
      vars = buildCustomVars(base || "dark", primary, bg, text);
    } else {
      vars = { ...PRESET_THEMES[themeName].vars };
    }

    // Support primary color overrides for presets
    if (primary && themeName !== "custom") {
      vars["--primary"] = primary;
      const [r, g, b] = hexToRgb(primary);
      vars["--primary-rgb"] = `${r}, ${g}, ${b}`;
    }

    const root = document.documentElement;

    // Clear old font-display and other potentially lingering styles
    root.style.removeProperty("--font-display");
    root.style.removeProperty("--radius-main");

    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

    // Auto-generate RGB variants for glass effects
    const bgPanel = vars["--bg-panel"] || "#10172a";
    const bgPlayer = vars["--bg-player"] || "#070b16";
    const primaryCol = vars["--primary"] || DEFAULT_PRIMARY;
    root.style.setProperty("--bg-panel-rgb", cssVarToRgb(bgPanel));
    root.style.setProperty("--bg-player-rgb", cssVarToRgb(bgPlayer));
    root.style.setProperty("--primary-rgb", cssVarToRgb(primaryCol));

    root.setAttribute("data-theme", themeName);

    // If dynamic colors were previously enabled but theme changed, clear them
    if (!dynamicColors) {
      clearDynamicColors();
    }
  }

  useEffect(() => {
    applyVars(theme, primaryColor, bgColor, textColor, customBase);
  }, [theme, primaryColor, bgColor, textColor, customBase, dynamicColors]);

  useEffect(() => {
    localStorage.setItem(
      "bm-page-settings",
      JSON.stringify({
        liquidGlassEnabled,
        blurIntensity: Number(blurIntensity),
        transparency: Number(transparency),
      }),
    );
  }, [liquidGlassEnabled, blurIntensity, transparency]);

  function persist(state) {
    localStorage.setItem("bm-theme-state", JSON.stringify(state));
  }

  function setDynamicColors(enabled) {
    setDynamicColorsState(enabled);
    const state = { theme, primaryColor, bgColor, textColor, customBase, dynamicColors: enabled };
    persist(state);
    if (!enabled) {
      clearDynamicColors();
    }
  }

  function setTheme(name) {
    setThemeState(name);
    const state = { theme: name, primaryColor, bgColor, textColor, customBase, dynamicColors };
    persist(state);
    applyVars(name, primaryColor, bgColor, textColor, customBase);
  }

  function setPrimaryColor(color) {
    setPrimaryColorState(color);
    const state = { theme, primaryColor: color, bgColor, textColor, customBase, dynamicColors };
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
    const state = { theme: "custom", primaryColor: p, bgColor: b, textColor: t, customBase: base2, dynamicColors };
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
      dynamicColors,
      setDynamicColors,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
