import React, { useState, useRef, useEffect } from "react";
import { fetchJson } from "../lib/api";
import { Search, X, Plus, Music, List } from "./Icons";

function AddTrackModal({ playlistId: initialPlaylistId, isLocal: initialIsLocal, onClose, onAdded, initialTrack }) {
  const [query, setQuery] = useState(initialTrack ? `${initialTrack.title} ${initialTrack.artist || initialTrack.subtitle || ""}`.trim() : "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState("");
  const [localPlaylists, setLocalPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(initialPlaylistId || "");
  const [selectedIsLocal, setSelectedIsLocal] = useState(initialIsLocal ?? true);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const needsPlaylistPicker = !initialPlaylistId;

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Load local playlists for the picker when no playlist is pre-selected
  useEffect(() => {
    if (!needsPlaylistPicker) return;
    setPlaylistsLoading(true);
    fetchJson("/api/local/playlists")
        .then((data) => setLocalPlaylists(Array.isArray(data) ? data : []))
        .catch(() => setLocalPlaylists([]))
        .finally(() => setPlaylistsLoading(false));
  }, [needsPlaylistPicker]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    timerRef.current = setTimeout(async () => {
      try {
        const data = await fetchJson(
            `/api/ytmusic/search?q=${encodeURIComponent(query.trim())}&filter=songs&limit=20`
        );
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setError("Błąd wyszukiwania. Spróbuj ponownie.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  async function handleAdd(track) {
    const playlistId = selectedPlaylistId || initialPlaylistId;
    const isLocal = selectedIsLocal;
    if (!track.videoId || !playlistId) {
      setError("Wybierz playlistę, do której chcesz dodać utwór.");
      return;
    }
    setAdding(track.videoId);
    setError("");
    try {
      if (isLocal) {
        const localId = playlistId.replace("local-", "");
        await fetchJson(`/api/local/playlists/${localId}/tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: track.videoId,
            title: track.title || "Nieznany",
            artist:
                track.artists?.map((a) => a.name).join(", ") ||
                track.author ||
                "Nieznany",
            thumbnail: track.thumbnail || null,
            duration: track.duration || null,
          }),
        });
      } else {
        const cleanId = playlistId.replace(/^VL/, "");
        await fetchJson(`/api/ytmusic/playlist/${cleanId}/tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoIds: [track.videoId] }),
        });
      }
      onAdded?.(track);
      onClose();
    } catch {
      setError("Nie udało się dodać utworu. Sprawdź połączenie.");
    } finally {
      setAdding(null);
    }
  }

  return (
      <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
            className="w-full max-w-lg rounded-[32px] flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-6 duration-300"
            style={{
              backgroundColor: "var(--bg-panel)",
              border: "1px solid var(--surface-line)",
              boxShadow: "var(--shadow-card)",
              color: "var(--text-main)",
            }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid var(--surface-line)" }}>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>Dodaj utwór</h2>
              <p className="text-xs mt-1 uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>
                Wyszukaj piosenkę i dodaj do playlisty
              </p>
            </div>
            <button
                onClick={onClose}
                className="p-2.5 rounded-2xl transition-all"
                style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Playlist picker (shown only when no playlist pre-selected) */}
          {needsPlaylistPicker && (
              <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--surface-line)" }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-soft)" }}>
                  <List size={12} className="inline mr-1" />
                  Wybierz playlistę
                </p>
                {playlistsLoading ? (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ładowanie playlist...</p>
                ) : localPlaylists.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Brak lokalnych playlist. Utwórz playlistę w sekcji Playlisty.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                      {localPlaylists.map((pl) => (
                          <button
                              key={pl.id}
                              onClick={() => { setSelectedPlaylistId(pl.id); setSelectedIsLocal(true); }}
                              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                              style={
                                selectedPlaylistId === pl.id
                                    ? { backgroundColor: "var(--primary)", color: "#fff" }
                                    : { backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }
                              }
                          >
                            {pl.title}
                          </button>
                      ))}
                    </div>
                )}
              </div>
          )}

          {/* Search Input */}
          <div className="p-4" style={{ borderBottom: "1px solid var(--surface-line)" }}>
            <div className="relative">
              <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-soft)" }}
              />
              <input
                  ref={inputRef}
                  type="text"
                  placeholder="Szukaj piosenki, artysty..."
                  className="w-full rounded-2xl py-3.5 pl-12 pr-10 focus:outline-none transition-all text-sm font-medium"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    border: "1px solid var(--surface-line)",
                    color: "var(--text-main)",
                  }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                  <button
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all"
                      style={{ color: "var(--text-muted)" }}
                  >
                    <X size={14} />
                  </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div
                      className="w-8 h-8 border-4 rounded-full animate-spin"
                      style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", borderTopColor: "var(--primary)" }}
                  />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-soft)" }}>
                    Szukam...
                  </p>
                </div>
            )}

            {!loading && error && (
                <div className="text-center py-8 text-sm font-medium text-red-400 px-4">{error}</div>
            )}

            {!loading && !error && query.trim().length < 2 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4" style={{ color: "var(--text-soft)" }}>
                  <Music size={40} />
                  <p className="text-sm font-medium">Wpisz nazwę piosenki lub artysty</p>
                </div>
            )}

            {!loading && !error && results.length === 0 && query.trim().length >= 2 && (
                <div className="text-center py-12 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                  Brak wyników dla „{query}"
                </div>
            )}

            {!loading && results.map((track) => {
              const artist =
                  track.artists?.map((a) => a.name).join(", ") ||
                  track.author ||
                  "Nieznany artysta";
              const isAdding = adding === track.videoId;
              const canAdd = !!(selectedPlaylistId || initialPlaylistId);
              return (
                  <div
                      key={track.videoId || track.title}
                      className="flex items-center gap-3 p-3 rounded-2xl transition-all group"
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div
                        className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}
                    >
                      {track.thumbnail ? (
                          <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--text-soft)" }}>
                            <Music size={20} />
                          </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-sm" style={{ color: "var(--text-main)" }}>{track.title}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{artist}</p>
                      {track.duration && (
                          <p className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--text-soft)" }}>{track.duration}</p>
                      )}
                    </div>
                    <button
                        onClick={() => handleAdd(track)}
                        disabled={isAdding || !track.videoId || !canAdd}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                        style={isAdding
                            ? { backgroundColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)" }
                            : { backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }
                        }
                        onMouseEnter={(e) => { if (!isAdding && canAdd) { e.currentTarget.style.backgroundColor = "var(--primary)"; e.currentTarget.style.color = "#fff"; } }}
                        onMouseLeave={(e) => { if (!isAdding) { e.currentTarget.style.backgroundColor = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-muted)"; } }}
                        title={!canAdd ? "Najpierw wybierz playlistę" : ""}
                    >
                      {isAdding ? (
                          <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", borderTopColor: "var(--primary)" }} />
                      ) : (
                          <Plus size={14} />
                      )}
                      {isAdding ? "Dodaję..." : "Dodaj"}
                    </button>
                  </div>
              );
            })}
          </div>
        </div>
      </div>
  );
}

export default AddTrackModal;