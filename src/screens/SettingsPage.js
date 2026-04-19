import React from "react";
import { useTheme, PRESET_THEMES } from "../contexts/ThemeContext";
import { Settings, Zap, Palette, Droplets, Monitor, Heart } from "../components/Icons";

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

  const handleThemeChange = (themeKey) => {
    setTheme(themeKey);
  };

  const handlePrimaryColorChange = (color) => {
    setPrimaryColor(color);
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

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex items-center gap-6 mb-16">
        <div className="w-20 h-20 bg-primary/20 rounded-[var(--radius-main)] flex items-center justify-center text-primary shadow-2xl animate-float">
          <Settings size={40} />
        </div>
        <div>
          <h1 className="text-5xl font-black tracking-tighter" style={{ color: "var(--text-main)" }}>Settings</h1>
          <p className="text-lg font-medium opacity-40 uppercase tracking-[0.2em] mt-2">Personalize your experience</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appearance Section */}
        <section className="glass p-10 rounded-[var(--radius-main)] space-y-10 group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-primary rotate-12 group-hover:scale-150 transition-transform duration-1000">
             <Palette size={120} />
          </div>
          <div className="flex items-center gap-4 mb-8">
            <Zap className="text-primary" />
            <h2 className="text-2xl font-black">Visual Presets</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {themeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleThemeChange(opt.key)}
                className={`flex items-center justify-between p-6 rounded-2xl border transition-all text-left group ${
                  theme === opt.key
                    ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105"
                    : "bg-white/5 border-white/10 hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-4">
                   <div 
                     className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                     style={{ backgroundColor: opt.vars["--bg-panel"], border: `1px solid ${opt.vars["--surface-line"]}` }}
                   >
                     <Palette size={20} style={{ color: opt.vars["--primary"] }} />
                   </div>
                   <div>
                     <p className="font-bold">{opt.name}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        {opt.key === 'cyberpunk' ? 'High Tech Low Life' : 'Premium UI Shell'}
                     </p>
                   </div>
                </div>
                {theme === opt.key && <Zap size={18} fill="white" className="animate-pulse" />}
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-8">
          {/* Customization Section */}
          <section className="glass p-10 rounded-[var(--radius-main)] space-y-10">
            <div className="flex items-center gap-4">
              <Droplets className="text-primary" />
              <h2 className="text-2xl font-black">Accent Color</h2>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {commonColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handlePrimaryColorChange(color)}
                  className={`aspect-square rounded-2xl transition-all relative overflow-hidden group hover:scale-110 active:scale-95 ${
                    primaryColor === color ? "ring-4 ring-primary ring-offset-4 ring-offset-bg-main" : ""
                  }`}
                  style={{ backgroundColor: color }}
                >
                   {primaryColor === color && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Zap size={16} fill="white" className="text-white" />
                     </div>
                   )}
                </button>
              ))}
            </div>
            <div className="pt-6 border-t border-surface-line">
               <label className="text-xs font-black uppercase tracking-widest opacity-40 mb-4 block">Custom Hex Code</label>
               <input 
                 type="color" 
                 value={primaryColor}
                 onChange={(e) => handlePrimaryColorChange(e.target.value)}
                 className="w-full h-12 rounded-xl bg-transparent border border-surface-line p-1 cursor-pointer"
               />
            </div>
          </section>

          {/* Liquid Glass Section */}
          <section className="glass p-10 rounded-[var(--radius-main)] space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Monitor className="text-primary" />
                <h2 className="text-2xl font-black">Glass Effects</h2>
              </div>
              <button
                onClick={() => setLiquidGlassEnabled(!liquidGlassEnabled)}
                className={`relative w-14 h-8 rounded-full transition-all ${
                  liquidGlassEnabled ? "bg-primary shadow-lg shadow-primary/30" : "bg-white/10"
                }`}
              >
                <div 
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all transform ${
                    liquidGlassEnabled ? "translate-x-7" : "translate-x-1"
                  } shadow-md`}
                />
              </button>
            </div>
            
            <div className={`space-y-8 transition-opacity duration-500 ${liquidGlassEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                   <label className="text-xs font-black uppercase tracking-widest opacity-60">Blur Intensity</label>
                   <span className="text-xs font-bold text-primary">{blurIntensity}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={blurIntensity}
                  onChange={(e) => setBlurIntensity(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                   <label className="text-xs font-black uppercase tracking-widest opacity-60">Transparency</label>
                   <span className="text-xs font-bold text-primary">{Math.round(transparency * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={transparency * 100}
                  onChange={(e) => setTransparency(e.target.value / 100)}
                  className="w-full"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center py-20 space-y-6">
         <div className="flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[0.5em] opacity-20">
            <span>AetherPulse Music Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span>v0.8.4 Alpha Build</span>
         </div>
         <p className="text-sm font-medium opacity-40 flex items-center justify-center gap-2">
           Crafted with <Heart size={14} className="text-red-500 fill-red-500" /> for the new era of music.
         </p>
      </footer>
    </div>
  );
}
