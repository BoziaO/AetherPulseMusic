import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { ArrowLeft, Palette, Volume2, Eye } from "../components/Icons";

function SettingsPage() {
  const navigate = useNavigate();
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
    defaultVolume,
    setDefaultVolume,
    audioEffects,
    setAudioEffects,
    applyCustomTheme,
    bgColor,
    textColor,
    customBase
  } = useTheme();

  const handleSave = () => {
    // Zapisz ustawienia dźwięku do localStorage
    localStorage.setItem("bm-audio-settings", JSON.stringify({ defaultVolume, audioEffects }));

    // Zapisz ustawienia strony do localStorage
    localStorage.setItem("bm-page-settings", JSON.stringify({ liquidGlassEnabled, blurIntensity, transparency }));

    // Zaktualizuj motyw jeśli potrzebne
    applyCustomTheme({ primary: primaryColor, bg: bgColor, text: textColor, base: customBase });

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-white">Ustawienia</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ustawienia strony */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="text-purple-400" size={24} />
              <h2 className="text-xl font-semibold text-white">Wygląd strony</h2>
            </div>

            <div className="space-y-6">
              {/* Motyw */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Motyw</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="dark">Ciemny</option>
                  <option value="light">Jasny</option>
                  <option value="custom">Niestandardowy</option>
                </select>
              </div>

              {/* Kolor główny */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Kolor główny</label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full h-10 bg-white/10 border border-white/20 rounded-lg"
                />
              </div>

              {/* Liquid Glass */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Eye size={16} />
                    Liquid Glass
                  </label>
                  <input
                    type="checkbox"
                    checked={liquidGlassEnabled}
                    onChange={(e) => setLiquidGlassEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
                {liquidGlassEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Intensywność rozmycia</label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={blurIntensity}
                        onChange={(e) => setBlurIntensity(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Przezroczystość</label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={transparency}
                        onChange={(e) => setTransparency(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ustawienia dźwięku */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="text-green-400" size={24} />
              <h2 className="text-xl font-semibold text-white">Ustawienia dźwięku</h2>
            </div>

            <div className="space-y-6">
              {/* Domyślna głośność */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Domyślna głośność: {defaultVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={defaultVolume}
                  onChange={(e) => setDefaultVolume(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Efekty audio */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Efekty audio</label>
                <input
                  type="checkbox"
                  checked={audioEffects}
                  onChange={(e) => setAudioEffects(e.target.checked)}
                  className="w-4 h-4"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Przycisk zapisu */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all"
          >
            Zapisz ustawienia
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
