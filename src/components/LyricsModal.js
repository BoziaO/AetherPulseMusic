import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Music, Settings } from "./Icons";
import { useLanguage } from "../contexts/LanguageContext";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { fetchJson } from "../lib/api";

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
  const { t } = useLanguage();
  const [lyrics, setLyrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
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
  const trapRef = useFocusTrap(isOpen);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const lastScrollRef = useRef(0);
  const backendHydratedRef = useRef(false);

  const mergedSettings = { fontSize: 22, lineSpacing: 1.7, autoScroll: true, ...settings };

  useEffect(() => {
    let cancelled = false;
    fetchJson("/api/user/state", { timeout: 4000 })
      .then((state) => {
        if (!cancelled && state?.lyricsSettings && typeof state.lyricsSettings === "object") {
          setSettings(state.lyricsSettings);
        }
      })
      .catch((err) => console.warn("Could not hydrate lyrics settings:", err.message))
      .finally(() => {
        if (!cancelled) backendHydratedRef.current = true;
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem("lyrics-settings", JSON.stringify(settings));
    if (!backendHydratedRef.current) return;
    fetchJson("/api/user/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lyricsSettings: settings }),
      timeout: 4000,
    }).catch((err) => console.warn("Could not persist lyrics settings:", err.message));
  }, [settings]);

  const scrollToLine = useCallback((index) => {
    if (!containerRef.current || !currentLineRef.current || isUserScrollingRef.current) return;
    const container = containerRef.current;
    const line = currentLineRef.current;
    const target = line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2;
    // Use direct scrollTop assignment with lerp-like smoothness via CSS scroll-behavior if supported
    // But to avoid layout thrashing, we do it directly without smooth behavior in container
    container.scrollTo({ top: target, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (currentLineIndex >= 0 && isOpen) {
      scrollToLine(currentLineIndex);
    }
  }, [currentLineIndex, isOpen, scrollToLine]);

  useEffect(() => {
    if (!isOpen || !trackTitle) return;
    let cancelled = false;

    async function fetchLyrics() {
      setLoading(true);
      setError("");
      setLyrics([]);
      setCurrentLineIndex(-1);

      try {
        const query = `${trackTitle} ${trackArtist || ""}`.trim();
        const params = new URLSearchParams({ q: query, title: trackTitle, artist: trackArtist || "" });
        if (videoId) params.append("videoId", videoId);

        const response = await fetch(`/api/lyrics?${params.toString()}`);
        if (!response.ok) throw new Error(t("noLyricsAvailable"));

        const data = await response.json();
        if (cancelled) return;

        if (data.lyrics) {
          setLyrics(parseLyrics(data.lyrics));
        } else {
          setError(t("noLyricsAvailable"));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || t("noLyricsAvailable"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLyrics();
    return () => { cancelled = true; };
  }, [isOpen, trackTitle, trackArtist, videoId, t]);

  useEffect(() => {
    if (lyrics.length === 0) return;
    let best = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time !== null && lyrics[i].time <= currentTime) {
        best = i;
      } else if (lyrics[i].time !== null && lyrics[i].time > currentTime) {
        break;
      }
    }
    if (best !== -1 && best !== currentLineIndex) {
      setCurrentLineIndex(best);
    }
  }, [currentTime, currentLineIndex, lyrics]);

  const handleScroll = useCallback(() => {
    const now = Date.now();
    if (now - lastScrollRef.current < 50) return; // throttle
    lastScrollRef.current = now;

    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 3000);
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLyricClick = (time) => {
    if (time !== null && onSeek) onSeek(time);
  };

  if (!isOpen) return null;

  const isSynced = lyrics.some(l => l.time !== null);

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("lyrics")}
    >
      <div
        className="w-full sm:max-w-2xl sm:h-[80vh] h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-slide-up"
        style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--surface-line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--surface-line)" }}>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate" style={{ color: "var(--text-main)" }}>
              {trackTitle}
            </h2>
            <p className="text-xs font-medium mt-0.5 opacity-50 truncate">
              {trackArtist || t("unknownArtist")}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSettings(s => !s)}
              className="p-2.5 rounded-xl transition-colors"
              style={{
                backgroundColor: showSettings ? "var(--primary)" : "var(--bg-hover)",
                color: showSettings ? "#fff" : "var(--text-muted)"
              }}
              title={t("lyricsSettings")}
              aria-label={t("lyricsSettings")}
              aria-pressed={showSettings}
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl transition-colors"
              style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
              aria-label={t("close")}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="border-b px-6 py-4 space-y-4" style={{ borderColor: "var(--surface-line)", backgroundColor: "var(--bg-card)" }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-2">{t("lyricsFontSize")}</label>
                <input
                  type="range" min="16" max="40" value={mergedSettings.fontSize}
                  onChange={(e) => handleSettingChange("fontSize", parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-60 block mb-2">{t("lyricsLineSpacing")}</label>
                <input
                  type="range" min="1.2" max="2.5" step="0.1" value={mergedSettings.lineSpacing}
                  onChange={(e) => handleSettingChange("lineSpacing", parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold opacity-60">{t("lyricsAutoScroll")}</label>
              <button
                onClick={() => handleSettingChange("autoScroll", !mergedSettings.autoScroll)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ backgroundColor: mergedSettings.autoScroll ? "var(--primary)" : "var(--bg-hover)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                  style={{ transform: mergedSettings.autoScroll ? "translateX(20px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          </div>
        )}

        {/* Lyrics Content */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-10 scrollbar-hide"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
              <Music size={40} />
              <p className="text-sm font-semibold">{t("searchingLyrics")}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center opacity-50">
              <Music size={48} />
              <p className="text-sm font-semibold max-w-xs">{error}</p>
            </div>
          ) : lyrics.length > 0 ? (
            <div className="max-w-lg mx-auto space-y-1 pb-32">
              {lyrics.map((line, idx) => {
                const isActive = idx === currentLineIndex;
                return (
                  <div
                    key={idx}
                    ref={isActive ? currentLineRef : null}
                    onClick={() => handleLyricClick(line.time)}
                    className="py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      textAlign: "center",
                      fontSize: `${mergedSettings.fontSize}px`,
                      lineHeight: mergedSettings.lineSpacing,
                      color: isActive ? "var(--text-main)" : "var(--text-muted)",
                      fontWeight: isActive ? 700 : 500,
                      opacity: isActive ? 1 : 0.45,
                      backgroundColor: isActive ? "var(--bg-hover)" : "transparent",
                    }}
                  >
                    {line.text || "•"}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
              <Music size={48} />
              <p className="text-sm font-semibold">{t("noLyricsAvailable")}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wider opacity-40"
          style={{ borderColor: "var(--surface-line)", backgroundColor: "var(--bg-panel)" }}>
          {isSynced ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
              <span>{t("syncedActive")}</span>
            </>
          ) : (
            <span>{t("staticLyrics")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function parseLyrics(lyricsText) {
  if (!lyricsText) return [];
  if (Array.isArray(lyricsText)) return lyricsText;

  const lines = lyricsText.split("\n");
  const parsed = [];
  const timePattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?\]/g;

  lines.forEach((line) => {
    const timestamps = [...line.matchAll(timePattern)];
    const text = line.replace(timePattern, "").trim();

    if (!text && timestamps.length === 0) return;
    if (line.match(/^\[(ar|ti|al|by|offset|length|re|ve):.*\]$/i) && !text) return;

    if (timestamps.length > 0) {
      timestamps.forEach(match => {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fraction = match[3] ? parseInt(match[3], 10) : 0;
        let time = minutes * 60 + seconds;
        if (match[3]) {
          const divider = match[3].length === 2 ? 100 : 1000;
          time += fraction / divider;
        }
        parsed.push({ time, text });
      });
    } else if (text) {
      parsed.push({ time: null, text });
    }
  });

  return parsed.sort((a, b) => {
    if (a.time === null && b.time === null) return 0;
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time - b.time;
  });
}
