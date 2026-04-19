import React, { useEffect, useState } from "react";
import { useOutletContext, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Play, Plus, Music as MusicIcon, List, TrendingUp } from "../components/Icons";
import PageSkeleton from "../components/PageSkeleton";
import AddTrackModal from "../components/AddTrackModal";
import { fetchJson } from "../lib/api";

export default function MusicPage({ pageKey }) {
  const { pageData, pageLoading, play } = useOutletContext();
  const { artistId, albumId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playlistId = searchParams.get("playlist");

  const [localData, setLocalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTrackForAdd, setSelectedTrackForAdd] = useState(null);

  useEffect(() => {
    async function fetchDetails() {
      const id = artistId || albumId || playlistId;
      if (!id || (pageKey !== "artist" && pageKey !== "album" && pageKey !== "playlists")) {
        setLocalData(null);
        return;
      }
      
      setLoading(true);
      try {
        let url = "";
        if (pageKey === "artist") url = `/api/ytmusic/artist/${id}`;
        else if (pageKey === "album") url = `/api/ytmusic/album/${id}`;
        else if (pageKey === "playlists") {
           if (id.startsWith("local-")) {
             url = `/api/local/playlists/${id.replace("local-", "")}`;
           } else {
             url = `/api/ytmusic/playlist/${id}`;
           }
        }
        
        if (url) {
          const data = await fetchJson(url);
          setLocalData(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [pageKey, artistId, albumId, playlistId]);

  if (pageLoading || loading) return <PageSkeleton />;

  const displayData = localData || pageData;
  if (!displayData) return null;

  const tracks = displayData.tracks || displayData.songs || displayData.queue || [];
  const items = displayData.primarySection?.items || [];
  const secondaryItems = displayData.secondarySection?.items || [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <div className="relative mb-12 group">
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>
        <div className="relative flex flex-col md:flex-row items-end gap-8">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-[var(--radius-main)] overflow-hidden shadow-2xl flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
            {displayData.thumbnail || displayData.cover || displayData.art ? (
              <img src={displayData.thumbnail || displayData.cover || displayData.art} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <MusicIcon size={64} className="text-white opacity-50" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-3 block">
              {displayData.eyebrow || displayData.category || "Discovery"}
            </span>
            <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-none" style={{ color: "var(--text-main)" }}>
              {displayData.title || displayData.name}
            </h1>
            <p className="text-lg font-medium opacity-60 max-w-2xl mb-8 leading-relaxed">
              {displayData.description || displayData.author || "Explore new sounds curated for you."}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => tracks.length > 0 && play(tracks[0], tracks)}
                className="px-8 py-4 bg-primary text-white rounded-full font-black uppercase tracking-widest flex items-center gap-3 hover:scale-110 active:scale-95 transition-all shadow-xl shadow-primary/20"
              >
                <Play size={20} fill="white" />
                Play All
              </button>
              {displayData.stats?.map((stat, i) => (
                <div key={i} className="px-6 py-4 rounded-[var(--radius-main)] bg-white/5 border border-white/10">
                  <span className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</span>
                  <span className="text-lg font-bold">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chips / Categories */}
      {displayData.chips?.length > 0 && (
        <div className="flex gap-3 mb-12 overflow-x-auto pb-2 scrollbar-hide">
          {displayData.chips.map((chip, i) => (
            <button
              key={i}
              className="px-6 py-2.5 rounded-full border border-surface-line hover:border-primary hover:text-primary transition-all text-sm font-bold whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content (Tracks/Grid) */}
        <div className="lg:col-span-2 space-y-12">
          {tracks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  <List className="text-primary" />
                  Tracks
                </h2>
                <span className="text-sm font-bold opacity-40 uppercase tracking-widest">{tracks.length} Items</span>
              </div>
              <div className="space-y-1">
                {tracks.map((track, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-4 p-3 rounded-[var(--radius-main)] hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/10"
                    onClick={() => play(track, tracks)}
                  >
                    <div className="w-10 text-xs font-black opacity-20 group-hover:opacity-0 transition-opacity">
                      {(i + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                      <img src={track.thumbnail || track.art} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play size={16} fill="white" className="text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate group-hover:text-primary transition-colors">{track.title}</p>
                      <p className="text-xs font-medium opacity-40 truncate uppercase tracking-wider">{track.artist || track.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackForAdd(track);
                          setIsAddModalOpen(true);
                        }}
                        className="p-2 hover:text-primary transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                      <span className="text-xs font-black opacity-40 tabular-nums">
                        {track.duration || "0:00"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {items.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black tracking-tight">{displayData.primarySection?.title || "Top Hits"}</h2>
                <button className="text-sm font-black uppercase tracking-widest text-primary hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item, i) => (
                  <div 
                    key={i} 
                    className="glass-card p-4 rounded-[var(--radius-main)] group cursor-pointer"
                    onClick={() => {
                      if (item.videoId) play(item);
                      else if (item.browseId) {
                        const type = item.resultType || (item.browseId.startsWith("UC") ? "artist" : "album");
                        navigate(`/${type}/${item.browseId}`);
                      }
                    }}
                  >
                    <div className="aspect-square rounded-[calc(var(--radius-main)-8px)] overflow-hidden mb-4 relative shadow-lg">
                      <img src={item.cover || item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          <Play size={24} fill="black" className="text-black ml-1" />
                        </div>
                      </div>
                      {item.meta && (
                        <span className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[8px] font-black uppercase tracking-widest text-white border border-white/10">
                          {item.meta}
                        </span>
                      )}
                    </div>
                    <p className="font-bold truncate group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-xs font-medium opacity-40 truncate mt-1 uppercase tracking-wider">{item.subtitle || item.author}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar content */}
        <div className="space-y-12">
          {displayData.chartItems?.length > 0 && (
            <section className="glass p-8 rounded-[var(--radius-main)]">
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                <TrendingUp className="text-primary" />
                {displayData.chartTitle || "Trending"}
              </h2>
              <div className="space-y-6">
                {displayData.chartItems.map((chart, i) => (
                  <div key={i} className="flex items-center gap-4 group cursor-pointer">
                    <span className="text-2xl font-black opacity-10 italic w-8">{chart.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate group-hover:text-primary transition-colors">{chart.title}</p>
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{chart.subtitle}</p>
                    </div>
                    <span className="text-xs font-bold text-green-500">{chart.change}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {secondaryItems.length > 0 && (
            <section>
              <h2 className="text-2xl font-black mb-8">{displayData.secondarySection?.title || "Recommended"}</h2>
              <div className="grid grid-cols-2 gap-4">
                {secondaryItems.slice(0, 6).map((item, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="aspect-square rounded-[var(--radius-main)] overflow-hidden mb-3 shadow-lg">
                      <img src={item.cover || item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <p className="text-xs font-bold truncate">{item.title}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <AddTrackModal
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedTrackForAdd(null);
          }}
          initialTrack={selectedTrackForAdd}
          playlistId={playlistId}
          isLocal={playlistId?.startsWith("local-")}
        />
      )}
    </div>
  );
}
