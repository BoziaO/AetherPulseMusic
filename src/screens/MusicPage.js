import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchJson } from "../lib/api";
import CoverArt from "../components/CoverArt";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Flame,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
} from "../components/Icons";
import { pageContent } from "../data/musicData";

function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-white font-display">{title}</h2>
      <button 
        type="button" 
        className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white transition-colors" 
        onClick={onAction}
      >
        {action}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function MetricCard({ stat, index }) {
  const icons = [Sparkles, TrendingUp, BadgeCheck];
  const Icon = icons[index % icons.length];

  return (
    <article className="metric-card bg-neutral-900/50 border border-white/5 p-6 rounded-2xl hover:bg-neutral-800 transition-all duration-300 group">
      <span className="metric-card__icon w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg text-neutral-400 group-hover:text-red-500 transition-colors">
        <Icon size={20} />
      </span>
      <strong className="block text-3xl font-bold mt-4 text-white">{stat.value}</strong>
      <p className="text-neutral-400 text-sm mt-1">{stat.label}</p>
    </article>
  );
}

function MediaCard({ item, onClick }) {
  return (
    <article className="media-card group cursor-pointer" onClick={onClick || (() => console.log("Play:", item.title))}>
      <div className="media-card__cover relative overflow-hidden rounded-xl bg-neutral-900">
        <CoverArt art={item.cover} />
        <button 
          type="button" 
          className="media-card__play absolute bottom-3 right-3 w-12 h-12 flex items-center justify-center bg-red-500 text-white rounded-full shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300" 
          aria-label={`Odtwórz ${item.title}`}
        >
          <Play size={20} fill="currentColor" />
        </button>
      </div>
      <div className="media-card__body mt-3">
        <h3 className="font-bold text-white truncate">{item.title}</h3>
        <p className="text-sm text-neutral-400 truncate">{item.subtitle}</p>
        <span className="text-xs text-neutral-500 mt-1 block">{item.meta}</span>
      </div>
    </article>
  );
}

function ChartRow({ item }) {
  return (
    <div className="chart-row group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
      <span className="chart-row__label font-bold text-neutral-500 min-w-[24px]">{item.label}</span>
      <div className="chart-row__copy flex-1 min-w-0">
        <strong className="block text-white truncate">{item.title}</strong>
        <p className="text-sm text-neutral-400 truncate">{item.subtitle}</p>
      </div>
      <span className="chart-row__change font-bold text-emerald-500 text-sm whitespace-nowrap">{item.change}</span>
    </div>
  );
}

function QueueTable({ page }) {
  return (
    <section className="bg-neutral-900/30 border border-white/5 p-6 rounded-3xl overflow-hidden">
      <SectionHeader title={page.queueTitle} action={page.queueAction} />

      <div className="w-full">
        <div className="grid grid-cols-[auto_1fr_1fr_100px_80px] gap-4 px-4 py-3 text-[10px] uppercase tracking-widest font-black text-neutral-500 border-b border-white/5">
          <span>#</span>
          <span>Tytuł</span>
          <span>Szczegóły</span>
          <div className="flex items-center gap-1">
            <RefreshCw size={12} />
            <span>Czas</span>
          </div>
          <span>Energia</span>
        </div>

        <div className="divide-y divide-white/5">
          {page.queue.map((item, index) => (
            <div 
              key={`${page.key}-${item.title}-${index}`} 
              className="grid grid-cols-[auto_1fr_1fr_100px_80px] gap-4 px-4 py-4 items-center hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <span className="text-sm font-bold text-neutral-600 group-hover:text-red-500 transition-colors w-6">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-white truncate text-sm">{item.title}</p>
                <p className="text-xs text-neutral-500 truncate">{item.artist}</p>
              </div>
              <span className="text-xs text-neutral-400 truncate">{item.detail}</span>
              <span className="text-xs text-neutral-500 font-mono">{item.duration}</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${item.energy}%` }} 
                  />
                </div>
                <span className="text-[10px] font-black text-emerald-500 w-8">{item.energy}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MusicPage({ pageKey }) {
  const { pageData, pageLoading, authSession } = useOutletContext();
  const [playlists, setPlaylists] = useState([]);
  const [importing, setImporting] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    setSelectedPlaylist(null);
    setFetchError(null);
    if (pageKey === "playlists") {
      fetchPlaylists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, authSession?.auth?.connected]);

  async function fetchPlaylists() {
    if (importing) return;
    setImporting(true);
    try {
      const results = [];
      // 1. Fetch from InnerTube (library)
      try {
        const libPlaylists = await fetchJson("/api/ytmusic/library/playlists");
        if (Array.isArray(libPlaylists)) {
          results.push(...libPlaylists);
        }
      } catch (e) {
        console.warn("Could not fetch library playlists", e);
      }
      
      // 2. Fetch from YouTube Data API (if connected)
      if (authSession?.auth?.connected) {
        try {
          const ytPlaylists = await fetchJson("/api/youtube/playlists");
          if (Array.isArray(ytPlaylists)) {
            // Deduplicate: if we already have it from library, skip
            const seenIds = new Set(results.map(p => p.browseId?.replace('VL', '')));
            const filteredYt = ytPlaylists.filter(p => !seenIds.has(p.id));
            results.push(...filteredYt);
          }
        } catch (e) {
          console.warn("Could not fetch YouTube Data API playlists", e);
        }
      }
      setPlaylists(results);
    } catch (err) {
      console.error("Błąd pobierania playlist:", err);
    } finally {
      setImporting(false);
    }
  }

  async function fetchPlaylistDetails(playlistId) {
    if (!playlistId) return;
    try {
      setLoadingPlaylist(true);
      // Ensure playlistId doesn't have VL prefix for some API calls if needed, 
      // but ytmusic.js usually handles browseId with or without it.
      const data = await fetchJson(`/api/ytmusic/playlist/${playlistId}`);
      setSelectedPlaylist(data);
    } catch (err) {
      console.error("Błąd pobierania szczegółów playlisty:", err);
      alert("Nie udało się pobrać zawartości playlisty.");
    } finally {
      setLoadingPlaylist(false);
    }
  }

  async function handleRemoveTrack(playlistId, videoId, setVideoId) {
    if (!window.confirm("Czy na pewno chcesz usunąć ten utwór z playlisty?")) return;
    try {
      await fetchJson(`/api/ytmusic/playlist/${playlistId}/tracks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: [{ videoId, setVideoId }] })
      });
      // Refresh playlist
      fetchPlaylistDetails(playlistId);
    } catch (err) {
      console.error("Błąd usuwania utworu:", err);
      alert("Nie udało się usunąć utworu.");
    }
  }

  const fallbackPage = pageContent[pageKey] || pageContent.home;
  const page = {
    ...fallbackPage,
    ...(pageData || {}),
    primarySection: {
      ...fallbackPage.primarySection,
      ...(pageData?.primarySection || {}),
    },
    secondarySection: {
      ...fallbackPage.secondarySection,
      ...(pageData?.secondarySection || {}),
    },
  };

  const googleConnected = authSession?.auth?.connected;
  // eslint-disable-next-line no-unused-vars
  const ytMusicHeaders = page.backendStatus?.imports?.ytMusicHeaders;

  const stats = pageKey === "playlists" 
    ? [
        { label: "Wszystkie Playlisty", value: playlists.length.toString() },
        { label: "Biblioteka YTM", value: playlists.filter(p => !p.snippet).length.toString() },
        { label: "Konto Google", value: playlists.filter(p => p.snippet).length.toString() },
      ]
    : page.stats;

  // Combine local and imported playlists if on playlists page
  const displayItems = pageKey === "playlists" && playlists.length > 0
    ? playlists.map(pl => {
        // Format from YouTube Data API v3
        if (pl.snippet) {
          const playlistId = pl.id;
          return {
            id: playlistId,
            title: pl.snippet.title,
            subtitle: pl.snippet.channelTitle,
            cover: pl.snippet.thumbnails?.maxres?.url || pl.snippet.thumbnails?.high?.url || pl.snippet.thumbnails?.medium?.url || pl.snippet.thumbnails?.default?.url,
            meta: `${pl.contentDetails?.itemCount || 0} utworów`,
            onClick: () => fetchPlaylistDetails(playlistId)
          };
        }
        // Format from ytmusic.js (InnerTube)
        const browseId = pl.browseId;
        return {
          id: browseId,
          title: pl.title,
          subtitle: pl.author || "YouTube Music",
          cover: pl.thumbnail || (pl.thumbnails && (pl.thumbnails[0]?.url || pl.thumbnails.url)),
          meta: "Biblioteka",
          onClick: () => fetchPlaylistDetails(browseId)
        };
      })
    : page.primarySection.items;

  if (loadingPlaylist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="animate-spin text-red-500" size={48} />
        <p className="text-neutral-400 animate-pulse">Ładowanie zawartości playlisty...</p>
      </div>
    );
  }

  if (selectedPlaylist) {
    const playlistCover = selectedPlaylist.thumbnail || (selectedPlaylist.thumbnails && (selectedPlaylist.thumbnails[0]?.url || selectedPlaylist.thumbnails.url));
    
    return (
      <div className="page space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <section className="page-hero flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-64 h-64 flex-shrink-0 rounded-3xl overflow-hidden shadow-2xl bg-neutral-900">
             <CoverArt art={playlistCover} />
          </div>
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedPlaylist(null)}
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-white"
              >
                <ArrowLeft size={24} />
              </button>
              <p className="text-xs font-bold uppercase tracking-widest text-red-500">Playlista</p>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight font-display">{selectedPlaylist.title}</h1>
            <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed">{selectedPlaylist.description || "Brak opisu."}</p>
            <p className="text-sm text-neutral-500">Autor: {selectedPlaylist.author} • {selectedPlaylist.trackCount} utworów</p>
            
            <div className="flex gap-4">
              <button className="flex items-center gap-3 px-8 py-4 rounded-full bg-red-600 text-white font-bold transition-all hover:bg-red-700 hover:scale-105 active:scale-95 shadow-xl shadow-red-600/20">
                <Play size={20} fill="white" />
                Odtwórz wszystko
              </button>
              <button 
                onClick={() => {
                  const videoId = prompt("Podaj YouTube Video ID do dodania:");
                  if (videoId) {
                    const cleanId = selectedPlaylist.playlistId?.replace('VL', '');
                    fetchJson(`/api/ytmusic/playlist/${cleanId}/tracks`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ videoIds: [videoId] })
                    }).then(() => fetchPlaylistDetails(selectedPlaylist.playlistId));
                  }
                }}
                className="flex items-center gap-3 px-8 py-4 rounded-full bg-white/10 text-white font-bold transition-all hover:bg-white/20"
              >
                <Plus size={20} />
                Dodaj utwór
              </button>
            </div>
          </div>
        </section>

        <section className="bg-neutral-900/30 border border-white/5 p-6 rounded-3xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_100px_80px_auto] gap-4 px-4 py-3 text-[10px] uppercase tracking-widest font-black text-neutral-500 border-b border-white/5">
            <span>#</span>
            <span>Tytuł</span>
            <span>Artysta</span>
            <span>Czas</span>
            <span>Album</span>
            <span>Akcje</span>
          </div>

          <div className="divide-y divide-white/5">
            {(selectedPlaylist.tracks || []).map((track, index) => (
              <div 
                key={`${track.videoId}-${index}`} 
                className="grid grid-cols-[auto_1fr_1fr_100px_80px_auto] gap-4 px-4 py-4 items-center hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <span className="text-sm font-bold text-neutral-600 group-hover:text-red-500 transition-colors w-6">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-neutral-800 flex-shrink-0 overflow-hidden">
                    <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                  </div>
                  <p className="font-bold text-white truncate text-sm">{track.title}</p>
                </div>
                <span className="text-xs text-neutral-400 truncate">
                  {(track.artists || []).map(a => a.name).join(", ")}
                </span>
                <span className="text-xs text-neutral-500 font-mono">{track.duration}</span>
                <span className="text-xs text-neutral-400 truncate">{track.album?.name || "-"}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const cleanId = selectedPlaylist.playlistId?.replace('VL', '');
                    handleRemoveTrack(cleanId, track.videoId, track.setVideoId);
                  }}
                  className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="page-hero grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500">{page.eyebrow}</p>
          <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight font-display">{page.title}</h1>
          <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed">{page.description}</p>

          <div className="flex flex-wrap gap-2 pt-2">
            {page.chips.map((chip) => (
              <span key={chip} className="px-4 py-1.5 bg-neutral-900 border border-white/5 rounded-full text-sm font-medium text-neutral-300">
                {chip}
              </span>
            ))}
          </div>

          {pageKey === "playlists" && (
            <div className="pt-4">
              <button
                className={`flex items-center gap-3 px-6 py-3 rounded-full bg-red-600 text-white font-bold transition-all hover:bg-red-700 hover:scale-105 active:scale-95 shadow-xl shadow-red-600/20 ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={fetchPlaylists}
                disabled={importing}
              >
                {importing ? "Importowanie..." : "Pobierz playlisty z YouTube"}
                <RefreshCw className={importing ? "animate-spin" : ""} size={18} />
              </button>
            </div>
          )}
        </div>

        <aside className="bg-neutral-900/40 border border-white/5 p-6 rounded-3xl space-y-6 self-stretch flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-bold uppercase tracking-tighter">
              <Flame size={14} />
              Live status
            </span>
            <p className="text-xs text-neutral-500">{pageLoading ? "Ładowanie..." : "System OK"}</p>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">{page.spotlightTitle}</h2>
            <p className="text-sm text-neutral-400">{page.spotlightText}</p>
          </div>

          <ul className="space-y-3">
            {page.spotlightItems.map((item) => (
              <li key={item} className="text-sm text-neutral-300 flex items-center gap-2 before:w-1 before:h-1 before:bg-red-500 before:rounded-full">{item}</li>
            ))}
            <li className="text-sm font-medium border-t border-white/5 pt-3 mt-3">
              {googleConnected ? (
                <span className="text-emerald-500 flex items-center gap-2">
                   <BadgeCheck size={16} /> Google OAuth Połączony
                </span>
              ) : (
                <span className="text-neutral-500 flex items-center gap-2">
                  ○ Google OAuth Niepołączony
                </span>
              )}
            </li>
          </ul>
        </aside>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <MetricCard key={`${page.key}-${stat.label}`} stat={stat} index={index} />
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-neutral-900/30 border border-white/5 p-6 rounded-3xl">
          <SectionHeader 
            title={pageKey === "playlists" && playlists.length > 0 ? "Zaimportowane Playlisty" : page.primarySection.title} 
            action={pageKey === "playlists" ? (importing ? "Odświeżanie..." : "Odśwież") : page.primarySection.action} 
            onAction={pageKey === "playlists" ? fetchPlaylists : undefined}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {displayItems.map((item, idx) => (
              <MediaCard key={`${page.key}-${item.title}-${idx}`} item={item} onClick={item.onClick} />
            ))}
            {pageKey === "playlists" && displayItems.length === 0 && !importing && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-500 border-2 border-dashed border-white/5 rounded-2xl">
                <Play size={48} className="mb-4 opacity-20" />
                <p>Brak playlist. Kliknij przycisk powyżej, aby zaimportować z YouTube.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="bg-neutral-900/30 border border-white/5 p-6 rounded-3xl h-fit">
          <SectionHeader title={page.chartTitle} action="Pełny ranking" />
          <div className="space-y-1">
            {page.chartItems.map((item) => (
              <ChartRow key={`${page.key}-${item.label}`} item={item} />
            ))}
          </div>
        </aside>
      </section>

      <section className="bg-neutral-900/30 border border-white/5 p-6 rounded-3xl">
        <SectionHeader title={page.secondarySection.title} action={page.secondarySection.action} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {page.secondarySection.items.map((item) => (
            <MediaCard key={`${page.key}-${item.title}-secondary`} item={item} />
          ))}
        </div>
      </section>

      <QueueTable page={page} />
    </div>
  );
}

export default MusicPage;
