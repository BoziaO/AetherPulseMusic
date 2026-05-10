import { computed, ref, watch } from "vue";
import { DEFAULT_THEME_ID, THEMES, getTheme, resolveThemeId } from "../data/themes";

const STORAGE_KEY = "ap:theme";
const ACCENT_KEY = "ap:accent";

function createThemeStore() {
  const themeId = ref(resolveThemeId(localStorage.getItem(STORAGE_KEY)));

  const savedAccent = localStorage.getItem(ACCENT_KEY);
  const accent = ref(savedAccent && /^#[0-9a-f]{6}$/i.test(savedAccent) ? savedAccent : "");

  const theme = computed(() => getTheme(themeId.value));
  const mode = computed(() => theme.value.mode);

  function hexToRgb(hex) {
    const clean = String(hex || "").replace("#", "");
    if (clean.length !== 6) return null;
    return [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 6)].map((p) =>
      parseInt(p, 16),
    );
  }

  function shadeHex(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const clamp = (v) => Math.max(0, Math.min(255, v));
    return (
      "#" +
      rgb.map((v) => clamp(v + amount).toString(16).padStart(2, "0")).join("")
    );
  }

  function applyTheme() {
    const t = theme.value;
    const root = document.documentElement;

    root.dataset.theme = t.mode;
    root.dataset.themeId = t.id;
    root.dataset.themeFx = (t.effects || []).join(" ");

    for (const [key, value] of Object.entries(t.vars)) {
      root.style.setProperty(key, value);
    }

    root.style.setProperty("--accent-color", t.vars["--primary"]);

    if (accent.value) {
      root.style.setProperty("--primary", accent.value);
      root.style.setProperty("--primary-hover", shadeHex(accent.value, -18));
      const rgb = hexToRgb(accent.value);
      if (rgb) root.style.setProperty("--primary-rgb", rgb.join(", "));
      root.style.setProperty("--accent-color", accent.value);
    }
  }

  function setTheme(id) {
    themeId.value = resolveThemeId(id);
  }

  function setAccent(hex) {
    accent.value = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : "";
  }

  watch(
    themeId,
    (v) => {
      localStorage.setItem(STORAGE_KEY, v);
      applyTheme();
    },
    { immediate: false },
  );

  watch(
    accent,
    (v) => {
      if (v) localStorage.setItem(ACCENT_KEY, v);
      else localStorage.removeItem(ACCENT_KEY);
      applyTheme();
    },
    { immediate: false },
  );

  applyTheme();

  return { themeId, theme, mode, accent, setTheme, setAccent, applyTheme, themes: THEMES };
}

let store = null;
export function useTheme() {
  if (!store) store = createThemeStore();
  return store;
}

export { DEFAULT_THEME_ID, THEMES };
