import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPageByPath, userProfile } from "../data/musicData";
import useAuthSession from "../hooks/useAuthSession";
import usePageData from "../hooks/usePageData";
import { buildApiUrl, fetchJson } from "../lib/api";
import { Bell, Search, Sparkles } from "./Icons";
import Player from "./Player";
import Sidebar from "./Sidebar";

const SEARCH_FILTERS = ["songs", "playlists", "albums", "artists"];

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = getPageByPath(location.pathname);
  const authSession = useAuthSession();
  const pageRequest = usePageData(currentPage.key);

  const resolvedUser = authSession.data?.auth?.user || userProfile;
  const [nowPlaying, setNowPlaying] = useState(null);
  const [query, setQuery] = useState("");
  const [playerVisible, setPlayerVisible] = useState(false);
  const [searchFilter, setSearchFilter] = useState("songs");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const serverNowPlaying = pageRequest.data?.nowPlaying;
    if (serverNowPlaying && !nowPlaying) {
      setNowPlaying(serverNowPlaying);
      setPlayerVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRequest.data?.nowPlaying]);

  const play = useMemo(() => {
    return (item) => {
      if (!item) return;
      const title = item.title || item.name;
      const artist =
        item.artist ||
        item.subtitle ||
        (Array.isArray(item.artists) ? item.artists.map((a) => a.name).join(", ") : "") ||
        "";
      const art = item.thumbnail || item.cover || item.art;
      const duration = typeof item.durationSeconds === "number" ? item.durationSeconds : 240;
      setNowPlaying({
        title,
        artist,
        art,
        duration,
        progress: 5,
        videoId: item.videoId || null,
      });
      setPlayerVisible(true);
    };
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
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, searchFilter]);

  const loginUrl = buildApiUrl("/api/auth/google");

  async function handleLogout() {
    try {
      await fetchJson("/api/auth/logout", { method: "POST" });
    } finally {
      authSession.refresh();
    }
  }

  function handleSearchResultClick(item) {
    setSearchOpen(false);
    if (!item) return;

    if (item.resultType === "playlist" && item.browseId) {
      navigate(`/playlists?playlist=${encodeURIComponent(item.browseId)}`);
      return;
    }

    if (item.resultType === "album" && item.browseId) {
      navigate("/albums");
      return;
    }

    if (item.resultType === "artist" && item.browseId) {
      navigate("/artists");
      return;
    }

    if (item.videoId) {
      play(item);
    }
  }

  return (
    <div className="app-shell flex bg-black min-h-screen">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.05),transparent_40%)] pointer-events-none" />
      
      <Sidebar />

      <div className="flex-1 flex flex-col ml-[260px] min-w-0">
        <header className="topbar sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 py-4 px-8 flex items-center justify-between gap-8">
          <div className="flex items-center gap-4 lg:hidden">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">BoziaMusic</h1>
          </div>

          <div className="hidden md:flex flex-1 max-w-3xl items-center gap-3">
            <div className="relative flex-1">
              <label className="w-full flex items-center gap-3 px-5 py-2.5 bg-neutral-900 border border-white/5 rounded-full text-neutral-400 focus-within:bg-neutral-800 focus-within:border-white/10 transition-all cursor-text">
                <Search size={18} />
                <input
                  type="text"
                  className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-neutral-600"
                  placeholder={currentPage.searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                />
              </label>

              {searchOpen && query.trim().length >= 2 ? (
                <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-neutral-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-[150]">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                    <p className="text-xs uppercase tracking-widest text-neutral-500">Wyniki na zywo</p>
                    <p className="text-xs text-neutral-500">{searchLoading ? "Szukam..." : `${searchResults.length} wynikow`}</p>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    {searchResults.map((item, index) => (
                      <button
                        key={`${item.resultType || "item"}-${item.videoId || item.browseId || index}`}
                        type="button"
                        onClick={() => handleSearchResultClick(item)}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 shrink-0">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-600">BM</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                          <p className="text-xs text-neutral-400 truncate">
                            {item.resultType || "wynik"}
                            {item.artists?.length ? ` • ${item.artists.map((artist) => artist.name).join(", ")}` : ""}
                            {!item.artists?.length && item.category ? ` • ${item.category}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                    {!searchLoading && searchResults.length === 0 ? (
                      <div className="px-5 py-8 text-sm text-neutral-500">Brak wynikow dla tego filtra.</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {SEARCH_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSearchFilter(filter)}
                  className={`px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                    searchFilter === filter
                      ? "bg-red-600 text-white"
                      : "bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
              <Bell size={20} />
            </button>
            
            <div className="h-8 w-px bg-white/10 mx-2" />

            {authSession.data?.auth?.connected ? (
              <div className="flex items-center gap-3 bg-neutral-900/50 border border-white/5 pl-1.5 pr-4 py-1.5 rounded-full">
                <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                  {resolvedUser.picture ? (
                    <img src={resolvedUser.picture} alt={resolvedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    resolvedUser.initials || "U"
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-white leading-tight">{resolvedUser.name}</p>
                  <p className="text-[10px] text-neutral-500 leading-tight">Google</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-red-500 transition-colors"
                >
                  Wyloguj
                </button>
              </div>
            ) : (
              <a
                href={loginUrl}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                  authSession.data?.auth?.enabled
                    ? "bg-white text-black hover:scale-105 active:scale-95"
                    : "bg-neutral-800 text-neutral-500 pointer-events-none"
                }`}
              >
                {authSession.data?.auth?.enabled ? "Zaloguj Google" : "Google OFF"}
              </a>
            )}
          </div>
        </header>

        <main className="flex-1 p-8">
          <div className="pb-32 max-w-[1600px] mx-auto">
            <Outlet
              context={{
                pageData: pageRequest.data,
                pageLoading: pageRequest.loading,
                pageError: pageRequest.error,
                play,
                query,
                searchFilter,
                searchResults,
                searchLoading,
                authSession: authSession.data,
              }}
            />
          </div>
        </main>

        {nowPlaying && playerVisible ? (
          <Player track={nowPlaying} onHide={() => setPlayerVisible(false)} />
        ) : null}

        {nowPlaying && !playerVisible ? (
          <button
            type="button"
            onClick={() => setPlayerVisible(true)}
            className="fixed bottom-6 right-6 px-5 py-3 rounded-full bg-red-600 text-white font-bold shadow-2xl shadow-red-600/20 hover:bg-red-700 z-[210]"
          >
            Pokaż player
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default AppShell;
