import React, { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { X, Palette, Moon, Sun, Sparkles } from "./Icons";

const PRESET_PRIMARIES = [
  { color: "#8b5cf6", label: "Aether Violet" },
  { color: "#6d28d9", label: "Fiolet" },
  { color: "#059669", label: "Zieleń" },
  { color: "#d97706", label: "Złoto" },
  { color: "#db2777", label: "Róż" },
  { color: "#0284c7", label: "Błękit" },
  { color: "#dc2626", label: "Czerwień" },
  { color: "#7c3aed", label: "Purpura" },
];

const PRESET_BACKGROUNDS = [
  { color: "#0a0a0a", label: "Głęboka czerń" },
  { color: "#1a1a2e", label: "Głęboki granat" },
  { color: "#1e1b2e", label: "Ciemny fiolet" },
  { color: "#0f1923", label: "Atrament" },
  { color: "#f3f4f6", label: "Platynowy" },
  { color: "#fafafa", label: "Biały" },
  { color: "#f0f4f8", label: "Błękitny śnieg" },
  { color: "#fdf6ec", label: "Kremowy" },
];

export default function ThemeSettings({ onClose }) {
  const { theme, setTheme, primaryColor, applyCustomTheme, bgColor, customBase, dynamicColors, setDynamicColors } = useTheme();
  const { t } = useLanguage();
  const trapRef = useFocusTrap(true);
  const [localPrimary, setLocalPrimary] = useState(primaryColor || "#8b5cf6");
  const [localBg, setLocalBg] = useState(bgColor || "#050816");
  const [localBase, setLocalBase] = useState(customBase || "dark");

  function handleApplyCustom() {
    applyCustomTheme({ primary: localPrimary, bg: localBg, base: localBase });
  }

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={t("settings")}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--surface-line)",
          color: "var(--text-main)",
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
              <Palette size={20} />
            </div>
            <h2 className="text-xl font-black tracking-tight">Motyw</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ backgroundColor: "var(--bg-hover-strong)", color: "var(--text-muted)" }}
            aria-label={t("close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Colors Toggle */}
        <section className="mb-6">
          <div className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <div>
              <p className="text-sm font-black" style={{ color: "var(--text-main)" }}>Dynamiczne kolory</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-soft)" }}>Dostosuj akcent do okładki albumu</p>
            </div>
            <button
              onClick={() => setDynamicColors(!dynamicColors)}
              className="relative w-12 h-7 rounded-full transition-colors"
              style={{ backgroundColor: dynamicColors ? "var(--primary)" : "var(--bg-hover-strong)" }}
              aria-pressed={dynamicColors}
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform"
                style={{ transform: dynamicColors ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </section>

        {/* Preset themes */}
        <section className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "var(--text-soft)" }}>
            Gotowe motywy
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "dark", label: "Ciemny", Icon: Moon },
              { key: "light", label: "Jasny", Icon: Sun },
              { key: "custom", label: "Własny", Icon: Sparkles },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => key !== "custom" ? setTheme(key) : handleApplyCustom()}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
                style={{
                  backgroundColor: theme === key ? "var(--primary)" : "var(--bg-card)",
                  color: theme === key ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${theme === key ? "transparent" : "var(--surface-line)"}`,
                }}
              >
                <Icon size={22} />
                <span className="text-xs font-black uppercase tracking-widest">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Primary color */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>
              Kolor akcentu
            </p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: localPrimary, borderColor: "var(--surface-line)" }}></div>
              <input
                type="color"
                value={localPrimary}
                onChange={(e) => setLocalPrimary(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                title="Wybierz kolor"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_PRIMARIES.map(({ color, label }) => (
              <button
                key={color}
                onClick={() => setLocalPrimary(color)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all"
                style={{
                  backgroundColor: localPrimary === color ? color + "22" : "var(--bg-card)",
                  border: `2px solid ${localPrimary === color ? color : "transparent"}`,
                }}
              >
                <div className="w-7 h-7 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Background color (for custom theme) */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>
              Tło (dla własnego motywu)
            </p>
            <input
              type="color"
              value={localBg || "#0a0a0a"}
              onChange={(e) => setLocalBg(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_BACKGROUNDS.map(({ color, label }) => (
              <button
                key={color}
                onClick={() => setLocalBg(color)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: `2px solid ${localBg === color ? localPrimary : "transparent"}`,
                }}
              >
                <div className="w-7 h-7 rounded-full border" style={{ backgroundColor: color, borderColor: "var(--surface-line)" }}></div>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Base for custom */}
        <section className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "var(--text-soft)" }}>
            Baza własnego motywu
          </p>
          <div className="grid grid-cols-2 gap-3">
            {["dark", "light"].map((b) => (
              <button
                key={b}
                onClick={() => setLocalBase(b)}
                className="py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                style={{
                  backgroundColor: localBase === b ? "var(--primary)" : "var(--bg-card)",
                  color: localBase === b ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${localBase === b ? "transparent" : "var(--surface-line)"}`,
                }}
              >
                {b === "dark" ? "Ciemna" : "Jasna"}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={handleApplyCustom}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Zastosuj motyw
        </button>
      </div>
    </div>
  );
}
