import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { Play, ArrowLeft, Music as MusicIcon, Disc, Users, TrendingUp } from "../components/Icons";
import PageSkeleton from "../components/PageSkeleton";
import { fetchJson } from "../lib/api";
import { useLanguage } from "../contexts/LanguageContext";

function getItemKey(item, index) {
  return item?.videoId || item?.browseId || `${item?.title || "item"}-${index}`;
}

export default function ArtistDetailPage() {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const { play, playNext, addToQueue, nowPlaying } = useOutletContext();
  const { language } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("songs");

  useEffect(() => {
    async function fetchArtist() {
      setLoading(true);
      setError(null);
      try {
        const artist = await fetchJson(`/api/ytmusic/artist/${artistId}`);
        setData(artist);
      } catch (err) {
        console.error("Artist fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (artistId) fetchArtist();
  }, [artistId]);

  if (loading) return <PageSkeleton />;
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-50">
        <MusicIcon size={48} />
        <p className="text-lg font-semibold">{language === "pl" ? "Nie znaleziono wykonawcy" : "Artist not found"}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
          <ArrowLeft size={16} /> {language === "pl" ? "Wróć" : "Go back"}
        </button>
      </div>
    );
  }

  const thumbnail = data.thumbnails?.[data.thumbnails.length - 1]?.url || null;
  const songs = data.songs?.results || [];
  const albums = data.albums?.results || [];
  const singles = data.singles?.results || [];
  const related = data.related?.results || [];
  const allTracks = [...songs];

  const tabs = [
    { key: "songs", label: language === "pl" ? "Utwory" : "Songs", icon: MusicIcon, count: songs.length },
    { key: "albums", label: language === "pl" ? "Albumy" : "Albums", icon: Disc, count: albums.length },
    { key: "singles", label: language === "pl" ? "Single" : "Singles", icon: TrendingUp, count: singles.length },
    { key: "related", label: language === "pl" ? "Podobni" : "Related", icon: Users, count: related.length },
  ];

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm" style={{ backgroundColor: "var(--bg-hover)" }}>
            {thumbnail ? <img src={thumbnail} alt={data.name} className="w-full h-full object-cover" /> : <MusicIcon size={48} className="opacity-30 m-auto" />}
          </div>
          <div className="flex-1 min-w-0">
            <button onClick={() => navigate(-1)} className="text-[11px] font-semibold uppercase tracking-wider opacity-40 mb-1 flex items-center gap-1.5 hover:opacity-70 transition-opacity">
              <ArrowLeft size={12} /> {language === "pl" ? "Wykonawca" : "Artist"}
            </button>
            <h1 className="text-3xl sm:text-5xl font-bold mb-2 tracking-tight" style={{ color: "var(--text-main)" }}>{data.name}</h1>
            <p className="text-sm opacity-50 max-w-xl mb-4">{data.description || data.subscribers || ""}</p>
            <div className="flex flex-wrap items-center gap-2">
              {allTracks.length > 0 && (
                <button onClick={() => play(allTracks[0], allTracks)} className="px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
                  <Play size={16} fill="currentColor" /> {language === "pl" ? "Odtwórz" : "Play"}
                </button>
              )}
              {data.subscribers && (
                <div className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--surface-line)" }}>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-40">{language === "pl" ? "Subskrybenci" : "Subscribers"}</span>
                  <span className="font-semibold">{data.subscribers}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors"
            style={activeTab === tab.key
              ? { backgroundColor: "var(--primary)", color: "#fff" }
              : { backgroundColor: "transparent", color: "var(--text-muted)" }
            }>
            <tab.icon size={14} /> {tab.label}
            {tab.count > 0 && <span className="text-[10px] opacity-60 ml-0.5">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "songs" && (
        <div className="space-y-0.5">
          {songs.length === 0 ? <EmptyState icon={<MusicIcon size={40} />} text={language === "pl" ? "Brak utworów" : "No songs"} />
            : songs.map((track, i) => (
              <TrackRow key={getItemKey(track, i)} index={i} track={track} onClick={() => play(track, songs)} playNext={playNext} addToQueue={addToQueue} nowPlaying={nowPlaying} />
            ))}
        </div>
      )}

      {activeTab === "albums" && (
        <MediaGrid items={albums} onClick={(album) => album.browseId && navigate(`/album/${album.browseId}`)} fallbackIcon={<Disc size={28} />} />
      )}

      {activeTab === "singles" && (
        <MediaGrid items={singles} onClick={(single) => single.videoId ? play(single) : single.browseId && navigate(`/album/${single.browseId}`)} fallbackIcon={<MusicIcon size={28} />} />
      )}

      {activeTab === "related" && (
        <MediaGrid items={related} onClick={(artist) => artist.browseId && navigate(`/artist/${artist.browseId}`)} fallbackIcon={<Users size={28} />} />
      )}
    </div>
  );
}

function TrackRow({ index, track, onClick, playNext, addToQueue, nowPlaying }) {
  const isCurrent = nowPlaying?.videoId && track?.videoId === nowPlaying.videoId;
  return (
    <div onClick={onClick} className="group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
      style={{ border: "1px solid transparent", backgroundColor: isCurrent ? "var(--bg-hover)" : "transparent", borderColor: isCurrent ? "var(--surface-line)" : "transparent" }}
      onMouseEnter={(e) => { if (!isCurrent) { e.currentTarget.style.backgroundColor = "var(--bg-hover)"; e.currentTarget.style.borderColor = "var(--surface-line)"; } }}
      onMouseLeave={(e) => { if (!isCurrent) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}>
      <div className="w-6 text-center text-xs font-medium opacity-20 tabular-nums flex-shrink-0">
        {isCurrent ? (
          <span className="inline-block w-3 h-3 rounded-full animate-pulse-dot" style={{ backgroundColor: "var(--primary)" }} />
        ) : (
          (index + 1).toString().padStart(2, "0")
        )}
      </div>
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: "var(--bg-hover)" }}>
        {track.thumbnail && <img src={track.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />}
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
      </div>
    </div>
  );
}

function MediaGrid({ items, onClick, fallbackIcon }) {
  if (items.length === 0) return <EmptyState icon={fallbackIcon} text="No items" />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      {items.map((item, i) => (
        <div key={getItemKey(item, i)} className="group cursor-pointer" onClick={() => onClick(item)}>
          <div className="aspect-square rounded-xl overflow-hidden mb-2.5 shadow-sm" style={{ backgroundColor: "var(--bg-hover)" }}>
            {item.thumbnail ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover media-zoom" /> : <div className="w-full h-full flex items-center justify-center opacity-30">{fallbackIcon}</div>}
          </div>
          <p className="text-sm font-semibold truncate group-hover:text-[var(--primary)] transition-colors">{item.title}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
      {icon}
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
