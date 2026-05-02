import React from "react";
import { fetchJson } from "../lib/api";
import { useTheme, PRESET_THEMES } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Settings, Zap, Palette, Droplets, Monitor, Heart, Languages } from "../components/Icons";
import { useToast } from "../components/Toast";

export default function SettingsPage() {
  const {
    theme,
    setTheme,
    primaryColor,
    setPrimaryColor,
    liquidGlassEnabled,
    setLiquidGlassEnabled,
    blurIntensity,
    setBlurIntensity,
    transparency,
    setTransparency,
  } = useTheme();

  const { language, setLanguage } = useLanguage();
  const t = (key) => (language === "pl" ? {
    settingsTitle: "Ustawienia",
    personalize: "Dopasuj aplikację do siebie",
    english: "Angielski",
    polish: "Polski",
  }[key] : {
    settingsTitle: "Settings",
    personalize: "Personalize your experience",
    english: "English",
    polish: "Polish",
  }[key] || key);

  const showToast = useToast();

  const handleThemeChange = (themeKey) => {
    setTheme(themeKey);
  };

  const handlePrimaryColorChange = (color) => {
    setPrimaryColor(color);
  };

  const handleLanguageChange = (langKey) => {
    setLanguage(langKey);
  };

  const themeOptions = Object.entries(PRESET_THEMES).map(([key, value]) => ({
    key,
    ...value,
  }));

  const commonColors = [
    "#8b5cf6", // Purple
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#ec4899", // Pink
    "#00f3ff", // Cyber Cyan
    "#ff0080", // Neon Pink
    "#ffffff", // White
  ];

  const resetVisualSettings = () => {
    setTheme("dark");
    setPrimaryColor("#8b5cf6");
    setLiquidGlassEnabled(true);
    setBlurIntensity(10);
    setTransparency(0.8);
    showToast("Przywrócono domyślne ustawienia wyglądu.", "success");
  };

  const clearSavedQueues = async () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith("queue-")) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    try {
      const result = await fetchJson("/api/user/queues", { method: "DELETE" });
      showToast(`Usunięto zapisane kolejki: ${keysToRemove.length + (result.removed || 0)}`, "info");
    } catch (err) {
      console.warn("Could not clear backend queues:", err.message);
      showToast(`Usunięto zapisane kolejki lokalne: ${keysToRemove.length}`, "info");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade">
      <header className="flex items-center gap-5 mb-10">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)" }}>
          <Settings size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("settingsTitle")}</h1>
          <p className="text-sm opacity-40 mt-1">{t("personalize")}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appearance Section */}
        <section className="p-6 rounded-2xl space-y-6 relative overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
          <div className="flex items-center gap-3 mb-4">
            <Zap size={18} style={{ color: "var(--primary)" }} />
            <h2 className="text-lg font-bold">{language === "pl" ? "Motywy wizualne" : "Visual Presets"}</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleThemeChange(opt.key)}
                className="flex items-center justify-between p-4 rounded-xl border transition-colors text-left"
                style={theme === opt.key
                  ? { backgroundColor: "var(--primary)", color: "#fff", borderColor: "var(--primary)" }
                  : { backgroundColor: "var(--bg-hover)", borderColor: "var(--surface-line)", color: "var(--text-main)" }
                }
              >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: opt.vars["--bg-panel"], border: `1px solid ${opt.vars["--surface-line"]}` }}>
                     <Palette size={16} style={{ color: opt.vars["--primary"] }} />
                   </div>
                   <div>
                     <p className="font-semibold text-sm">{opt.name}</p>
                   </div>
                </div>
                {theme === opt.key && <Zap size={14} fill="white" />}
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-8">
          {/* Customization Section */}
          <section className="p-6 rounded-2xl space-y-6" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
            <div className="flex items-center gap-3">
              <Droplets size={18} style={{ color: "var(--primary)" }} />
              <h2 className="text-lg font-bold">{language === "pl" ? "Kolor akcentu" : "Accent Color"}</h2>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {commonColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handlePrimaryColorChange(color)}
                  className="aspect-square rounded-xl relative overflow-hidden transition-transform hover:scale-105"
                  style={{ backgroundColor: color, boxShadow: primaryColor === color ? `0 0 0 2px var(--bg-card), 0 0 0 4px var(--primary)` : "none" }}
                >
                   {primaryColor === color && (
                     <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                        <Zap size={14} fill="white" />
                     </div>
                   )}
                </button>
              ))}
            </div>
            <div className="pt-4" style={{ borderTop: "1px solid var(--surface-line)" }}>
               <label className="text-xs font-semibold opacity-40 mb-3 block">{language === "pl" ? "Własny kod HEX" : "Custom Hex Code"}</label>
               <input type="color" value={primaryColor} onChange={(e) => handlePrimaryColorChange(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" style={{ backgroundColor: "transparent", border: "1px solid var(--surface-line)" }} />
            </div>
          </section>

          {/* Language Section */}
          <section className="p-6 rounded-2xl space-y-6" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
            <div className="flex items-center gap-3">
              <Languages size={18} style={{ color: "var(--primary)" }} />
              <h2 className="text-lg font-bold">{language === "pl" ? "Język" : "Language"}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={() => handleLanguageChange('en')} className="flex items-center justify-between p-4 rounded-xl border transition-colors text-left"
                style={language === 'en' ? { backgroundColor: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { backgroundColor: "var(--bg-hover)", borderColor: "var(--surface-line)", color: "var(--text-main)" }}>
                <p className="font-semibold text-sm">{t("english")}</p>
                {language === 'en' && <Zap size={14} fill="white" />}
              </button>
              <button onClick={() => handleLanguageChange('pl')} className="flex items-center justify-between p-4 rounded-xl border transition-colors text-left"
                style={language === 'pl' ? { backgroundColor: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { backgroundColor: "var(--bg-hover)", borderColor: "var(--surface-line)", color: "var(--text-main)" }}>
                <p className="font-semibold text-sm">{t("polish")}</p>
                {language === 'pl' && <Zap size={14} fill="white" />}
              </button>
            </div>
          </section>

          {/* Liquid Glass Section */}
          <section className="p-6 rounded-2xl space-y-6" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor size={18} style={{ color: "var(--primary)" }} />
                <h2 className="text-lg font-bold">{language === "pl" ? "Efekty szkła" : "Glass Effects"}</h2>
              </div>
              <button onClick={() => setLiquidGlassEnabled(!liquidGlassEnabled)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ backgroundColor: liquidGlassEnabled ? "var(--primary)" : "var(--bg-hover)" }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: liquidGlassEnabled ? "translateX(22px)" : "translateX(2px)" }} />
              </button>
            </div>

            <div className={`space-y-5 transition-opacity duration-300 ${liquidGlassEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                   <label className="text-xs font-semibold opacity-50">{language === "pl" ? "Siła rozmycia" : "Blur Intensity"}</label>
                   <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>{blurIntensity}px</span>
                </div>
                <input type="range" min="0" max="40" value={blurIntensity} onChange={(e) => setBlurIntensity(e.target.value)} className="w-full" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                   <label className="text-xs font-semibold opacity-50">{language === "pl" ? "Przezroczystość" : "Transparency"}</label>
                   <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>{Math.round(transparency * 100)}%</span>
                </div>
                <input type="range" min="0" max="100" step="5" value={transparency * 100} onChange={(e) => setTransparency(e.target.value / 100)} className="w-full" />
              </div>
            </div>
          </section>

          <section className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
            <div className="flex items-center gap-3">
              <Settings size={18} style={{ color: "var(--primary)" }} />
              <h2 className="text-lg font-bold">{language === "pl" ? "Narzędzia" : "Tools"}</h2>
            </div>
            <button onClick={resetVisualSettings} className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-main)" }}>
              {language === "pl" ? "Resetuj ustawienia wyglądu" : "Reset visual settings"}
            </button>
            <button onClick={clearSavedQueues} className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-main)" }}>
              {language === "pl" ? "Wyczyść zapisane kolejki" : "Clear saved queues"}
            </button>
          </section>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center py-16 space-y-3">
         <div className="flex items-center justify-center gap-3 text-[10px] font-semibold uppercase tracking-widest opacity-20">
            <span>AetherPulse Music Engine</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
            <span>v0.8.4 Alpha Build</span>
         </div>
         <p className="text-xs font-medium opacity-30 flex items-center justify-center gap-1.5">
           {language === "pl" ? "Stworzone z" : "Crafted with"} <Heart size={12} className="text-red-500 fill-red-500" /> {language === "pl" ? "dla nowej ery muzyki." : "for the new era of music."}
         </p>
      </footer>
    </div>
  );
}
