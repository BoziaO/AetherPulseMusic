import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPageByPath, userProfile } from "../data/musicData";
import useAuthSession from "../hooks/useAuthSession";
import usePageData from "../hooks/usePageData";
import { buildApiUrl, fetchJson } from "../lib/api";
import { Bell, Menu, Music, Search, Settings, Sparkles, X, ArrowUp } from "./Icons";
import Player from "./Player";
import MiniPlayer from "./MiniPlayer";
import Sidebar from "./Sidebar";
import QueueModal from "./QueueModal";
import LyricsModal from "./LyricsModal";
import { useToast, useToastCenter } from "./Toast";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { extractColors, applyDynamicColors, clearDynamicColors } from "../lib/colorExtractor";

const SEARCH_FILTERS = ["songs", "playlists", "albums", "artists"];

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
  const recentIds = useMemo(
    () => recentPlays.map((p) => p.videoId).filter(Boolean).slice(0, 5).join(","),
    [recentPlays],
  );
  const pageRequest = usePageData(currentPage.key, currentPage.key === "home" ? { recent: recentIds } : {});
  const showToast = useToast();
  const toastCenter = useToastCenter();
  const { language, t } = useLanguage();
  const { dynamicColors } = useTheme();
  const filterLabels = language === "pl"
    ? { songs: "Piosenki", playlists: "Playlisty", albums: "Albumy", artists: "Wykonawcy" }
    : { songs: "Songs", playlists: "Playlists", albums: "Albums", artists: "Artists" };

  const resolvedUser = authSession.data?.auth?.user || userProfile;

  // Track / player state
  const [nowPlaying, setNowPlaying] = useState(null);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    return parseInt(localStorage.getItem("ap-player-volume") || "80", 10);
  });
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState("none"); // 'none', 'one', 'all'
  const [queue, setQueue] = useState([]);
  const [shuffledQueue, setShuffledQueue] = useState([]);

  // Queue and Lyrics states
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);

  // Search state
  const [query, setQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("songs");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const notificationsRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Search history
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ap:search-history") || "[]"); }
    catch { return []; }
  });

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
  const queueRef = useRef(queue);
  const nowPlayingRef = useRef(nowPlaying);
  const isShuffledRef = useRef(isShuffled);

  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffledQueueRef.current = shuffledQueue; }, [shuffledQueue]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { nowPlayingRef.current = nowPlaying; }, [nowPlaying]);
  useEffect(() => { isShuffledRef.current = isShuffled; }, [isShuffled]);

  const currentQueueIndexRef = useRef(currentQueueIndex);
  useEffect(() => { currentQueueIndexRef.current = currentQueueIndex; }, [currentQueueIndex]);

  useEffect(() => {
    window.localStorage.setItem("boziamusic:favorites", JSON.stringify(Array.from(favorites)));
    window.localStorage.setItem("boziamusic:favoriteTracks", JSON.stringify(favoriteTracks));
  }, [favorites, favoriteTracks]);

  useEffect(() => {
    window.localStorage.setItem("boziamusic:recent", JSON.stringify(recentPlays));
  }, [recentPlays]);

  useEffect(() => {
    localStorage.setItem("ap-player-volume", volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem("ap:search-history", JSON.stringify(searchHistory.slice(0, 10)));
  }, [searchHistory]);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (nowPlaying) {
      document.title = `${nowPlaying.title} \u2014 ${nowPlaying.artist} | AetherPulse`;
    } else {
      document.title = "AetherPulse Music";
    }
  }, [nowPlaying]);

  // Extract dynamic colors from album art when track changes
  useEffect(() => {
    if (!dynamicColors || !nowPlaying?.art) {
      clearDynamicColors();
      return;
    }
    let cancelled = false;
    const artUrl = typeof nowPlaying.art === "string" ? nowPlaying.art : nowPlaying.art?.image;
    if (!artUrl) {
      clearDynamicColors();
      return;
    }
    extractColors(artUrl).then((colors) => {
      if (!cancelled) {
        applyDynamicColors(colors);
      }
    });
    return () => { cancelled = true; };
  }, [nowPlaying, dynamicColors]);

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
            onReady: () => {
              ytPlayerRef.current.setVolume(volume);
            },
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
                const rMode = repeatModeRef.current;
                if (rMode === "one") {
                  try {
                    ytPlayerRef.current?.seekTo?.(0, true);
                    ytPlayerRef.current?.playVideo?.();
                  } catch (_) {}
                } else {
                  nextTrackRef.current();
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

  const play = useCallback((item, newQueue = null) => {
    if (!item) return;

    if (newQueue) {
      setQueue(newQueue);
      if (isShuffledRef.current) {
        setShuffledQueue(shuffleArray(newQueue));
      }
      // Track the index of the played item within the new queue
      const idxInNew = newQueue.findIndex(
          (t) => (item.videoId && t.videoId === item.videoId) ||
              (t.title === item.title && t.artist === item.artist)
      );
      setCurrentQueueIndex(idxInNew >= 0 ? idxInNew : 0);
    } else {
      // Update index within the existing queue
      const existingQueue = isShuffledRef.current
          ? shuffledQueueRef.current
          : queueRef.current;
      if (existingQueue.length > 0) {
        const idx = existingQueue.findIndex(
            (t) => (item.videoId && t.videoId === item.videoId) ||
                (t.title === item.title && t.artist === item.artist)
        );
        if (idx >= 0) setCurrentQueueIndex(idx);
      }
    }

    const title = item.title || item.name || "";
    const artist =
        item.artist ||
        item.subtitle ||
        (Array.isArray(item.artists) ? item.artists.map((a) => a.name).join(", ") : "") ||
        "";
    const art = item.thumbnail || item.cover || item.art;

    // Parse duration if it's a string like "3:45"
    let duration = typeof item.durationSeconds === "number" ? item.durationSeconds : 0;
    if (!duration && item.duration) {
      duration = parseDuration(item.duration);
    }

    const nextTrack = { ...item, title, artist, art, duration, videoId: item.videoId || null };
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

  const togglePlay = useCallback(() => {
    try {
      if (!ytPlayerRef.current) return;
      const state = ytPlayerRef.current.getPlayerState();
      if (state === 1) { // Playing
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    } catch (_) {}
  }, []);

  const setCurrentQueueIndexRef = useRef(setCurrentQueueIndex);
  useEffect(() => { setCurrentQueueIndexRef.current = setCurrentQueueIndex; }, []);

  const nextTrack = useCallback(() => {
    const currentQueue = isShuffledRef.current ? shuffledQueueRef.current : (queueRef.current.length ? queueRef.current : pageRequest.data?.queue || []);
    if (currentQueue.length && nowPlayingRef.current?.videoId) {
      const idx = currentQueue.findIndex((i) => i.videoId === nowPlayingRef.current.videoId);
      if (idx >= 0 && idx < currentQueue.length - 1) {
        play(currentQueue[idx + 1]);
        return;
      } else if (repeatModeRef.current === "all" && currentQueue.length > 0) {
        play(currentQueue[0]);
        return;
      }
    }
    showToast("Koniec kolejki", "info");
  }, [pageRequest.data, play, showToast]);

  const prevTrack = useCallback(() => {
    if (currentTime > 5) {
      handleSeek(0);
      return;
    }
    const currentQueue = isShuffledRef.current ? shuffledQueueRef.current : (queueRef.current.length ? queueRef.current : pageRequest.data?.queue || []);
    if (currentQueue.length && nowPlayingRef.current?.videoId) {
      const idx = currentQueue.findIndex((i) => i.videoId === nowPlayingRef.current.videoId);
      if (idx > 0) {
        play(currentQueue[idx - 1]);
        return;
      }
    }
    handleSeek(0);
  }, [currentTime, pageRequest.data, play]);

  const nextTrackRef = useRef(nextTrack);
  useEffect(() => { nextTrackRef.current = nextTrack; }, [nextTrack]);

  function handleSeek(seconds) {
    setCurrentTime(seconds);
    try {
      ytPlayerRef.current?.seekTo?.(seconds, true);
    } catch (_) {}
  }

  function handleVolumeChange(newVol) {
    const v = Math.max(0, Math.min(100, newVol));
    setVolume(v);
    try {
      ytPlayerRef.current?.setVolume?.(v);
    } catch (_) {}
  }

  function parseDuration(durationStr) {
    if (!durationStr) return 0;
    if (typeof durationStr === "number") return durationStr;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  useEffect(() => {
    if (isShuffled && queue.length > 0) {
      setShuffledQueue(shuffleArray(queue));
    }
  }, [isShuffled, queue]);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => {
      const next = !prev;
      showToast(next ? "Losowe odtwarzanie włączone" : "Losowe odtwarzanie wyłączone", "info");
      return next;
    });
  }, [showToast]);

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

  const playNext = useCallback((track) => {
    const currentQueue = queueRef.current;
    const idx = currentQueueIndexRef.current;
    const insertIndex = idx >= 0 ? idx + 1 : currentQueue.length;
    const nextQueue = [...currentQueue];
    nextQueue.splice(insertIndex, 0, track);
    setQueue(nextQueue);
    showToast(language === "pl" ? "Dodano do kolejki" : "Added to queue", "success");
  }, [showToast, language]);

  const addToQueue = useCallback((track) => {
    setQueue((prev) => [...prev, track]);
    showToast(language === "pl" ? "Dodano na koniec kolejki" : "Added to end of queue", "info");
  }, [showToast, language]);

  // Media Session API Support
  useEffect(() => {
    if ('mediaSession' in navigator && nowPlaying) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: nowPlaying.title,
        artist: nowPlaying.artist,
        album: nowPlaying.album || '',
        artwork: [
          { src: nowPlaying.art, sizes: '96x96', type: 'image/png' },
          { src: nowPlaying.art, sizes: '128x128', type: 'image/png' },
          { src: nowPlaying.art, sizes: '192x192', type: 'image/png' },
          { src: nowPlaying.art, sizes: '256x256', type: 'image/png' },
          { src: nowPlaying.art, sizes: '384x384', type: 'image/png' },
          { src: nowPlaying.art, sizes: '512x512', type: 'image/png' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => { togglePlay(); });
      navigator.mediaSession.setActionHandler('pause', () => { togglePlay(); });
      navigator.mediaSession.setActionHandler('previoustrack', () => { prevTrack(); });
      navigator.mediaSession.setActionHandler('nexttrack', () => { nextTrack(); });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        handleSeek(Math.max(0, currentTime - (details.seekOffset || 10)));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        handleSeek(Math.min(audioDuration, currentTime + (details.seekOffset || 10)));
      });
    }
  }, [nowPlaying, currentTime, audioDuration, togglePlay, prevTrack, nextTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping) return;

      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === " " || event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePlay();
      }
      if (event.key === "ArrowRight") {
        if (event.shiftKey) nextTrack();
        else handleSeek(Math.min(audioDuration, currentTime + 10));
      }
      if (event.key === "ArrowLeft") {
        if (event.shiftKey) prevTrack();
        else handleSeek(Math.max(0, currentTime - 10));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        handleVolumeChange(volume + 5);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        handleVolumeChange(volume - 5);
      }
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        handleVolumeChange(volume > 0 ? 0 : 80);
      }
      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        setShowLyricsModal(prev => !prev);
      }
      if (event.key.toLowerCase() === "q") {
        event.preventDefault();
        setShowQueueModal(prev => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextTrack, prevTrack, togglePlay, currentTime, audioDuration, volume]);

  useEffect(() => {
    setQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    setNotificationsOpen(false);
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  function saveSearchToHistory(q) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => [trimmed, ...prev.filter((p) => p !== trimmed)].slice(0, 10));
  }

  function handleSearchResultClick(item) {
    setSearchOpen(false);
    saveSearchToHistory(query);
    setQuery("");
    if (!item) return;

    if (item.resultType === "playlist" && item.browseId) {
      navigate(`/playlists?playlist=${encodeURIComponent(item.browseId)}`);
      return;
    }
    if (item.resultType === "artist" && item.browseId) {
      // Do not double-encode — React Router decodes params automatically
      navigate(`/artist/${item.browseId}`);
      return;
    }
    if (item.resultType === "album" && item.browseId) {
      navigate(`/album/${item.browseId}`);
      return;
    }
    if (item.videoId) {
      play(item, searchResults.filter(r => r.videoId));
    }
  }

  const showSearch = searchOpen;
  const favoriteItems = useMemo(() => Object.values(favoriteTracks), [favoriteTracks]);

  const toggleFavoriteTrack = useCallback((track) => {
    const id = getTrackKey(track);
    setFavorites((prevFavorites) => {
      const next = new Set(prevFavorites);
      const alreadyFavorite = next.has(id);
      if (alreadyFavorite) {
        next.delete(id);
      } else {
        next.add(id);
      }

      setFavoriteTracks((prevTracks) => {
        const nextTracks = { ...prevTracks };
        if (alreadyFavorite) {
          delete nextTracks[id];
        } else {
          nextTracks[id] = track;
        }
        return nextTracks;
      });

      return next;
    });
  }, []);

  const outletContext = useMemo(
    () => ({
      pageData: pageRequest.data,
      pageLoading: pageRequest.loading,
      play,
      playNext,
      addToQueue,
      nowPlaying,
      query,
      searchFilter,
      searchResults,
      searchLoading,
      authSession,
      favorites,
      favoriteItems,
      recentPlays,
      toggleFavoriteTrack,
    }),
    [
      pageRequest.data,
      pageRequest.loading,
      play,
      playNext,
      addToQueue,
      nowPlaying,
      query,
      searchFilter,
      searchResults,
      searchLoading,
      authSession,
      favorites,
      favoriteItems,
      recentPlays,
      toggleFavoriteTrack,
    ],
  );

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
              className="flex items-center gap-3 lg:gap-5 justify-between mb-8 lg:mb-12 sticky top-0 z-[100] py-3 lg:py-4 -mx-2 px-2 lg:-mt-4 lg:px-4 rounded-b-2xl"
              style={{
                backgroundColor: "var(--bg-main)",
                borderBottom: "1px solid var(--surface-line)",
              }}
          >
            <button
                type="button"
                className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-main)" }}
                onClick={() => setSidebarOpen(true)}
                aria-label="Otwórz menu"
            >
              <Menu size={20} />
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
                    placeholder={`${currentPage.searchPlaceholder || (language === "pl" ? "Szukaj" : "Search")} (/)`}
                    ref={searchInputRef}
                    className="w-full rounded-xl py-3 pl-11 pr-10 focus:outline-none text-sm font-medium transition-colors"
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && query.trim()) {
                        saveSearchToHistory(query);
                      }
                    }}
                />
                {query && (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all"
                        style={{ color: "var(--text-muted)" }}
                        aria-label={language === "pl" ? "Wyczyść wyszukiwanie" : "Clear search"}
                    >
                      <X size={16} />
                    </button>
                )}
              </div>

              {showSearch && (
                  <div
                      className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-[110] animate-fade"
                      style={{
                        backgroundColor: "var(--bg-panel)",
                        border: "1px solid var(--surface-line)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                      }}
                  >
                    <div className="p-3 flex gap-2 overflow-x-auto" style={{ borderBottom: "1px solid var(--surface-line)" }}>
                      {SEARCH_FILTERS.map((f) => (
                          <button
                              key={f}
                              onClick={() => setSearchFilter(f)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              style={searchFilter === f
                                  ? { backgroundColor: "var(--primary)", color: "#fff" }
                                  : { backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }
                              }
                          >
                            {filterLabels[f]}
                          </button>
                      ))}
                    </div>

                    <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto p-2 space-y-0.5">
                      {query.trim().length === 0 && searchHistory.length > 0 ? (
                        <div>
                          <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-40">
                              {language === "pl" ? "Ostatnie wyszukiwania" : "Recent searches"}
                            </span>
                            <button onClick={() => setSearchHistory([])} className="text-[10px] font-semibold" style={{ color: "var(--primary)" }}>
                              {language === "pl" ? "Wyczyść" : "Clear"}
                            </button>
                          </div>
                          {searchHistory.map((h, i) => (
                            <button key={i} className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors hover:bg-[var(--bg-hover)]"
                              style={{ color: "var(--text-main)" }}
                              onClick={() => { setQuery(h); }}>
                              <Search size={14} className="opacity-30 flex-shrink-0" />
                              <span className="text-sm truncate">{h}</span>
                            </button>
                          ))}
                        </div>
                      ) : query.trim().length > 0 && query.trim().length < 2 ? (
                        <div className="p-10 text-center">
                          <p className="text-sm font-medium opacity-50">
                            {language === "pl" ? "Wpisz co najmniej 2 znaki..." : "Type at least 2 characters..."}
                          </p>
                        </div>
                      ) : searchLoading ? (
                          <div className="p-10 flex flex-col items-center justify-center gap-3">
                            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", borderTopColor: "var(--primary)" }} />
                            <p className="text-xs font-medium opacity-50">
                              {language === "pl" ? "Szukam..." : "Searching..."}
                            </p>
                          </div>
                      ) : searchResults.length > 0 ? (
                          searchResults.map((item, idx) => (
                              <button
                                  key={idx}
                                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors hover:bg-[var(--bg-hover)]"
                                  style={{ color: "var(--text-main)" }}
                                  onClick={() => handleSearchResultClick(item)}
                              >
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: "var(--bg-card)" }}>
                                  {(item.thumbnail || item.cover || item.art) && <img src={item.thumbnail || item.cover || item.art} alt="" className="w-full h-full object-cover" loading="lazy" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate">{item.title}</p>
                                  <p className="text-xs truncate opacity-50">
                                    {item.artists?.map((a) => a.name).join(", ") || item.author || "YouTube Music"}
                                  </p>
                                </div>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md opacity-40" style={{ backgroundColor: "var(--bg-hover)" }}>
                                  {item.resultType}
                                </span>
                              </button>
                          ))
                      ) : (
                          <div className="p-10 text-center">
                            <p className="text-sm font-medium opacity-50">
                              {language === "pl" ? "Brak wyników." : "No results."}
                            </p>
                          </div>
                      )}
                    </div>
                  </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-5 sm:ml-4 lg:ml-8">
              <div className="relative" ref={notificationsRef}>
                <button
                    onClick={() => {
                      const opening = !notificationsOpen;
                      setNotificationsOpen(opening);
                      if (opening) toastCenter?.markAllNotificationsRead?.();
                    }}
                    className="relative p-2 rounded-xl transition-colors"
                    style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-hover)" }}
                    title={t("notifications")}
                    aria-label={t("notifications")}
                    aria-expanded={notificationsOpen}
                >
                  <Bell size={18} />
                  {toastCenter?.unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                      style={{ backgroundColor: "var(--primary)", color: "#fff" }}
                    >
                      {toastCenter.unreadCount > 9 ? "9+" : toastCenter.unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 max-h-96 rounded-2xl overflow-hidden z-[120] animate-fade"
                    style={{
                      backgroundColor: "var(--bg-panel)",
                      border: "1px solid var(--surface-line)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                    }}
                  >
                    <div
                      className="p-3 flex items-center justify-between"
                      style={{ borderBottom: "1px solid var(--surface-line)" }}
                    >
                      <span className="text-xs font-semibold opacity-50">{t("notifications")}</span>
                      <button
                        type="button"
                        onClick={() => toastCenter?.clearNotifications?.()}
                        className="text-xs font-semibold"
                        style={{ color: "var(--primary)" }}
                      >
                        {t("clear")}
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-80 p-2 space-y-1">
                      {toastCenter?.notifications?.length ? (
                        toastCenter.notifications.map((n) => (
                          <div
                            key={n.id}
                            className="p-3 rounded-xl"
                            style={{
                              backgroundColor: n.read ? "transparent" : "var(--bg-hover)",
                              border: "1px solid var(--surface-line)",
                            }}
                          >
                            <p className="text-sm font-medium">{n.message}</p>
                            <p className="mt-1 text-[10px] opacity-40">
                              {new Date(n.createdAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-sm font-medium opacity-50">
                          {t("noNotifications")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                  onClick={() => navigate("/settings")}
                  className="relative hidden sm:flex p-2 rounded-xl transition-colors"
                  style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-hover)" }}
                  title={t("settings")}
                  aria-label={t("settings")}
              >
                <Settings size={18} />
              </button>
              <div className="h-7 w-px mx-1" style={{ backgroundColor: "var(--surface-line)" }}></div>
              {authSession.data?.auth?.connected ? (
                  <div className="flex items-center gap-4">
                    <button
                        onClick={handleLogout}
                        className="text-xs font-semibold opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-main)" }}
                    >
                      {language === "pl" ? "Wyloguj" : "Logout"}
                    </button>
                    <div className="w-9 h-9 rounded-xl overflow-hidden cursor-pointer" style={{ border: "1px solid var(--surface-line)" }}>
                      {resolvedUser.picture && <img src={resolvedUser.picture} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </div>
              ) : (
                  <a
                      href={loginUrl}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors"
                      style={{ backgroundColor: "var(--primary)", color: "#fff" }}
                  >
                    <Sparkles size={14} />
                    {language === "pl" ? "Zaloguj" : "Sign in"}
                  </a>
              )}
            </div>
          </header>

          {pageRequest.error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                <p className="font-medium mb-2">⚠️ {language === "pl" ? "Błąd ładowania danych" : "Data loading error"}: {pageRequest.error}.</p>
                <p className="opacity-70 mb-3">{language === "pl" ? "Upewnij się, że backend działa" : "Make sure backend is running"} (<code>npm run dev</code>).</p>
                <button
                  onClick={() => {
                    pageRequest.refresh?.();
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                >
                  {language === "pl" ? "Spróbuj ponownie" : "Try again"}
                </button>
              </div>
          )}

          <div key={location.pathname + location.search} className="page-transition">
            <Outlet context={outletContext} />
          </div>
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
                onToggleFavorite={() => toggleFavoriteTrack(nowPlaying)}
                onHide={() => setPlayerVisible(false)}
                onShowQueue={() => setShowQueueModal(true)}
                onShowLyrics={() => setShowLyricsModal(true)}
            />
        ) : nowPlaying ? (
            <MiniPlayer
                track={nowPlaying}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onNext={nextTrack}
                onExpand={() => setPlayerVisible(true)}
                progress={audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}
            />
        ) : null}

        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-24 lg:bottom-8 left-6 w-10 h-10 rounded-xl flex items-center justify-center z-[180] transition-transform active:scale-95 animate-fade"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)", color: "var(--text-main)" }}
            title={language === "pl" ? "Wróć na górę" : "Back to top"}
            aria-label={language === "pl" ? "Wróć na górę" : "Back to top"}
          >
            <ArrowUp size={18} />
          </button>
        )}

        <QueueModal
            isOpen={showQueueModal}
            onClose={() => setShowQueueModal(false)}
            queue={isShuffled ? shuffledQueue : (queue.length ? queue : pageRequest.data?.queue || [])}
            currentTrackIndex={currentQueueIndex}
            onSelectTrack={(index) => {
              const currentQueue = isShuffled ? shuffledQueue : (queue.length ? queue : pageRequest.data?.queue || []);
              if (currentQueue[index]) {
                play(currentQueue[index]);
                setCurrentQueueIndex(index);
              }
            }}
            onRemoveTrack={(index) => {
              if (isShuffled) {
                const next = [...shuffledQueue];
                next.splice(index, 1);
                setShuffledQueue(next);
              } else {
                const next = [...queue];
                next.splice(index, 1);
                setQueue(next);
              }
            }}
        />

        <LyricsModal
            isOpen={showLyricsModal}
            onClose={() => setShowLyricsModal(false)}
            trackTitle={nowPlaying?.title || ""}
            trackArtist={nowPlaying?.artist || ""}
            videoId={nowPlaying?.videoId}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeek={handleSeek}
        />
      </div>
  );
}

export default AppShell;