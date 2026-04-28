import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { Play, ArrowLeft, Disc, Clock } from "../components/Icons";
import PageSkeleton from "../components/PageSkeleton";
import { fetchJson } from "../lib/api";
import { useLanguage } from "../contexts/LanguageContext";

function getItemKey(item, index) {
  return item?.videoId || item?.browseId || `${item?.title || "item"}-${index}`;
}

export default function AlbumDetailPage() {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { play, playNext, addToQueue, nowPlaying } = useOutletContext();
  const { language } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAlbum() {
      setLoading(true); setError(null);
      try {
        const album = await fetchJson(`/api/ytmusic/album/${albumId}`);
        setData(album);
      } catch (err) {
        console.error("Album fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (albumId) fetchAlbum();
  }, [albumId]);

  if (loading) return <PageSkeleton />;
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-50">
        <Disc size={48} />
        <p className="text-lg font-semibold">{language === "pl" ? "Nie znaleziono albumu" : "Album not found"}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
          <ArrowLeft size={16} /> {language === "pl" ? "Wróć" : "Go back"}
        </button>
      </div>
    );
  }

  const tracks = data.tracks || [];

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm" style={{ backgroundColor: "var(--bg-hover)" }}>
            {data.thumbnail ? <img src={data.thumbnail} alt={data.title} className="w-full h-full object-cover" /> : <Disc size={48} className="opacity-30 m-auto" />}
          </div>
          <div className="flex-1 min-w-0">
            <button onClick={() => navigate(-1)} className="text-[11px] font-semibold uppercase tracking-wider opacity-40 mb-1 flex items-center gap-1.5 hover:opacity-70 transition-opacity">
              <ArrowLeft size={12} /> {language === "pl" ? "Album" : "Album"}
            </button>
            <h1 className="text-3xl sm:text-5xl font-bold mb-2 tracking-tight" style={{ color: "var(--text-main)" }}>{data.title}</h1>
            <p className="text-sm opacity-50 max-w-xl mb-4">
              {data.artist && <span className="hover:text-[var(--primary)] transition-colors cursor-pointer" onClick={() => navigate(`/artists`)}>{data.artist}</span>}
              {data.year && ` · ${data.year}`}
              {data.description && ` · ${data.description}`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {tracks.length > 0 && (
                <button onClick={() => play(tracks[0], tracks)} className="px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
                  <Play size={16} fill="currentColor" /> {language === "pl" ? "Odtwórz album" : "Play album"}
                </button>
              )}
              <div className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--surface-line)" }}>
                <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-40">{language === "pl" ? "Utwory" : "Tracks"}</span>
                <span className="font-semibold">{tracks.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-0.5">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
            <Disc size={40} />
            <p className="text-sm font-medium">{language === "pl" ? "Brak utworów" : "No tracks"}</p>
          </div>
        ) : (
          tracks.map((track, i) => {
            const isCurrent = nowPlaying?.videoId && track?.videoId === nowPlaying.videoId;
            return (
              <div key={getItemKey(track, i)} onClick={() => play(track, tracks)}
                className="group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
                style={{ border: "1px solid transparent", backgroundColor: isCurrent ? "var(--bg-hover)" : "transparent", borderColor: isCurrent ? "var(--surface-line)" : "transparent" }}
                onMouseEnter={(e) => { if (!isCurrent) { e.currentTarget.style.backgroundColor = "var(--bg-hover)"; e.currentTarget.style.borderColor = "var(--surface-line)"; } }}
                onMouseLeave={(e) => { if (!isCurrent) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}>
                <div className="w-6 text-center text-xs font-medium opacity-20 tabular-nums flex-shrink-0">
                  {isCurrent ? (
                    <span className="inline-block w-3 h-3 rounded-full animate-pulse-dot" style={{ backgroundColor: "var(--primary)" }} />
                  ) : (
                    (i + 1).toString().padStart(2, "0")
                  )}
                </div>
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: "var(--bg-hover)" }}>
                  {data.thumbnail && <img src={data.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                    <Play size={14} fill="white" className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: isCurrent ? "var(--primary)" : "var(--text-main)" }}>{track.title}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {playNext && (
                    <button onClick={(e) => { e.stopPropagation(); playNext(track); }} className="text-[10px] font-semibold px-2 py-1 rounded-md transition-colors hover:bg-[var(--bg-hover)]" style={{ color: "var(--text-muted)" }}>
                      Next
                    </button>
                  )}
                  {addToQueue && (
                    <button onClick={(e) => { e.stopPropagation(); addToQueue(track); }} className="text-[10px] font-semibold px-2 py-1 rounded-md transition-colors hover:bg-[var(--bg-hover)]" style={{ color: "var(--text-muted)" }}>
                      Queue
                    </button>
                  )}
                  <Clock size={14} className="opacity-30" />
                  <span className="text-[11px] font-medium opacity-30 tabular-nums">{track.duration || "--:--"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
