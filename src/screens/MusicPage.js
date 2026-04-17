import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
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

function MusicPage({ pageKey }) {
  const location = useLocation();
  const {
    pageData,
    play,
    query,
    searchResults,
    authSession,
  } = useOutletContext();
  const showToast = useToast();

  const [playlists, setPlaylists] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importingYt, setImportingYt] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, isConnected]);

  useEffect(() => {
    const playlistId = new URLSearchParams(location.search).get("playlist");
    if (pageKey === "playlists" && playlistId) {
      fetchPlaylistDetails(playlistId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, location.search]);

  async function handleDeletePlaylist(playlistId) {
    if (!playlistId) return;
    if (!window.confirm("Usunąć playlistę? Tej operacji nie można cofnąć.")) return;
    try {
      await fetchJson(`/api/ytmusic/playlist/${playlistId}`, { method: "DELETE" });
      setSelectedPlaylist(null);
      showToast("Playlista usunięta.", "success");
      fetchPlaylists();
    } catch (error) {
      console.error("Delete playlist error:", error);
      showToast("Nie udało się usunąć playlisty. (Wymaga headers.json)", "error");
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
    pageKey === "playlists" && playlists.length > 0
      ? playlists.map((pl) => {
          const browseId = pl.browseId || pl.playlistId;
          return {
            id: browseId,
            title: pl.title,
            subtitle: pl.author || "YouTube Music",
            cover: pl.thumbnail || (pl.thumbnails && (pl.thumbnails[0]?.url || pl.thumbnails.url)),
            meta: `${pl.trackCount ? `${pl.trackCount} utworów` : "Playlista"}`,
            onClick: () => fetchPlaylistDetails(browseId),
          };
        })
      : isSearching
      ? liveSearchItems
      : page.primarySection.items;

  if (loadingPlaylist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="animate-spin text-red-500" size={48} />
        <p className="text-neutral-400 animate-pulse font-medium">Ładowanie zawartości...</p>
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
          <div className="w-full md:w-72 h-72 flex-shrink-0 rounded-[40px] overflow-hidden shadow-2xl bg-neutral-900 border border-white/5 group">
            <CoverArt art={playlistCover} />
          </div>
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white hover:scale-105 active:scale-95"
              >
                <ArrowLeft size={24} />
              </button>
              {isLocalPlaylist ? (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                  Playlista lokalna
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                  YouTube Music
                </span>
              )}
              {!isLocalPlaylist && (
                <span className="text-[10px] text-neutral-500 font-medium">
                  Kliknij „Importuj i edytuj" aby edytować lokalnie
                </span>
              )}
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight font-display tracking-tight">
              {selectedPlaylist.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-400 font-medium">
              <span>
                Autor: <span className="text-white">{selectedPlaylist.author}</span>
              </span>
              <span className="w-1 h-1 bg-neutral-700 rounded-full"></span>
              <span>{selectedPlaylist.trackCount} utworów</span>
              {selectedPlaylist.duration && (
                <>
                  <span className="w-1 h-1 bg-neutral-700 rounded-full"></span>
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
                className="flex items-center gap-3 px-10 py-4 rounded-full bg-red-600 text-white font-bold transition-all hover:bg-red-700 hover:scale-105 active:scale-95 shadow-2xl shadow-red-600/30"
              >
                <Play size={20} fill="white" />
                Odtwórz
              </button>
              {isLocalPlaylist && (
                <button
                  onClick={() => setShowAddTrackModal(true)}
                  className="flex items-center gap-3 px-8 py-4 rounded-full bg-white/5 text-white font-bold transition-all hover:bg-white/10 border border-white/5"
                >
                  <Plus size={20} />
                  Dodaj utwór
                </button>
              )}

              {!isLocalPlaylist && (
                <button
                  type="button"
                  onClick={handleImportYtPlaylist}
                  disabled={importingYt}
                  className="flex items-center gap-3 px-8 py-4 rounded-full bg-white/5 text-white font-bold transition-all hover:bg-white/10 border border-white/5 disabled:opacity-60 disabled:cursor-wait"
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

              {(ytMusicHeaders && !isLocalPlaylist) && (
                <button
                  onClick={() => setShowAddTrackModal(true)}
                  className="flex items-center gap-3 px-8 py-4 rounded-full bg-white/5 text-white font-bold transition-all hover:bg-white/10 border border-white/5"
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
                  className="flex items-center gap-3 px-8 py-4 rounded-full bg-white/5 text-red-400 font-bold transition-all hover:bg-red-400/10 border border-white/5"
                >
                  <Trash2 size={20} />
                  Usuń
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="bg-neutral-900/30 rounded-[40px] border border-white/5 overflow-hidden">
          <div className="p-8">
            {(selectedPlaylist.tracks || []).length === 0 ? (
              <div className="text-center py-16 text-neutral-500 font-medium italic">
                Ta playlista jest pusta.
              </div>
            ) : (
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest font-black text-neutral-500">
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
                      className="group hover:bg-white/5 transition-all cursor-pointer"
                      onClick={() => play?.(track)}
                    >
                      <td className="px-4 py-4 rounded-l-2xl text-center text-sm font-bold text-neutral-600 group-hover:text-red-500">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-800 border border-white/5">
                            {(track.thumbnail || track.thumbnails?.[0]?.url) && (
                              <img
                                src={track.thumbnail || track.thumbnails?.[0]?.url}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate group-hover:text-red-400 transition-colors">
                              {track.title}
                            </p>
                            <p className="text-xs text-neutral-500 truncate mt-1">
                              {Array.isArray(track.artists)
                                ? track.artists.map((a) => a.name).join(", ")
                                : track.author}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-400 hidden md:table-cell">
                        {track.album?.name || "—"}
                      </td>
                      <td className="px-4 py-4 text-right pr-6 text-sm font-mono text-neutral-500 group-hover:text-neutral-300">
                        {track.duration}
                      </td>
                      {isLocalPlaylist && (
                        <td className="px-4 py-4 rounded-r-2xl">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTrack(selectedPlaylist.playlistId, track.videoId, track.setVideoId);
                            }}
                            className="p-2 text-neutral-600 hover:text-red-500 transition-colors"
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
    <div className="page space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      <header className="page-header relative">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <p className="text-sm font-black uppercase tracking-[0.3em] text-red-500 mb-4">{page.eyebrow}</p>
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 font-display tracking-tight leading-none">
          {isSearching ? "Wyniki wyszukiwania" : page.title}
        </h1>
        <p className="text-xl text-neutral-400 max-w-3xl leading-relaxed font-medium">
          {isSearching ? `Znaleziono wyniki dla frazy "${query}"` : page.description}
        </p>

        <div className="flex flex-wrap gap-3 mt-10">
          {page.chips?.map((chip) => (
            <button
              key={chip}
              className="px-6 py-2.5 rounded-full bg-neutral-900 border border-white/5 text-sm font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 hover:border-white/10 transition-all active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      </header>

      {page.stats && !isSearching && (
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
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
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
              <div className="text-center py-20 bg-neutral-900/50 rounded-[40px] border border-dashed border-white/10">
                <p className="text-neutral-500 font-medium italic">
                  {pageKey === "playlists" && importing
                    ? "Ładowanie playlist..."
                    : "Nie znaleziono żadnych elementów."}
                </p>
              </div>
            )}
          </section>

          {page.secondarySection?.items?.length > 0 && !isSearching && (
            <section>
              <SectionHeader title={page.secondarySection.title} action={page.secondarySection.action} />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
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
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
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

        <aside className="space-y-12 sticky top-24">
          {page.chartItems?.length > 0 && !isSearching && (
            <section className="bg-neutral-900/50 border border-white/5 p-8 rounded-[40px] backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-8 font-display">{page.chartTitle}</h2>
              <div className="space-y-2">
                {page.chartItems.map((item, idx) => (
                  <ChartRow key={idx} item={item} />
                ))}
              </div>
            </section>
          )}

          {!isSearching && (
            <div className="bg-gradient-to-br from-red-600 to-red-900 p-8 rounded-[40px] shadow-2xl shadow-red-600/20 group cursor-pointer overflow-hidden relative">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700"></div>
              <h3 className="text-2xl font-black text-white mb-2 italic uppercase">Premium</h3>
              <p className="text-white/80 text-sm font-medium leading-relaxed mb-6">
                Wszystkie funkcje BoziaMusic bez ograniczeń. Ciesz się muzyką w najwyższej jakości.
              </p>
              <button className="w-full py-4 bg-white text-red-600 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-neutral-100 transition-colors shadow-xl">
                Sprawdź więcej
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
    </div>
  );
}

export default MusicPage;
