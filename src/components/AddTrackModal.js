import React, { useState, useRef, useEffect } from "react";
import { fetchJson } from "../lib/api";
import { Search, X, Plus, Music } from "./Icons";

function AddTrackModal({ playlistId, isLocal, onClose, onAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    if (!track.videoId) return;
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
    } catch (err) {
      setError("Nie udało się dodać utworu. Sprawdź połączenie.");
    } finally {
      setAdding(null);
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg bg-neutral-950 border border-white/10 rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-6 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">Dodaj utwór</h2>
            <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest font-bold">
              Wyszukaj piosenkę i dodaj do playlisty
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-white/5">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-red-500 transition-colors"
              size={18}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Szukaj piosenki, artysty..."
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-3.5 pl-12 pr-10 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40 transition-all text-sm font-medium placeholder:text-neutral-600"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-full text-neutral-500 hover:text-white transition-all"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-8 h-8 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                Szukam...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-8 text-red-400 text-sm font-medium px-4">
              {error}
            </div>
          )}

          {!loading && !error && query.trim().length < 2 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-neutral-600">
              <Music size={40} />
              <p className="text-sm font-medium">
                Wpisz nazwę piosenki lub artysty
              </p>
            </div>
          )}

          {!loading && !error && results.length === 0 && query.trim().length >= 2 && (
            <div className="text-center py-12 text-neutral-500 text-sm font-medium">
              Brak wyników dla „{query}"
            </div>
          )}

          {!loading &&
            results.map((track) => {
              const artist =
                track.artists?.map((a) => a.name).join(", ") ||
                track.author ||
                "Nieznany artysta";
              const isAdding = adding === track.videoId;
              return (
                <div
                  key={track.videoId || track.title}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-800 border border-white/5">
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music size={20} className="text-neutral-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate text-sm group-hover:text-red-400 transition-colors">
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {artist}
                    </p>
                    {track.duration && (
                      <p className="text-[10px] text-neutral-700 mt-0.5 font-mono">
                        {track.duration}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAdd(track)}
                    disabled={isAdding || !track.videoId}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      isAdding
                        ? "bg-red-500/20 text-red-400 cursor-wait"
                        : "bg-white/5 text-neutral-400 hover:bg-red-500 hover:text-white active:scale-95"
                    }`}
                  >
                    {isAdding ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
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
