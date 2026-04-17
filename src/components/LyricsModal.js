import React, { useState, useEffect, useRef } from "react";
import { X, Music, Zap } from "./Icons";

export default function LyricsModal({ isOpen, onClose, trackTitle, trackArtist, currentTime = 0, isPlaying = false }) {
  const [lyrics, setLyrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("lyrics-settings") || "{}");
    } catch {
      return {};
    }
  });

  const containerRef = useRef(null);
  const currentLineRef = useRef(null);

  const defaultSettings = {
    fontSize: 18,
    lineSpacing: 1.8,
    autoScroll: true,
    backgroundColor: 0.1,
    textColor: "var(--text-main)",
    highlightColor: "var(--primary)",
  };

  const mergedSettings = { ...defaultSettings, ...settings };

  useEffect(() => {
    localStorage.setItem("lyrics-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (mergedSettings.autoScroll && currentLineRef.current && containerRef.current) {
      currentLineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentLineIndex, mergedSettings.autoScroll]);

  useEffect(() => {
    if (isOpen && trackTitle) {
      fetchLyrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, trackTitle, trackArtist]);

  useEffect(() => {
    if (!isPlaying || lyrics.length === 0) return;

    const currentIndex = lyrics.findIndex((line, idx) => {
      const nextLine = lyrics[idx + 1];
      const isCurrentTime = currentTime >= (line.time || 0);
      const isBeforeNext = !nextLine || currentTime < (nextLine.time || 0);
      return isCurrentTime && isBeforeNext;
    });

    if (currentIndex >= 0) {
      setCurrentLineIndex(currentIndex);
    }
  }, [currentTime, isPlaying, lyrics]);

  const fetchLyrics = async () => {
    setLoading(true);
    setError("");
    setLyrics([]);

    try {
      const query = `${trackTitle} ${trackArtist || ""}`.trim();
      const response = await fetch(`/api/lyrics?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error("Nie znaleziono napisów");
      }

      const data = await response.json();

      if (data.lyrics) {
        const parsedLyrics = parseLyrics(data.lyrics);
        setLyrics(parsedLyrics);
      } else {
        setError("Brak dostępnych napisów");
      }
    } catch (err) {
      setError(err.message || "Błąd pobierania napisów");
    } finally {
      setLoading(false);
    }
  };

  const parseLyrics = (lyricsText) => {
    const lines = lyricsText.split("\n").filter(l => l.trim());

    return lines.map((line) => {
      const timeMatch = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\]/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        const seconds = parseInt(timeMatch[2], 10);
        const milliseconds = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0'), 10) : 0;
        const time = minutes * 60 + seconds + milliseconds / 1000;
        const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]\s*/, "").trim();
        return { time, text };
      }
      return { time: null, text: line.trim() };
    });
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--surface-line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: "var(--surface-line)" }}
        >
          <div className="flex-1">
            <h2 className="text-2xl font-black" style={{ color: "var(--text-main)" }}>
              Napisy
            </h2>
            <p className="text-xs font-bold mt-1 uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>
              {trackTitle} • {trackArtist || "Nieznany wykonawca"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full transition-all hover:scale-110 flex-shrink-0"
              style={{ backgroundColor: showSettings ? "var(--primary)" : "var(--bg-hover)", color: showSettings ? "#fff" : "var(--text-muted)" }}
              title="Ustawienia"
            >
              <Zap size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-all hover:scale-110 flex-shrink-0"
              style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {showSettings && (
          <div
            className="border-b p-6 space-y-5"
            style={{ borderColor: "var(--surface-line)", backgroundColor: "var(--bg-card)" }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                  Rozmiar tekstu
                </label>
                <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ backgroundColor: "var(--bg-hover)", color: "var(--primary)" }}>
                  {mergedSettings.fontSize}px
                </span>
              </div>
              <input
                type="range"
                min="12"
                max="36"
                value={mergedSettings.fontSize}
                onChange={(e) => handleSettingChange("fontSize", parseInt(e.target.value))}
                className="w-full"
                style={{
                  cursor: "pointer",
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((mergedSettings.fontSize - 12) / 24) * 100}%, var(--bg-hover-strong) ${((mergedSettings.fontSize - 12) / 24) * 100}%, var(--bg-hover-strong) 100%)`,
                  borderRadius: "999px",
                  height: "6px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                  Odstęp między wersami
                </label>
                <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ backgroundColor: "var(--bg-hover)", color: "var(--primary)" }}>
                  {mergedSettings.lineSpacing.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={mergedSettings.lineSpacing}
                onChange={(e) => handleSettingChange("lineSpacing", parseFloat(e.target.value))}
                className="w-full"
                style={{
                  cursor: "pointer",
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((mergedSettings.lineSpacing - 1) / 2) * 100}%, var(--bg-hover-strong) ${((mergedSettings.lineSpacing - 1) / 2) * 100}%, var(--bg-hover-strong) 100%)`,
                  borderRadius: "999px",
                  height: "6px",
                  outline: "none",
                }}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                Automatyczne przewijanie
              </label>
              <button
                onClick={() => handleSettingChange("autoScroll", !mergedSettings.autoScroll)}
                className="relative w-12 h-6 rounded-full transition-all"
                style={{ backgroundColor: mergedSettings.autoScroll ? "var(--primary)" : "var(--bg-hover)" }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300"
                  style={{ left: mergedSettings.autoScroll ? "26px" : "2px" }}
                />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                  Przezroczystość tła
                </label>
                <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ backgroundColor: "var(--bg-hover)", color: "var(--primary)" }}>
                  {Math.round(mergedSettings.backgroundColor * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={mergedSettings.backgroundColor}
                onChange={(e) => handleSettingChange("backgroundColor", parseFloat(e.target.value))}
                className="w-full"
                style={{
                  cursor: "pointer",
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${mergedSettings.backgroundColor * 100}%, var(--bg-hover-strong) ${mergedSettings.backgroundColor * 100}%, var(--bg-hover-strong) 100%)`,
                  borderRadius: "999px",
                  height: "6px",
                  outline: "none",
                }}
              />
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-8"
          style={{
            backgroundColor: `rgba(var(--primary-rgb, 139, 92, 246), ${mergedSettings.backgroundColor * 0.1})`,
          }}
        >
          {loading ? (
            <div
              className="flex flex-col items-center justify-center h-64"
              style={{ color: "var(--text-muted)" }}
            >
              <div className="animate-spin">
                <Music size={32} className="mb-4 opacity-50" />
              </div>
              <p className="text-sm font-bold">Ładowanie napisów...</p>
            </div>
          ) : error ? (
            <div
              className="flex flex-col items-center justify-center h-64"
              style={{ color: "var(--text-muted)" }}
            >
              <Music size={48} className="mb-4 opacity-30" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          ) : lyrics.length > 0 ? (
            <div className="space-y-2">
              {lyrics.map((line, idx) => (
                <div
                  key={idx}
                  ref={idx === currentLineIndex ? currentLineRef : null}
                  className="transition-all duration-200"
                  style={{
                    textAlign: "center",
                    fontSize: `${mergedSettings.fontSize}px`,
                    lineHeight: mergedSettings.lineSpacing,
                    color: idx === currentLineIndex ? mergedSettings.highlightColor : "var(--text-muted)",
                    fontWeight: idx === currentLineIndex ? 700 : 500,
                    opacity: idx === currentLineIndex ? 1 : 0.6,
                    transform: idx === currentLineIndex ? "scale(1.05)" : "scale(1)",
                    padding: "8px 0",
                  }}
                >
                  {line.text}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-64"
              style={{ color: "var(--text-muted)" }}
            >
              <Music size={48} className="mb-4 opacity-30" />
              <p className="text-sm font-bold">Brak dostępnych napisów</p>
            </div>
          )}
        </div>

        <div
          className="border-t p-4 text-center text-xs font-bold uppercase tracking-widest"
          style={{ borderColor: "var(--surface-line)", color: "var(--text-soft)" }}
        >
          {isPlaying ? "🎵 Napisy synchronizowane" : "Wznów odtwarzanie, aby zsynchronizować napisy"}
        </div>
      </div>
    </div>
  );
}

