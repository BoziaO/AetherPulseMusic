import React, { useState, useEffect, useRef } from "react";
import { X, Music, Zap } from "./Icons";

export default function LyricsModal({ 
  isOpen, 
  onClose, 
  trackTitle, 
  trackArtist, 
  videoId, 
  currentTime = 0, 
  isPlaying = false,
  onSeek
}) {
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
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const defaultSettings = {
    fontSize: 22,
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

  // Handle auto-scrolling
  useEffect(() => {
    if (mergedSettings.autoScroll && !isUserScrollingRef.current && currentLineRef.current && containerRef.current && isOpen) {
      currentLineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentLineIndex, mergedSettings.autoScroll, isOpen]);

  useEffect(() => {
    if (isOpen && trackTitle) {
      fetchLyrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, trackTitle, trackArtist, videoId]);

  useEffect(() => {
    if (lyrics.length === 0) return;

    // Find the current line based on currentTime
    // Synced lyrics are expected to be sorted by time
    const currentIndex = lyrics.reduce((bestIndex, line, idx) => {
      if (line.time !== null && line.time <= currentTime) {
        if (bestIndex === -1 || line.time >= lyrics[bestIndex].time) {
          return idx;
        }
      }
      return bestIndex;
    }, -1);

    if (currentIndex >= 0 && currentIndex !== currentLineIndex) {
      setCurrentLineIndex(currentIndex);
    }
  }, [currentTime, lyrics, currentLineIndex]);

  const fetchLyrics = async () => {
    setLoading(true);
    setError("");
    setLyrics([]);

    try {
      const query = `${trackTitle} ${trackArtist || ""}`.trim();
      const params = new URLSearchParams({
        q: query,
        title: trackTitle,
        artist: trackArtist || "",
      });
      if (videoId) params.append("videoId", videoId);

      const response = await fetch(`/api/lyrics?${params.toString()}`);

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
    if (!lyricsText) return [];
    
    // Check if it's already an array (though unlikely from API)
    if (Array.isArray(lyricsText)) return lyricsText;

    const lines = lyricsText.split("\n");
    const parsed = [];

    // Pattern for [mm:ss.xx] or [mm:ss:xx] or [mm:ss]
    const timePattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?\]/g;

    lines.forEach((line) => {
      const timestamps = [...line.matchAll(timePattern)];
      const text = line.replace(timePattern, "").trim();
      
      // If no text and no timestamps, it's likely a blank line or metadata we don't want
      if (!text && timestamps.length === 0) return;
      
      // Skip common metadata tags if they have no text
      if (line.match(/^\[(ar|ti|al|by|offset|length|re|ve):.*\]$/i) && !text) return;

      if (timestamps.length > 0) {
        timestamps.forEach(match => {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const fraction = match[3] ? parseInt(match[3], 10) : 0;
          
          let time = minutes * 60 + seconds;
          if (match[3]) {
            // Handle both centiseconds [mm:ss.xx] and milliseconds [mm:ss.xxx]
            const divider = match[3].length === 2 ? 100 : 1000;
            time += fraction / divider;
          }
          
          parsed.push({ time, text });
        });
      } else if (text) {
        parsed.push({ time: null, text });
      }
    });

    // Sort by time, push null times to the end
    return parsed.sort((a, b) => {
      if (a.time === null && b.time === null) return 0;
      if (a.time === null) return 1;
      if (b.time === null) return -1;
      return a.time - b.time;
    });
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLyricClick = (time) => {
    if (time !== null && onSeek) {
      onSeek(time);
    }
  };

  const handleScroll = () => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 2500); // Resume auto-scroll after 2.5s of inactivity
  };

  if (!isOpen) return null;

  const isSynced = lyrics.some(l => l.time !== null);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--surface-line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: "var(--surface-line)" }}
        >
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black truncate" style={{ color: "var(--text-main)" }}>
              Napisy
            </h2>
            <p className="text-xs font-bold mt-1 uppercase tracking-widest truncate" style={{ color: "var(--text-soft)" }}>
              {trackTitle} • {trackArtist || "Nieznany wykonawca"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 rounded-full transition-all hover:scale-110 flex-shrink-0"
              style={{ backgroundColor: showSettings ? "var(--primary)" : "var(--bg-hover)", color: showSettings ? "#fff" : "var(--text-muted)" }}
              title="Ustawienia"
            >
              <Zap size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-3 rounded-full transition-all hover:scale-110 flex-shrink-0"
              style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {showSettings && (
          <div
            className="border-b p-6 space-y-6"
            style={{ borderColor: "var(--surface-line)", backgroundColor: "var(--bg-card)" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  min="16"
                  max="48"
                  value={mergedSettings.fontSize}
                  onChange={(e) => handleSettingChange("fontSize", parseInt(e.target.value))}
                  className="w-full"
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
                />
              </div>

              <div className="flex items-center justify-between">
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
                    Tło napisów
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
                />
              </div>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-12 scrollbar-hide"
          style={{
            backgroundColor: `rgba(var(--primary-rgb, 139, 92, 246), ${mergedSettings.backgroundColor * 0.15})`,
          }}
        >
          {loading ? (
            <div
              className="flex flex-col items-center justify-center h-full"
              style={{ color: "var(--text-muted)" }}
            >
              <div className="animate-spin mb-4">
                <Music size={48} className="opacity-50" />
              </div>
              <p className="text-lg font-bold">Szukanie napisów...</p>
            </div>
          ) : error ? (
            <div
              className="flex flex-col items-center justify-center h-full text-center"
              style={{ color: "var(--text-muted)" }}
            >
              <Music size={64} className="mb-6 opacity-20" />
              <p className="text-xl font-bold max-w-xs">{error}</p>
            </div>
          ) : lyrics.length > 0 ? (
            <div className="space-y-4 max-w-2xl mx-auto pb-64">
              {lyrics.map((line, idx) => (
                <div
                  key={idx}
                  ref={idx === currentLineIndex ? currentLineRef : null}
                  onClick={() => handleLyricClick(line.time)}
                  className={`transition-all duration-500 cursor-pointer hover:opacity-100 ${idx === currentLineIndex ? 'active-lyric' : ''}`}
                  style={{
                    textAlign: "center",
                    fontSize: `${mergedSettings.fontSize}px`,
                    lineHeight: mergedSettings.lineSpacing,
                    color: idx === currentLineIndex ? "var(--text-main)" : "var(--text-muted)",
                    fontWeight: idx === currentLineIndex ? 900 : 700,
                    opacity: idx === currentLineIndex ? 1 : 0.4,
                    transform: idx === currentLineIndex ? "scale(1.1)" : "scale(1)",
                    filter: idx === currentLineIndex ? "none" : "blur(0.5px)",
                    padding: "12px 0",
                  }}
                >
                  {line.text || "•••"}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full"
              style={{ color: "var(--text-muted)" }}
            >
              <Music size={64} className="mb-6 opacity-20" />
              <p className="text-xl font-bold">Brak dostępnych napisów</p>
            </div>
          )}
        </div>

        <div
          className="border-t p-6 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3"
          style={{ borderColor: "var(--surface-line)", color: "var(--text-soft)", backgroundColor: "var(--bg-panel)" }}
        >
          {isSynced ? (
            <div className="flex items-center gap-2 text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Synchronizacja aktywna</span>
            </div>
          ) : (
            <span>Napisy statyczne</span>
          )}
          <span className="opacity-30">•</span>
          <span>AetherPulse Engine</span>
        </div>
      </div>
    </div>
  );
}
