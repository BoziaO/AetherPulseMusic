import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useOutletContext, useParams } from "react-router-dom";
import { fetchJson } from "../lib/api";
import CoverArt from "../components/CoverArt";
import {
  ArrowLeft,
  Download,
  Edit2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "../components/Icons";
import { pageContent } from "../data/musicData";
import { useToast } from "../components/Toast";

// Modular components
import SectionHeader from "../components/music/SectionHeader";
import MetricCard from "../components/music/MetricCard";
import MediaCard from "../components/music/MediaCard";
import ChartRow from "../components/music/ChartRow";
import QueueTable from "../components/music/QueueTable";
import CreatePlaylistModal from "../components/CreatePlaylistModal";
import AddTrackModal from "../components/AddTrackModal";
import EditPlaylistModal from "../components/EditPlaylistModal";
import PageSkeleton from "../components/PageSkeleton";

function MusicPage({ pageKey }) {
  const location = useLocation();
  const { artistId, albumId } = useParams();
  const {
    pageData,
    pageLoading,
    play,
    query,
    searchFilter,
    searchResults,
    authSession,
    favorites,
    favoriteItems = [],
    recentPlays = [],
  } = useOutletContext();
  const showToast = useToast();

  const [playlists, setPlaylists] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importingYt, setImportingYt] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlaylistForEdit, setSelectedPlaylistForEdit] = useState(null);

  // Fix: correct path — authSession.data.auth.connected (not authSession.auth.connected)
  const isConnected = authSession?.data?.auth?.connected;

  const fetchPlaylists = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    try {
      const libPlaylists = await fetchJson("/api/ytmusic/library/playlists");
      const merged = Array.isArray(libPlaylists) ? [...libPlaylists] : [];

      // Fetch local playlists
      try {
        const localPlaylists = await fetchJson("/api/local/playlists");
        const normalizedLocal = (Array.isArray(localPlaylists) ? localPlaylists : []).map((pl) => ({
          title: pl.title,
          author: "Lokalna",
          thumbnail: null,
          browseId: `local-${pl.id}`,
          playlistId: `local-${pl.id}`,
          trackCount: pl.tracks.length,
          source: "local",
        }));
        merged.push(...normalizedLocal);
      } catch (error) {
        console.warn("Could not fetch local playlists", error);
      }

      if (isConnected) {
        try {
          const ytPlaylists = await fetchJson("/api/youtube/playlists");
          const normalized = (Array.isArray(ytPlaylists) ? ytPlaylists : []).map((pl) => ({
            title: pl.snippet?.title,
            author: pl.snippet?.channelTitle || "YouTube",
            thumbnail:
              pl.snippet?.thumbnails?.maxres?.url ||
              pl.snippet?.thumbnails?.high?.url ||
              pl.snippet?.thumbnails?.medium?.url ||
              pl.snippet?.thumbnails?.default?.url ||
              null,
            browseId: pl.id,
            playlistId: pl.id,
            trackCount: pl.contentDetails?.itemCount || 0,
            source: "google",
          }));
          const seen = new Set(merged.map((item) => item.browseId || item.playlistId));
          normalized.forEach((item) => {
            const id = item.browseId || item.playlistId;
            if (!seen.has(id)) merged.push(item);
          });
        } catch (error) {
          console.warn("Could not fetch Google playlists", error);
        }
      }

      setPlaylists(merged);
    } catch (err) {
      console.error("Błąd pobierania playlist:", err);
      showToast("Nie udało się pobrać playlist.", "error");
    } finally {
      setImporting(false);
    }
  }, [importing, isConnected, showToast]);

  useEffect(() => {
    setSelectedPlaylist(null);
    if (pageKey === "playlists") {
      fetchPlaylists();
    }
    if (pageKey === "artist" && artistId) {
      fetchArtistDetails(artistId);
    }
    if (pageKey === "album" && albumId) {
      fetchAlbumDetails(albumId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, isConnected, artistId, albumId]);

  useEffect(() => {
    const playlistId = new URLSearchParams(location.search).get("playlist");
    if (pageKey === "playlists" && playlistId) {
      fetchPlaylistDetails(playlistId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, location.search]);

  async function fetchArtistDetails(id) {
    if (!id) return;
    try {
      setLoadingPlaylist(true);
      const data = await fetchJson(`/api/ytmusic/artist/${id}`);
      // Transform artist data to "playlist-like" structure for rendering
      setSelectedPlaylist({
        playlistId: id,
        title: data.name,
        author: "Wykonawca",
        thumbnail: data.thumbnails?.[data.thumbnails.length - 1]?.url,
        description: data.description,
        trackCount: data.songs?.length || 0,
        tracks: (data.songs || []).map((s, idx) => ({
          ...s,
          author: data.name,
          setVideoId: `artist-${id}-${idx}`
        }))
      });
    } catch (err) {
      console.error("Błąd pobierania wykonawcy:", err);
      showToast("Nie udało się pobrać danych wykonawcy.", "error");
    } finally {
      setLoadingPlaylist(false);
    }
  }

  async function fetchAlbumDetails(id) {
    if (!id) return;
    try {
      setLoadingPlaylist(true);
      const data = await fetchJson(`/api/ytmusic/album/${id}`);
      setSelectedPlaylist({
        playlistId: id,
        title: data.title,
        author: data.artists?.[0]?.name || "Album",
        thumbnail: data.thumbnails?.[data.thumbnails.length - 1]?.url,
        description: data.description,
        trackCount: data.tracks?.length || 0,
        tracks: (data.tracks || []).map((t, idx) => ({
          ...t,
          setVideoId: `album-${id}-${idx}`
        }))
      });
    } catch (err) {
      console.error("Błąd pobierania albumu:", err);
      showToast("Nie udało się pobrać danych albumu.", "error");
    } finally {
      setLoadingPlaylist(false);
    }
  }

  async function fetchPlaylistDetails(playlistId) {
    if (!playlistId) return;
    try {
      setLoadingPlaylist(true);
      let data;
      if (playlistId.startsWith("local-")) {
        const localId = playlistId.replace("local-", "");
        data = await fetchJson(`/api/local/playlists/${localId}`);
        // Transform to match YouTube format
        data = {
          playlistId,
          title: data.title,
          author: "Lokalna",
          description: data.description,
          trackCount: data.tracks.length,
          thumbnail: null,
          tracks: data.tracks.map((t, idx) => ({
            videoId: t.videoId,
            title: t.title,
            author: t.artist,
            duration: t.duration,
            thumbnail: t.thumbnail,
            artists: [{ name: t.artist }],
            album: null,
            setVideoId: `set-${t.videoId}-${idx}`,
          })),
        };
      } else {
        data = await fetchJson(`/api/ytmusic/playlist/${playlistId}?limit=500`);
      }
      setSelectedPlaylist(data);
    } catch (err) {
      console.error("Błąd pobierania szczegółów playlisty:", err);
      showToast("Nie udało się pobrać zawartości playlisty.", "error");
    } finally {
      setLoadingPlaylist(false);
    }
  }

  const isLocalPlaylist = selectedPlaylist?.playlistId?.startsWith("local-");

  async function handleImportYtPlaylist() {
    if (!selectedPlaylist?.playlistId) return;
    if (importingYt) return;
    setImportingYt(true);
    try {
      const playlistId = selectedPlaylist.playlistId.replace(/^VL/, "");
      const result = await fetchJson(`/api/local/playlists/import-yt/${playlistId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (result.error) throw new Error(result.error);
      showToast(
        `Zaimportowano „${result.title}" — ${result.trackCount} utworów. Możesz teraz edytować!`,
        "success"
      );
      // Navigate to the imported local playlist
      await fetchPlaylistDetails(`local-${result.localId}`);
      // Refresh playlist list in background
      fetchPlaylists();
    } catch (err) {
      console.error("Import error:", err);
      showToast("Nie udało się zaimportować playlisty.", "error");
    } finally {
      setImportingYt(false);
    }
  }

  async function handleRemoveTrack(playlistId, videoId, setVideoId) {
    if (!window.confirm("Czy na pewno chcesz usunąć ten utwór z playlisty?")) return;
    try {
      if (isLocalPlaylist) {
        const localId = playlistId.replace("local-", "");
        await fetchJson(`/api/local/playlists/${localId}/tracks`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });
      } else {
        await fetchJson(`/api/ytmusic/playlist/${playlistId}/tracks`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videos: [{ videoId, setVideoId }] }),
        });
      }
      showToast("Utwór usunięty.", "success");
      fetchPlaylistDetails(playlistId);
    } catch (err) {
      console.error("Błąd usuwania utworu:", err);
      showToast("Nie udało się usunąć utworu.", "error");
    }
  }

  function handleEditPlaylist(playlist) {
    setSelectedPlaylistForEdit(playlist);
    setShowEditModal(true);
  }

  async function handleDeletePlaylist(playlist) {
    if (!window.confirm(`Czy na pewno chcesz usunąć playlistę "${playlist.title}"? Tej akcji nie można cofnąć.`)) return;
    try {
      await fetchJson(`/api/ytmusic/playlist/${playlist.playlistId}`, { method: "DELETE" });
      showToast("Playlista usunięta.", "success");
      fetchPlaylists();
    } catch (err) {
      console.error("Błąd usuwania playlisty:", err);
      showToast("Nie udało się usunąć playlisty.", "error");
    }
  }

  const fallbackPage = pageContent[pageKey] || pageContent.home;
  const serverPageData = ["favorites", "recent"].includes(pageKey) ? null : pageData;
  let page = {
    ...fallbackPage,
    ...(serverPageData || {}),
    primarySection: {
      ...fallbackPage.primarySection,
      ...(serverPageData?.primarySection || {}),
    },
    secondarySection: {
      ...fallbackPage.secondarySection,
      ...(serverPageData?.secondarySection || {}),
    },
  };

  const favoriteDisplayItems = favoriteItems.map((item, index) => ({
    id: item.videoId || `${item.title}-${index}`,
    title: item.title,
    subtitle: item.artist || item.subtitle || "Ulubiony utwór",
    cover: item.art,
    meta: "Ulubione",
    videoId: item.videoId,
  }));

  const recentDisplayItems = recentPlays.map((item, index) => ({
    id: item.videoId || `${item.title}-${index}`,
    title: item.title,
    subtitle: item.artist || item.subtitle || "Ostatnio odtwarzane",
    cover: item.art,
    meta: "Historia",
    videoId: item.videoId,
  }));

  if (pageKey === "favorites") {
    page = {
      ...page,
      stats: [
        { label: "Ulubione", value: String(favoriteDisplayItems.length) },
        { label: "Zapis", value: "Lokalny" },
        { label: "Dostęp", value: "Szybki" },
      ],
      primarySection: { ...page.primarySection, items: favoriteDisplayItems },
      queue: favoriteDisplayItems.map((item) => ({
        title: item.title,
        artist: item.subtitle,
        detail: "Ulubione",
        duration: "—",
        energy: 90,
        videoId: item.videoId,
        thumbnail: item.cover,
      })),
    };
  }

  if (pageKey === "recent") {
    page = {
      ...page,
      stats: [
        { label: "Odtworzenia", value: String(recentDisplayItems.length) },
        { label: "Limit", value: "25" },
        { label: "Zapis", value: "Lokalny" },
      ],
      primarySection: { ...page.primarySection, items: recentDisplayItems },
      queue: recentDisplayItems.map((item) => ({
        title: item.title,
        artist: item.subtitle,
        detail: "Historia",
        duration: "—",
        energy: 70,
        videoId: item.videoId,
        thumbnail: item.cover,
      })),
    };
  }

  const ytMusicHeaders = page.backendStatus?.imports?.ytMusicHeaders;

  const isSearching = query.trim().length >= 2;
  const liveSearchItems = searchResults.map((item) => ({
    id: item.browseId || item.videoId || item.title,
    title: item.title,
    subtitle:
      item.artists?.map((artist) => artist.name).join(", ") ||
      item.author ||
      "YouTube Music",
    cover: item.thumbnail,
    meta: item.resultType || "wynik",
    browseId: item.browseId,
    videoId: item.videoId,
    resultType: item.resultType,
  }));

  const displayItems =
    pageKey === "favorites"
      ? favoriteDisplayItems
      : pageKey === "recent"
      ? recentDisplayItems
      : pageKey === "playlists" && playlists.length > 0
      ? playlists.map((pl) => {
          const browseId = pl.browseId || pl.playlistId;
          return {
            id: browseId,
            title: pl.title,
            subtitle: pl.author || "YouTube Music",
            cover: pl.thumbnail || (pl.thumbnails && (pl.thumbnails[0]?.url || pl.thumbnails.url)),
            meta: `${pl.trackCount ? `${pl.trackCount} utworów` : "Playlista"}`,
            onClick: () => fetchPlaylistDetails(browseId),
            onEdit: pl.source === "google" ? () => handleEditPlaylist(pl) : undefined,
            onDelete: pl.source === "google" ? () => handleDeletePlaylist(pl) : undefined,
          };
        })
      : isSearching
      ? liveSearchItems
      : page.primarySection.items;

  // Page-level skeleton (first load from API)
  if (pageLoading && !pageData) {
    return <PageSkeleton />;
  }

  if (loadingPlaylist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5">
        <div className="loading-spinner" />
        <p
          className="text-xs font-black uppercase tracking-widest animate-pulse"
          style={{ color: "var(--text-soft)" }}
        >
          Ładowanie zawartości...
        </p>
      </div>
    );
  }

  if (selectedPlaylist) {
    const playlistCover =
      selectedPlaylist.thumbnail ||
      (selectedPlaylist.thumbnails &&
        (selectedPlaylist.thumbnails[0]?.url || selectedPlaylist.thumbnails.url));

    return (
      <div className="page space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
        <section className="page-hero flex flex-col md:flex-row gap-10 items-end">
          <div className="w-full md:w-72 h-72 flex-shrink-0 rounded-[40px] overflow-hidden shadow-2xl group" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
            <CoverArt art={playlistCover} />
          </div>
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="p-3 rounded-2xl hover:scale-105 active:scale-95 transition-all"
              >
                <ArrowLeft size={24} />
              </button>
              {isLocalPlaylist ? (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Playlista lokalna
                </span>
              ) : pageKey === "artist" ? (
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Wykonawca
                </span>
              ) : pageKey === "album" ? (
                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Album
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                  YouTube Music
                </span>
              )}
              {(!isLocalPlaylist && pageKey !== "artist" && pageKey !== "album") && (
                <span className="text-[10px] font-medium" style={{ color: "var(--text-soft)" }}>
                  Kliknij „Importuj i edytuj" aby edytować lokalnie
                </span>
              )}
            </div>
            <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight" style={{ fontFamily: '\"Space Grotesk\", sans-serif', color: "var(--text-main)" }}>
              {selectedPlaylist.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              <span>
                Autor: <span style={{ color: "var(--text-main)" }}>{selectedPlaylist.author}</span>
              </span>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--surface-line-strong)" }}></span>
              <span>{selectedPlaylist.trackCount} utworów</span>
              {selectedPlaylist.duration && (
                <>
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--surface-line-strong)" }}></span>
                  <span>{selectedPlaylist.duration}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  const first = selectedPlaylist.tracks?.[0];
                  if (first) play?.(first);
                  else showToast("Playlista jest pusta.", "info");
                }}
                className="flex items-center gap-3 px-8 sm:px-10 py-4 rounded-full text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-2xl" style={{ backgroundColor: "var(--primary)" }}
                style={{ backgroundColor: "var(--primary)", boxShadow: "0 18px 45px color-mix(in srgb, var(--primary) 28%, transparent)" }}
              >
                <Play size={20} fill="white" />
                Odtwórz
              </button>
              {isLocalPlaylist && (
                <button
                  onClick={() => setShowAddTrackModal(true)}
                  className="flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-main)", border: "1px solid var(--surface-line)" }}
                >
                  <Plus size={20} />
                  Dodaj utwór
                </button>
              )}

              {(!isLocalPlaylist && pageKey !== "artist" && pageKey !== "album") && (
                <button
                  type="button"
                  onClick={handleImportYtPlaylist}
                  disabled={importingYt}
                  className="flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all disabled:opacity-60 disabled:cursor-wait" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-main)", border: "1px solid var(--surface-line)" }}
                >
                  {importingYt ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Importuję...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      Importuj i edytuj
                    </>
                  )}
                </button>
              )}

              {(ytMusicHeaders && !isLocalPlaylist && pageKey !== "artist" && pageKey !== "album") && (
                <button
                  onClick={() => setShowAddTrackModal(true)}
                  className="flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-main)", border: "1px solid var(--surface-line)" }}
                >
                  <Edit2 size={20} />
                  Edytuj (InnerTube)
                </button>
              )}

              {isLocalPlaylist && (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm("Usunąć tę playlistę? Tej operacji nie można cofnąć.")) return;
                    const localId = selectedPlaylist.playlistId.replace("local-", "");
                    fetchJson(`/api/local/playlists/${localId}`, { method: "DELETE" })
                      .then(() => {
                        showToast("Playlista usunięta.", "success");
                        setSelectedPlaylist(null);
                        fetchPlaylists();
                      })
                      .catch(() => showToast("Błąd usuwania playlisty.", "error"));
                  }}
                  className="flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <Trash2 size={20} />
                  Usuń
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[40px] overflow-hidden" style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--surface-line)" }}>
          <div className="p-8">
            {(selectedPlaylist.tracks || []).length === 0 ? (
              <div className="text-center py-16 font-medium italic" style={{ color: "var(--text-soft)" }}>
                Ta playlista jest pusta.
              </div>
            ) : (
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest font-black" style={{ color: "var(--text-soft)" }}>
                    <th className="px-4 py-2 w-12 text-center">#</th>
                    <th className="px-4 py-2">Tytuł</th>
                    <th className="px-4 py-2 hidden md:table-cell">Album</th>
                    <th className="px-4 py-2 text-right pr-6">Czas</th>
                    {isLocalPlaylist && <th className="px-4 py-2 w-12"></th>}
                  </tr>
                </thead>
                <tbody className="before:block before:h-4">
                  {(selectedPlaylist.tracks || []).map((track, idx) => (
                    <tr
                      key={track.videoId + idx}
                      className="group transition-all cursor-pointer" style={{ }}
                      onClick={() => play?.(track)}
                    >
                      <td className="px-4 py-4 rounded-l-2xl text-center text-sm font-bold" style={{ color: "var(--text-soft)" }}>
                        {idx + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
                            {(track.thumbnail || track.thumbnails?.[0]?.url) && (
                              <img
                                src={track.thumbnail || track.thumbnails?.[0]?.url}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold truncate transition-colors" style={{ color: "var(--text-main)" }}>
                              {track.title}
                            </p>
                            <p className="text-xs truncate mt-1" style={{ color: "var(--text-muted)" }}>
                              {Array.isArray(track.artists)
                                ? track.artists.map((a) => a.name).join(", ")
                                : track.author}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm hidden md:table-cell" style={{ color: "var(--text-muted)" }}>
                        {track.album?.name || "—"}
                      </td>
                      <td className="px-4 py-4 text-right pr-6 text-sm font-mono" style={{ color: "var(--text-soft)" }}>
                        {track.duration}
                      </td>
                      {isLocalPlaylist && (
                        <td className="px-4 py-4 rounded-r-2xl">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTrack(selectedPlaylist.playlistId, track.videoId, track.setVideoId);
                            }}
                            className="p-2 transition-colors" style={{ color: "var(--text-soft)" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {showAddTrackModal && selectedPlaylist && (
          <AddTrackModal
            playlistId={selectedPlaylist.playlistId}
            isLocal={isLocalPlaylist}
            onClose={() => setShowAddTrackModal(false)}
            onAdded={(track) => {
              showToast(`Dodano: ${track.title}`, "success");
              fetchPlaylistDetails(selectedPlaylist.playlistId);
            }}
          />
        )}
      </div>
    );
  }

  return (
      <div className="page space-y-10 lg:space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      <header className="page-header relative">
        <div className="absolute -top-24 -left-24 w-96 h-96 blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}></div>
        <p className="text-xs sm:text-sm font-black uppercase tracking-[0.22em] sm:tracking-[0.3em] mb-4" style={{ color: "var(--primary)" }}>{page.eyebrow}</p>
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black mb-4 sm:mb-6 tracking-tight leading-none" style={{ fontFamily: '\"Space Grotesk\", sans-serif', color: "var(--text-main)" }}>
          {isSearching ? "Wyniki wyszukiwania" : page.title}
        </h1>
        <p className="text-base sm:text-xl max-w-3xl leading-relaxed font-medium" style={{ color: "var(--text-muted)" }}>
          {isSearching ? `Znaleziono wyniki dla frazy "${query}"` : page.description}
        </p>

        <div className="flex gap-3 mt-7 sm:mt-10 overflow-x-auto pb-2 sm:flex-wrap">
          {page.chips?.map((chip) => (
            <button
              key={chip}
              className="px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)", color: "var(--text-muted)" }}
            >
              {chip}
            </button>
          ))}
        </div>
      </header>

      {page.stats && !isSearching && pageKey !== "home" && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {page.stats.map((stat, idx) => (
            <MetricCard key={stat.label} stat={stat} index={idx} />
          ))}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start">
        <div className="space-y-16">
          <section>
            <SectionHeader
              title={page.primarySection?.title || "Dla Ciebie"}
              action={isSearching ? "Filtruj" : page.primarySection?.action}
              onAction={
                pageKey === "playlists" && !isSearching
                  ? () => setShowCreateModal(true)
                  : undefined
              }
            />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
              {displayItems.map((item, idx) => (
                <MediaCard
                  key={item.id || item.browseId || item.videoId || `pri-${idx}`}
                  item={item}
                  onClick={
                    item.onClick ||
                    (() => {
                      if (item.videoId) play?.(item);
                      else if (item.browseId) fetchPlaylistDetails(item.browseId);
                    })
                  }
                />
              ))}
            </div>
            {displayItems.length === 0 && (
              <div className="text-center py-16 sm:py-20 rounded-[32px] sm:rounded-[40px] px-6" style={{ backgroundColor: "var(--bg-panel)", border: "2px dashed var(--surface-line)" }}>
                <p className="font-medium italic" style={{ color: "var(--text-soft)" }}>
                  {pageKey === "playlists" && importing
                    ? "Ładowanie playlist..."
                    : pageKey === "favorites"
                    ? "Kliknij serce w odtwarzaczu, aby dodać pierwszy ulubiony utwór."
                    : pageKey === "recent"
                    ? "Odtwórz dowolny utwór, aby zbudować historię odsłuchu."
                    : "Nie znaleziono żadnych elementów."}
                </p>
              </div>
            )}
          </section>

          {page.secondarySection?.items?.length > 0 && !isSearching && (
            <section>
              <SectionHeader title={page.secondarySection.title} action={page.secondarySection.action} />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
                {page.secondarySection.items.map((item, idx) => (
                  <MediaCard
                    key={item.id || item.browseId || item.videoId || `sec-${idx}`}
                    item={item}
                    onClick={() => {
                      if (item.videoId) play?.(item);
                      else if (item.browseId) fetchPlaylistDetails(item.browseId);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {page.tertiarySection?.items?.length > 0 && !isSearching && (
            <section>
              <SectionHeader title={page.tertiarySection.title} action={page.tertiarySection.action} />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
                {page.tertiarySection.items.map((item, idx) => (
                  <MediaCard
                    key={item.id || item.browseId || item.videoId || `ter-${idx}`}
                    item={item}
                    onClick={() => {
                      if (item.videoId) play?.(item);
                      else if (item.browseId) fetchPlaylistDetails(item.browseId);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {page.queue?.length > 0 && !isSearching && (
            <QueueTable page={page} onPlay={play} />
          )}
        </div>

        <aside className="space-y-8 lg:space-y-12 lg:sticky lg:top-24">
          {page.chartItems?.length > 0 && !isSearching && (
            <section className="p-8 rounded-[40px]" style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--surface-line)" }}>
              <h2 className="text-2xl font-black mb-8" style={{ fontFamily: '\"Space Grotesk\", sans-serif', color: "var(--text-main)" }}>{page.chartTitle}</h2>
              <div className="space-y-2">
                {page.chartItems.map((item, idx) => (
                  <ChartRow key={idx} item={item} />
                ))}
              </div>
            </section>
          )}

          {!isSearching && (
            <div className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] shadow-2xl group cursor-pointer overflow-hidden relative"
              style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 45%, #050816))", boxShadow: "0 24px 60px color-mix(in srgb, var(--primary) 18%, transparent)" }}>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}></div>
              <h3 className="text-2xl font-black mb-2 italic uppercase" style={{ color: "var(--text-main)" }}>Focus Mode</h3>
              <p className="text-sm font-medium leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
                Używaj skrótów: / wyszukuje, spacja lub K pauzuje, strzałki przełączają utwory.
              </p>
              <button className="w-full py-4 font-black text-sm uppercase tracking-widest rounded-2xl transition-colors shadow-xl" style={{ backgroundColor: "var(--text-main)", color: "var(--primary)" }} style={{ color: "var(--primary)" }}>
                Ergonomia ON
              </button>
            </div>
          )}
        </aside>
      </div>

      {showCreateModal && (
        <CreatePlaylistModal
          type="local"
          onConfirm={async (data) => {
            try {
              await fetchJson("/api/local/playlists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              showToast("Playlista utworzona!", "success");
              setShowCreateModal(false);
              fetchPlaylists();
            } catch (error) {
              console.error("Create playlist error:", error);
              showToast("Nie udało się utworzyć playlisty.", "error");
            }
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && selectedPlaylistForEdit && (
        <EditPlaylistModal
          playlist={selectedPlaylistForEdit}
          onConfirm={async (data) => {
            try {
              await fetchJson(`/api/ytmusic/playlist/${selectedPlaylistForEdit.playlistId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              showToast("Playlista zaktualizowana!", "success");
              setShowEditModal(false);
              setSelectedPlaylistForEdit(null);
              fetchPlaylists();
            } catch (error) {
              console.error("Edit playlist error:", error);
              showToast("Nie udało się zaktualizować playlisty.", "error");
            }
          }}
          onDelete={async () => {
            try {
              await fetchJson(`/api/ytmusic/playlist/${selectedPlaylistForEdit.playlistId}`, { method: "DELETE" });
              showToast("Playlista usunięta.", "success");
              setShowEditModal(false);
              setSelectedPlaylistForEdit(null);
              fetchPlaylists();
            } catch (error) {
              console.error("Delete playlist error:", error);
              showToast("Nie udało się usunąć playlisty.", "error");
            }
          }}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedPlaylistForEdit(null);
          }}
        />
      )}
    </div>
  );
}

export default MusicPage;
