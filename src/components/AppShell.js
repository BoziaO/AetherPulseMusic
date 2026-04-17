import React, { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPageByPath, userProfile } from "../data/musicData";
import useAuthSession from "../hooks/useAuthSession";
import usePageData from "../hooks/usePageData";
import { buildApiUrl, fetchJson } from "../lib/api";
import { Bell, Menu, Music, Search, Settings, Sparkles, X } from "./Icons";
import Player from "./Player";
import Sidebar from "./Sidebar";
import { useToast } from "./Toast";
import { useTheme } from "../contexts/ThemeContext";

const SEARCH_FILTERS = ["songs", "playlists", "albums", "artists"];
const FILTER_LABELS = { songs: "Piosenki", playlists: "Playlisty", albums: "Albumy", artists: "Wykonawcy" };

function getTrackKey(track) {
  return track?.videoId || `${track?.title || "track"}-${track?.artist || track?.subtitle || ""}`;
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = getPageByPath(location.pathname);
  const authSession = useAuthSession();
  const [recentPlays, setRecentPlays] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("boziamusic:recent") || "[]");
    } catch {
      return [];
    }
  });
  const recentIds = recentPlays.map(p => p.videoId).filter(Boolean).slice(0, 5).join(',');
  const pageRequest = usePageData(currentPage.key, currentPage.key === "home" ? { recent: recentIds } : {});
  const showToast = useToast();
  const { liquidGlassEnabled, blurIntensity, transparency } = useTheme();

  const resolvedUser = authSession.data?.auth?.user || userProfile;

  // Track / player state
  const [nowPlaying, setNowPlaying] = useState(null);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState("none"); // 'none', 'one', 'all'
  const [shuffledQueue, setShuffledQueue] = useState([]);

  // Search state
  const [query, setQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("songs");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // YouTube IFrame API refs
  const ytPlayerRef = useRef(null);
  const ytReadyRef = useRef(false);
  const intervalRef = useRef(null);

  // Favorites state
  const [favorites, setFavorites] = useState(() => {
    try {
      return new Set(JSON.parse(window.localStorage.getItem("boziamusic:favorites") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [favoriteTracks, setFavoriteTracks] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("boziamusic:favoriteTracks") || "{}");
    } catch {
      return {};
    }
  });

  // Use refs for values needed inside YT callbacks to avoid stale closures
  const repeatModeRef = useRef(repeatMode);
  const shuffledQueueRef = useRef(shuffledQueue);
  const nowPlayingRef = useRef(nowPlaying);
  const pageQueueRef = useRef([]);
  const isShuffledRef = useRef(isShuffled);

  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffledQueueRef.current = shuffledQueue; }, [shuffledQueue]);
  useEffect(() => { nowPlayingRef.current = nowPlaying; }, [nowPlaying]);
  useEffect(() => { isShuffledRef.current = isShuffled; }, [isShuffled]);
  useEffect(() => { pageQueueRef.current = pageRequest.data?.queue || []; }, [pageRequest.data]);

  useEffect(() => {
    window.localStorage.setItem("boziamusic:favorites", JSON.stringify(Array.from(favorites)));
    window.localStorage.setItem("boziamusic:favoriteTracks", JSON.stringify(favoriteTracks));
  }, [favorites, favoriteTracks]);

  useEffect(() => {
    window.localStorage.setItem("boziamusic:recent", JSON.stringify(recentPlays));
  }, [recentPlays]);

  // Load YouTube IFrame API once on mount
  useEffect(() => {
    function initYTPlayer() {
      if (ytReadyRef.current) return;
      ytReadyRef.current = true;
      try {
        ytPlayerRef.current = new window.YT.Player("yt-hidden-player", {
          height: "1",
          width: "1",
          playerVars: {
            autoplay: 0,
            controls: 0,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onStateChange: (event) => {
              const YTState = window.YT?.PlayerState;
              if (!YTState) return;
              if (event.data === YTState.PLAYING) {
                setIsPlaying(true);
                try {
                  const dur = ytPlayerRef.current.getDuration();
                  if (dur > 0) setAudioDuration(dur);
                } catch (_) {}
                startInterval();
              } else if (event.data === YTState.PAUSED) {
                setIsPlaying(false);
                stopInterval();
              } else if (event.data === YTState.ENDED) {
                setIsPlaying(false);
                setCurrentTime(0);
                stopInterval();
                // Use refs to avoid stale closure
                const rMode = repeatModeRef.current;
                if (rMode === "one") {
                  try {
                    ytPlayerRef.current?.seekTo?.(0, true);
                    ytPlayerRef.current?.playVideo?.();
                  } catch (_) {}
                } else {
                  // next track from queue
                  const queue = isShuffledRef.current
                    ? shuffledQueueRef.current
                    : pageQueueRef.current;
                  const current = nowPlayingRef.current;
                  if (queue.length && current?.videoId) {
                    const idx = queue.findIndex((i) => i.videoId === current.videoId);
                    if (idx >= 0 && idx < queue.length - 1) {
                      playRef.current(queue[idx + 1]);
                    } else if (rMode === "all" && queue.length > 0) {
                      playRef.current(queue[0]);
                    }
                  }
                }
              }
            },
            onError: (e) => {
              console.warn("YT Player error code:", e.data);
              const errorMessages = {
                2: "Nieprawidłowy videoId.",
                5: "Błąd HTML5 playera.",
                100: "Film nie istnieje lub jest prywatny.",
                101: "Film nie może być odtwarzany.",
                150: "Film nie może być odtwarzany.",
              };
              const msg = errorMessages[e.data] || `Błąd odtwarzacza (kod ${e.data}).`;
              showToast(msg, "error");
            },
          },
        });
      } catch (err) {
        console.warn("Failed to init YT player:", err);
      }
    }

    if (window.YT?.Player) {
      initYTPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        initYTPlayer();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
    }

    return () => {
      stopInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startInterval() {
    stopInterval();
    intervalRef.current = setInterval(() => {
      try {
        if (ytPlayerRef.current?.getCurrentTime) {
          const t = ytPlayerRef.current.getCurrentTime();
          setCurrentTime(t);
          const dur = ytPlayerRef.current.getDuration();
          if (dur > 0) setAudioDuration(dur);
        }
      } catch (_) {}
    }, 500);
  }

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  const play = useCallback((item) => {
    if (!item) return;
    const title = item.title || item.name || "";
    const artist =
      item.artist ||
      item.subtitle ||
      (Array.isArray(item.artists) ? item.artists.map((a) => a.name).join(", ") : "") ||
      "";
    const art = item.thumbnail || item.cover || item.art;
    const duration = typeof item.durationSeconds === "number" ? item.durationSeconds : 0;

    const nextTrack = { title, artist, art, duration, videoId: item.videoId || null };
    setNowPlaying(nextTrack);
    setRecentPlays((current) => {
      const key = getTrackKey(nextTrack);
      return [nextTrack, ...current.filter((track) => getTrackKey(track) !== key)].slice(0, 25);
    });
    setCurrentTime(0);
    setAudioDuration(duration || 0);
    setPlayerVisible(true);

    if (item.videoId) {
      try {
        if (ytPlayerRef.current?.loadVideoById) {
          ytPlayerRef.current.loadVideoById(item.videoId);
        }
      } catch (err) {
        console.warn("Could not load video:", err);
        showToast("Nie udało się załadować utworu.", "error");
      }
    } else {
      showToast(`Odtwarzam: ${title}`, "info");
    }
  }, [showToast]);

  // Store play in ref for use inside YT callbacks
  const playRef = useRef(play);
  useEffect(() => { playRef.current = play; }, [play]);

  const togglePlay = useCallback(() => {
    try {
      if (!ytPlayerRef.current) return;
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    } catch (_) {}
  }, [isPlaying]);

  // Previous / Next behavior: prefer queue navigation, fallback to seek +/-10s
  const prevTrack = useCallback(() => {
    const queue = isShuffled ? shuffledQueue : (pageRequest.data?.queue || []);
    if (queue.length && nowPlaying?.videoId) {
      const idx = queue.findIndex((i) => i.videoId === nowPlaying.videoId);
      if (idx > 0) {
        play(queue[idx - 1]);
        return;
      }
    }
    try {
      const t = ytPlayerRef.current?.getCurrentTime?.() || 0;
      handleSeek(Math.max(0, Math.round(t - 10)));
    } catch (_) {}
  }, [pageRequest.data, nowPlaying, play, isShuffled, shuffledQueue]);

  const nextTrack = useCallback(() => {
    const queue = isShuffled ? shuffledQueue : (pageRequest.data?.queue || []);
    if (queue.length && nowPlaying?.videoId) {
      const idx = queue.findIndex((i) => i.videoId === nowPlaying.videoId);
      if (idx >= 0 && idx < queue.length - 1) {
        play(queue[idx + 1]);
        return;
      } else if (repeatMode === "all" && idx === queue.length - 1) {
        play(queue[0]);
        return;
      }
    }
    try {
      const t = ytPlayerRef.current?.getCurrentTime?.() || 0;
      const dur = ytPlayerRef.current?.getDuration?.() || audioDuration || 0;
      handleSeek(Math.min(dur, Math.round(t + 10)));
    } catch (_) {}
  }, [pageRequest.data, nowPlaying, play, audioDuration, isShuffled, shuffledQueue, repeatMode]);

  function handleSeek(seconds) {
    setCurrentTime(seconds);
    try {
      ytPlayerRef.current?.seekTo?.(seconds, true);
    } catch (_) {}
  }

  function handleVolumeChange(newVol) {
    setVolume(newVol);
    try {
      ytPlayerRef.current?.setVolume?.(newVol);
    } catch (_) {}
  }

  // Shuffle utility
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Update queue when page data or shuffle changes
  useEffect(() => {
    const queue = pageRequest.data?.queue || [];
    if (queue.length > 0) {
      setShuffledQueue(isShuffled ? shuffleArray(queue) : queue);
    }
  }, [pageRequest.data?.queue, isShuffled]);

  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => {
      const next = !prev;
      showToast(next ? "Losowe odtwarzanie włączone" : "Losowe odtwarzanie wyłączone", "info");
      return next;
    });
  }, [showToast]);

  // Toggle repeat
  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === "none") {
        showToast("Powtarzaj wszystko", "info");
        return "all";
      }
      if (prev === "all") {
        showToast("Powtarzaj jeden utwór", "info");
        return "one";
      }
      showToast("Powtarzanie wyłączone", "info");
      return "none";
    });
  }, [showToast]);

  // Reset search on page navigation
  useEffect(() => {
    setQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if ((event.key === " " || event.key.toLowerCase() === "k") && !isTyping) {
        event.preventDefault();
        togglePlay();
      }
      if (event.key === "ArrowRight" && !isTyping) nextTrack();
      if (event.key === "ArrowLeft" && !isTyping) prevTrack();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextTrack, prevTrack, togglePlay]);

  // Server-side nowPlaying init (first load)
  useEffect(() => {
    const serverNowPlaying = pageRequest.data?.nowPlaying;
    if (serverNowPlaying && !nowPlaying) {
      setNowPlaying(serverNowPlaying);
      setPlayerVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRequest.data?.nowPlaying]);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const results = await fetchJson(
          `/api/ytmusic/search?q=${encodeURIComponent(trimmed)}&filter=${encodeURIComponent(searchFilter)}&limit=12`,
        );
        setSearchResults(Array.isArray(results) ? results : []);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, searchFilter]);

  const loginUrl = buildApiUrl("/api/auth/google");

  async function handleLogout() {
    try {
      await fetchJson("/api/auth/logout", { method: "POST" });
      showToast("Wylogowano pomyślnie.", "success");
    } catch {
      showToast("Błąd wylogowania.", "error");
    } finally {
      authSession.refresh();
    }
  }

  function handleSearchResultClick(item) {
    setSearchOpen(false);
    setQuery("");
    if (!item) return;

    if (item.resultType === "playlist" && item.browseId) {
      navigate(`/playlists?playlist=${encodeURIComponent(item.browseId)}`);
      return;
    }
    if (item.resultType === "artist" && item.browseId) {
      navigate(`/artist/${encodeURIComponent(item.browseId)}`);
      return;
    }
    if (item.resultType === "album" && item.browseId) {
      navigate(`/album/${encodeURIComponent(item.browseId)}`);
      return;
    }
    if (item.videoId) {
      play(item);
    }
  }

  const showSearch = searchOpen && query.trim().length >= 2;

  return (
    <div
      className="flex min-h-screen font-sans"
      style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
    >
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main 
        className={`flex-1 lg:ml-[260px] px-4 sm:px-6 lg:px-10 pt-4 sm:pt-6 lg:pt-10 overflow-x-hidden transition-all duration-500 ${
          playerVisible && nowPlaying 
            ? "pb-64 sm:pb-72 lg:pb-40" 
            : "pb-24 sm:pb-28 lg:pb-12"
        }`} 
        style={{ backgroundColor: "var(--bg-main)" }}
      >
        <header
          className={`flex items-center gap-3 lg:gap-5 justify-between mb-8 lg:mb-12 sticky top-0 z-[100] py-3 lg:py-4 -mx-2 px-2 lg:-mt-4 lg:px-4 rounded-b-[28px] lg:rounded-b-[32px] ${
            liquidGlassEnabled ? 'backdrop-blur' : ''
          }`}
          style={{
            backgroundColor: liquidGlassEnabled
              ? `rgba(var(--bg-main-rgb, 5, 8, 22), ${transparency})`
              : "color-mix(in srgb, var(--bg-main) 80%, transparent)",
            backdropFilter: liquidGlassEnabled ? `blur(${blurIntensity}px)` : undefined
          }}
        >
          <button
            type="button"
            className="lg:hidden w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-main)" }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Otwórz menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1 max-w-2xl relative min-w-0" ref={searchRef}>
            <div className="relative group">
              <Search
                size={20}
                className="absolute left-5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--text-soft)" }}
              />
              <input
                type="text"
                placeholder={currentPage.searchPlaceholder || "Szukaj..."}
                ref={searchInputRef}
                className="w-full rounded-2xl py-3.5 sm:py-4 pl-12 sm:pl-14 pr-11 sm:pr-12 focus:outline-none transition-all text-sm font-medium shadow-md"
                style={{
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--surface-line)",
                  color: "var(--text-main)",
                }}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {showSearch && (
              <div
                className={`absolute top-full left-0 right-0 mt-3 sm:mt-4 rounded-[24px] sm:rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-[110] ${
                  liquidGlassEnabled ? 'backdrop-blur' : ''
                }`}
                style={{
                  backgroundColor: liquidGlassEnabled
                    ? `rgba(var(--bg-panel-rgb, 16, 23, 42), ${transparency})`
                    : "var(--bg-panel)",
                  border: "1px solid var(--surface-line)",
                  boxShadow: "var(--shadow-card)",
                  backdropFilter: liquidGlassEnabled ? `blur(${blurIntensity}px)` : undefined
                }}
              >
                <div className="p-3 sm:p-4 flex gap-2 overflow-x-auto" style={{ borderBottom: "1px solid var(--surface-line)" }}>
                  {SEARCH_FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setSearchFilter(f)}
                      className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all"
                      style={searchFilter === f
                        ? { backgroundColor: "var(--primary)", color: "#fff" }
                        : { backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }
                      }
                    >
                      {FILTER_LABELS[f]}
                    </button>
                  ))}
                </div>

                <div className="max-h-[65vh] sm:max-h-[480px] overflow-y-auto p-3 space-y-1">
                  {searchLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                      <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", borderTopColor: "var(--primary)" }}></div>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>Przeszukiwanie bazy...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-left group"
                        style={{ color: "var(--text-main)" }}
                        onClick={() => handleSearchResultClick(item)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform" style={{ backgroundColor: "var(--bg-card)" }}>
                          {item.thumbnail && <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate" style={{ color: "var(--text-main)" }}>{item.title}</p>
                          <p className="text-xs truncate mt-1" style={{ color: "var(--text-muted)" }}>
                            {item.artists?.map((a) => a.name).join(", ") || item.author || "YouTube Music"}
                          </p>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md" style={{ color: "var(--text-soft)", backgroundColor: "var(--bg-hover)" }}>
                          {item.resultType}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <p className="font-medium" style={{ color: "var(--text-muted)" }}>Brak wyników dla tej kategorii.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-5 sm:ml-4 lg:ml-8">
            <button
              onClick={() => navigate("/settings")}
              className="relative hidden sm:flex p-2.5 rounded-full transition-all hover:scale-110 active:scale-90"
              style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-hover)" }}
              title="Ustawienia"
            >
              <Settings size={22} />
            </button>
            <button
              className="relative hidden sm:flex p-2.5 rounded-full transition-all hover:scale-110 active:scale-90"
              style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-hover)" }}
            >
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: "var(--primary)" }}></span>
            </button>
            <div className="h-7 w-px mx-1" style={{ backgroundColor: "var(--surface-line)" }}></div>
            {authSession.data?.auth?.connected ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLogout}
                  className="text-xs font-black uppercase tracking-widest transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  Wyloguj
                </button>
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xl hover:scale-105 transition-transform cursor-pointer" style={{ border: "2px solid var(--surface-line)" }}>
                  {resolvedUser.picture && <img src={resolvedUser.picture} alt="" className="w-full h-full object-cover" />}
                </div>
              </div>
            ) : (
              <a
                href={loginUrl}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg"
                style={{ backgroundColor: "var(--primary)", color: "#fff" }}
              >
                <Sparkles size={16} fill="white" />
                Zaloguj
              </a>
            )}
          </div>
        </header>

        {pageRequest.error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium">
            ⚠️ Błąd ładowania danych: {pageRequest.error}. Upewnij się, że backend działa (<code>npm run dev</code>).
          </div>
        )}

        <Outlet
          context={{
            pageData: pageRequest.data,
            pageLoading: pageRequest.loading,
            play,
            query,
            searchFilter,
            searchResults,
            searchLoading,
            authSession,
            favorites,
            favoriteItems: Object.values(favoriteTracks),
            recentPlays,
            toggleFavoriteTrack: (track) => {
              const id = getTrackKey(track);
              const next = new Set(favorites);
              const nextTracks = { ...favoriteTracks };
              if (next.has(id)) {
                next.delete(id);
                delete nextTracks[id];
              } else {
                next.add(id);
                nextTracks[id] = track;
              }
              setFavorites(next);
              setFavoriteTracks(nextTracks);
            },
          }}
        />
      </main>

      {/* Hidden YouTube Player */}
      <div id="yt-hidden-player" className="hidden"></div>

      {playerVisible && nowPlaying ? (
        <Player
          track={nowPlaying}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          currentTime={currentTime}
          audioDuration={audioDuration}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          onPrev={prevTrack}
          onNext={nextTrack}
          isShuffled={isShuffled}
          repeatMode={repeatMode}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          isFavorite={favorites.has(getTrackKey(nowPlaying))}
          onToggleFavorite={() => {
            const id = getTrackKey(nowPlaying);
            const next = new Set(favorites);
            const nextTracks = { ...favoriteTracks };
            if (next.has(id)) {
              next.delete(id);
              delete nextTracks[id];
            } else {
              next.add(id);
              nextTracks[id] = nowPlaying;
            }
            setFavorites(next);
            setFavoriteTracks(nextTracks);
          }}
          onHide={() => setPlayerVisible(false)}
        />
      ) : nowPlaying ? (
        <button
          onClick={() => setPlayerVisible(true)}
          className="fixed bottom-24 lg:bottom-8 right-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce-slow z-[180] group transition-all hover:scale-110 active:scale-95"
          style={{ 
            backgroundColor: "var(--primary)", 
            color: "#fff",
            boxShadow: "0 0 30px var(--primary)"
          }}
          title="Pokaż odtwarzacz"
        >
          <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping"></div>
          <Music size={24} className="relative z-10" />
        </button>
      ) : null}
    </div>
  );
}

export default AppShell;
