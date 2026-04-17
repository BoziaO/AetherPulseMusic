import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import {
  ArrowLeft, Palette, Volume2, Eye, Moon, Sun, Sparkles,
  Music, Layers, Sliders
} from "../components/Icons";

const PRESET_PRIMARIES = [
  { color: "#8b5cf6", label: "Violet" },
  { color: "#6d28d9", label: "Fiolet" },
  { color: "#059669", label: "Zieleń" },
  { color: "#d97706", label: "Złoto" },
  { color: "#db2777", label: "Róż" },
  { color: "#0284c7", label: "Błękit" },
  { color: "#dc2626", label: "Czerwień" },
  { color: "#7c3aed", label: "Purpura" },
  { color: "#0891b2", label: "Cyan" },
  { color: "#65a30d", label: "Limonka" },
  { color: "#ea580c", label: "Pomarańcz" },
  { color: "#e11d48", label: "Karmazyn" },
];

const PRESET_BACKGROUNDS = [
  { color: "#050816", label: "Aether" },
  { color: "#0a0a0a", label: "Czerń" },
  { color: "#1a1a2e", label: "Granat" },
  { color: "#1e1b2e", label: "Ciemny fiolet" },
  { color: "#0f1923", label: "Atrament" },
  { color: "#0d1117", label: "GitHub Dark" },
  { color: "#f3f4f6", label: "Platynowy" },
  { color: "#fafafa", label: "Biały" },
];

function SettingSection({ icon: Icon, title, iconColor, children }) {
  return (
    <div
      className="rounded-3xl p-6 sm:p-8 transition-all duration-200"
      style={{
        backgroundColor: "var(--bg-panel)",
        border: "1px solid var(--surface-line)",
      }}
    >
      <div className="flex items-center gap-3 mb-7">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconColor + "22", color: iconColor }}
        >
          <Icon size={18} />
        </div>
        <h2 className="text-lg font-black tracking-tight" style={{ color: "var(--text-main)" }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>{label}</p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
        style={{ backgroundColor: checked ? "var(--primary)" : "var(--bg-hover-strong)" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300"
          style={{ left: checked ? "26px" : "2px" }}
        />
      </button>
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 1, onChange, unit = "", hint }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>{label}</p>
        <span
          className="text-xs font-black px-2 py-0.5 rounded-lg"
          style={{ backgroundColor: "var(--bg-hover-strong)", color: "var(--primary)" }}
        >
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="settings-slider"
        style={{ "--pct": `${pct}%` }}
      />
      {hint && <p className="text-xs mt-1.5" style={{ color: "var(--text-soft)" }}>{hint}</p>}
    </div>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const {
    theme, setTheme,
    primaryColor, setPrimaryColor,
    liquidGlassEnabled, setLiquidGlassEnabled,
    blurIntensity, setBlurIntensity,
    transparency, setTransparency,
    defaultVolume, setDefaultVolume,
    audioEffects, setAudioEffects,
    applyCustomTheme, bgColor, customBase,
  } = useTheme();

  const [localPrimary, setLocalPrimary] = useState(primaryColor || "#8b5cf6");
  const [localBg, setLocalBg] = useState(bgColor || "#050816");
  const [localBase, setLocalBase] = useState(customBase || "dark");
  const [saved, setSaved] = useState(false);

  function handleApplyCustom() {
    applyCustomTheme({ primary: localPrimary, bg: localBg, base: localBase });
  }

  function handleSave() {
    localStorage.setItem("bm-audio-settings", JSON.stringify({ defaultVolume, audioEffects }));
    localStorage.setItem("bm-page-settings", JSON.stringify({ liquidGlassEnabled, blurIntensity, transparency }));
    if (theme === "custom") handleApplyCustom();
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate("/"); }, 900);
  }

  return (
    <div className="min-h-screen page" style={{ color: "var(--text-main)" }}>
      <style>{`
        .settings-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          background: linear-gradient(
            to right,
            var(--primary) 0%,
            var(--primary) var(--pct, 50%),
            var(--bg-hover-strong) var(--pct, 50%),
            var(--bg-hover-strong) 100%
          );
          border-radius: 999px;
          outline: none;
          cursor: pointer;
        }
        .settings-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: var(--text-main);
          border: 3px solid var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.15s;
        }
        .settings-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .settings-slider::-moz-range-thumb {
          width: 20px; height: 20px;
          border-radius: 50%;
          background: var(--text-main);
          border: 3px solid var(--primary);
          cursor: pointer;
        }
      `}</style>

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)", border: "1px solid var(--surface-line)" }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter" style={{ fontFamily: '"Space Grotesk", sans-serif', color: "var(--text-main)" }}>
            Ustawienia
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color: "var(--text-soft)" }}>
            Personalizacja i dźwięk
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <SettingSection icon={Palette} title="Motyw" iconColor="var(--primary)">
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "dark", label: "Ciemny", Icon: Moon },
              { key: "light", label: "Jasny", Icon: Sun },
              { key: "custom", label: "Własny", Icon: Sparkles },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => key !== "custom" ? setTheme(key) : handleApplyCustom()}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: theme === key ? "var(--primary)" : "var(--bg-card)",
                  color: theme === key ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${theme === key ? "transparent" : "var(--surface-line)"}`,
                  boxShadow: theme === key ? "0 4px 20px color-mix(in srgb, var(--primary) 40%, transparent)" : "none",
                }}
              >
                <Icon size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
              </button>
            ))}
          </div>
        </SettingSection>

        <SettingSection icon={Layers} title="Kolor akcentu" iconColor="#db2777">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl border-2 flex-shrink-0 transition-all duration-300"
              style={{ backgroundColor: localPrimary, borderColor: "var(--surface-line-strong)" }}
            />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>Wybierz kolor</p>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={localPrimary}
                  onChange={(e) => { setLocalPrimary(e.target.value); setPrimaryColor(e.target.value); }}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <code className="text-xs font-black px-2 py-1 rounded-lg" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)" }}>
                  {localPrimary.toUpperCase()}
                </code>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_PRIMARIES.map(({ color, label }) => (
              <button key={color} onClick={() => { setLocalPrimary(color); setPrimaryColor(color); }} title={label}
                className="aspect-square rounded-xl border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: localPrimary === color ? "var(--text-main)" : "transparent",
                  boxShadow: localPrimary === color ? `0 0 12px ${color}` : "none",
                }}
              />
            ))}
          </div>
        </SettingSection>

        <SettingSection icon={Sparkles} title="Tło (własny motyw)" iconColor="#d97706">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl border-2 flex-shrink-0"
              style={{ backgroundColor: localBg || "#050816", borderColor: "var(--surface-line-strong)" }}
            />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>Kolor tła</p>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={localBg || "#050816"}
                  onChange={(e) => setLocalBg(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <code className="text-xs font-black px-2 py-1 rounded-lg" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)" }}>
                  {(localBg || "#050816").toUpperCase()}
                </code>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {PRESET_BACKGROUNDS.map(({ color, label }) => (
              <button key={color} onClick={() => setLocalBg(color)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all hover:scale-105"
                style={{ backgroundColor: "var(--bg-card)", border: `2px solid ${localBg === color ? localPrimary : "transparent"}` }}
              >
                <div className="w-7 h-7 rounded-full border" style={{ backgroundColor: color, borderColor: "var(--surface-line)" }} />
                <span className="text-[9px] font-black uppercase tracking-widest truncate w-full text-center" style={{ color: "var(--text-soft)" }}>{label}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <p className="col-span-2 text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>Baza motywu</p>
            {["dark", "light"].map((b) => (
              <button key={b} onClick={() => setLocalBase(b)}
                className="py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105"
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
          <button onClick={handleApplyCustom}
            className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Zastosuj własny motyw
          </button>
        </SettingSection>

        <SettingSection icon={Eye} title="Efekty wizualne" iconColor="#0284c7">
          <div style={{ borderBottom: "1px solid var(--surface-line)" }}>
            <Toggle checked={liquidGlassEnabled} onChange={setLiquidGlassEnabled}
              label="Efekt Liquid Glass"
              description="Rozmycie tła na pasku i wyszukiwarce"
            />
          </div>
          {liquidGlassEnabled && (
            <div className="mt-2 space-y-1">
              <SliderRow label="Intensywność rozmycia" value={blurIntensity} min={0} max={30}
                onChange={setBlurIntensity} unit="px" hint="Im wyżej, tym mocniejszy efekt szkła"
              />
              <div style={{ borderTop: "1px solid var(--surface-line)" }} />
              <SliderRow label="Przezroczystość tła" value={Math.round(transparency * 100)}
                min={10} max={100} onChange={(v) => setTransparency(v / 100)} unit="%"
                hint="Niższe wartości = więcej przezroczystości"
              />
            </div>
          )}
        </SettingSection>

        <SettingSection icon={Volume2} title="Ustawienia dźwięku" iconColor="#059669">
          <SliderRow label="Domyślna głośność" value={defaultVolume} min={0} max={100} onChange={setDefaultVolume} unit="%" />
          <div style={{ borderTop: "1px solid var(--surface-line)" }}>
            <Toggle checked={audioEffects} onChange={setAudioEffects}
              label="Efekty dźwiękowe"
              description="Animacje i efekty podczas odtwarzania"
            />
          </div>
        </SettingSection>

        <SettingSection icon={Music} title="O aplikacji" iconColor="#7c3aed">
          <div className="space-y-3">
            {[
              ["Aplikacja", "BoziaMusic"],
              ["Frontend", "React 19 + Tailwind CSS"],
              ["Backend", "Node.js + Express"],
              ["API", "YouTube Music (Innertube)"],
              ["Autor", "BoziaO"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-1">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>{label}</span>
                <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>{value}</span>
              </div>
            ))}
          </div>
        </SettingSection>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 shadow-2xl"
          style={{
            backgroundColor: saved ? "#059669" : "var(--primary)",
            boxShadow: "0 8px 32px color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          <Sliders size={18} />
          {saved ? "Zapisano!" : "Zapisz ustawienia"}
        </button>
      </div>
    </div>
  );
}

export default SettingsPage;
