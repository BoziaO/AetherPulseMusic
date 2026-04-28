import React, { useEffect, useState, useCallback, memo } from "react";
import { useOutletContext, useSearchParams, useNavigate } from "react-router-dom";
import { Play, Plus, Music as MusicIcon, List, TrendingUp, Heart, Clock, Sparkles, Flame, Wind } from "../components/Icons";
import PageSkeleton from "../components/PageSkeleton";
import AddTrackModal from "../components/AddTrackModal";
import { fetchJson } from "../lib/api";
import { estimateEnergy, getEnergyDescriptor } from "../lib/energy";
import { useLanguage } from "../contexts/LanguageContext";

function getItemKey(item, index) {
  return item?.videoId || item?.browseId || item?.playlistId || `${item?.title || "item"}-${index}`;
}

const FLOW_PRESETS = {
  focus: { label: "Focus Arc", stages: [35, 58, 42] },
  energy: { label: "Energy Arc", stages: [45, 82, 60] },
  chill: { label: "Chill Arc", stages: [28, 46, 26] },
  discover: { label: "Discovery Arc", stages: [52, 72, 44] },
};

function normalizeTrack(item) {
  if (!item) return null;
  if (!item.videoId) return null;
  return {
    ...item,
    title: item.title || item.name || "Unknown track",
    artist: item.artist || item.subtitle || item.author || "",
    thumbnail: item.thumbnail || item.cover || item.art || null,
    duration: item.duration || "3:00",
  };
}

const EnergyBadge = memo(function EnergyBadge({ track }) {
  const { t } = useLanguage();
  const value = estimateEnergy(track);
  const mood = getEnergyDescriptor(value);
  return (
    <div className="flex items-center gap-2 min-w-[90px] justify-end">
      <div className="w-10 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-hover)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: mood.color }} />
      </div>
      <span className="text-[10px] font-semibold" style={{ color: mood.color }}>{t(mood.labelKey)}</span>
    </div>
  );
});

function buildRevolutionQueue(pool, { preset, sessionMinutes, novelty }, historyKeys, favoriteKeys) {
  const base = FLOW_PRESETS[preset] || FLOW_PRESETS.discover;
  const targetSeconds = Math.max(10, sessionMinutes) * 60;
  const uniq = new Map();
  pool.forEach((track) => {
    const key = track.videoId;
    if (!key) return;
    if (!uniq.has(key)) uniq.set(key, normalizeTrack(track));
  });
  const candidates = Array.from(uniq.values()).filter(Boolean);
  if (!candidates.length) return [];

  const stageWeights = [0.28, 0.46, 0.26];
  const stageTargets = stageWeights.map((w) => Math.max(1, Math.round((targetSeconds * w) / 180)));
  const result = [];
  const used = new Set();

  function pickForStage(targetEnergy, desiredCount) {
    for (let i = 0; i < desiredCount; i += 1) {
      const sorted = candidates
        .filter((t) => !used.has(t.videoId))
        .map((track) => {
          const trackEnergy = estimateEnergy(track);
          const energyGap = Math.abs(targetEnergy - trackEnergy);
          const affinity = favoriteKeys.has(track.videoId) ? 14 : historyKeys.has(track.videoId) ? 7 : 0;
          const noveltyShift = novelty > 60 ? -affinity : affinity;
          const randomDrift = Math.random() * 6;
          const score = energyGap - noveltyShift + randomDrift;
          return { track, score };
        })
        .sort((a, b) => a.score - b.score);
      const next = sorted[0]?.track;
      if (!next) break;
      used.add(next.videoId);
      result.push(next);
    }
  }

  pickForStage(base.stages[0], stageTargets[0]);
  pickForStage(base.stages[1], stageTargets[1]);
  pickForStage(base.stages[2], stageTargets[2]);

  if (!result.length) return candidates.slice(0, 12);
  return result;
}

export default function MusicPage({ pageKey }) {
  const { language, t } = useLanguage();
  const { pageData, pageLoading, play, playNext, addToQueue, nowPlaying, favoriteItems, recentPlays, toggleFavoriteTrack } = useOutletContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playlistId = searchParams.get("playlist");

  const [localData, setLocalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTrackForAdd, setSelectedTrackForAdd] = useState(null);
  const [flowPreset, setFlowPreset] = useState("discover");
  const [flowMinutes, setFlowMinutes] = useState(35);
  const [flowNovelty, setFlowNovelty] = useState(55);
  const [flowQueue, setFlowQueue] = useState([]);

  useEffect(() => {
    async function fetchDetails() {
      if (!playlistId || pageKey !== "playlists") {
        setLocalData(null);
        return;
      }
      setLoading(true);
      try {
        let url = "";
        if (playlistId.startsWith("local-")) {
          url = `/api/local/playlists/${playlistId.replace("local-", "")}`;
        } else {
          url = `/api/ytmusic/playlist/${playlistId}`;
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
  }, [pageKey, playlistId]);

  const handleAddClick = useCallback((e, track) => {
    e.stopPropagation();
    setSelectedTrackForAdd(track);
    setIsAddModalOpen(true);
  }, []);

  // ── Favorites page ──────────────────────────────────────────────────────────
  if (pageKey === "favorites") {
    const favTracks = Array.isArray(favoriteItems) ? favoriteItems : [];
    return (
      <div className="animate-fade">
        <HeroSection
          title={language === "pl" ? "Ulubione" : "Favorites"}
          subtitle={language === "pl" ? "Twoje ulubione utwory zapisane podczas słuchania." : "Your favorite tracks saved while listening."}
          icon={<Heart size={48} className="opacity-40" />}
          count={favTracks.length}
          countLabel={language === "pl" ? "Ulubione" : "Favorites"}
          onPlay={() => favTracks.length > 0 && play(favTracks[0], favTracks)}
          playLabel={language === "pl" ? "Odtwórz wszystko" : "Play all"}
          disabled={favTracks.length === 0}
        />
        {favTracks.length === 0 ? (
          <EmptyState icon={<Heart size={48} />} title={language === "pl" ? "Brak ulubionych" : "No favorites"}
            subtitle={language === "pl" ? "Kliknij ❤ podczas odtwarzania, aby dodać utwór." : "Click ❤ while playing to add a track."} />
        ) : (
          <TrackList tracks={favTracks} play={play} onAdd={handleAddClick} toggleFavoriteTrack={toggleFavoriteTrack} showFavorite playNext={playNext} addToQueue={addToQueue} nowPlaying={nowPlaying} />
        )}
        {isAddModalOpen && (
          <AddTrackModal onClose={() => { setIsAddModalOpen(false); setSelectedTrackForAdd(null); }} initialTrack={selectedTrackForAdd} />
        )}
      </div>
    );
  }

  // ── Recent plays page ───────────────────────────────────────────────────────
  if (pageKey === "recent") {
    const recent = Array.isArray(recentPlays) ? recentPlays : [];
    return (
      <div className="animate-fade">
        <HeroSection
          title={language === "pl" ? "Ostatnio grane" : "Recently played"}
          subtitle={language === "pl" ? "Wróć do ostatnio odtwarzanych utworów. Historia przechowywana lokalnie." : "Return to recently played tracks. History stored locally."}
          icon={<Clock size={48} className="opacity-40" />}
          count={recent.length}
          countLabel={language === "pl" ? "Historia" : "History"}
          onPlay={() => recent.length > 0 && play(recent[0], recent)}
          playLabel={language === "pl" ? "Odtwórz od nowa" : "Play again"}
          disabled={recent.length === 0}
        />
        {recent.length === 0 ? (
          <EmptyState icon={<Clock size={48} />} title={language === "pl" ? "Brak historii" : "No history"}
            subtitle={language === "pl" ? "Zacznij słuchać, aby historia się wypełniła." : "Start listening to fill your history."} />
        ) : (
          <TrackList tracks={recent} play={play} onAdd={handleAddClick} playNext={playNext} addToQueue={addToQueue} nowPlaying={nowPlaying} />
        )}
        {isAddModalOpen && (
          <AddTrackModal onClose={() => { setIsAddModalOpen(false); setSelectedTrackForAdd(null); }} initialTrack={selectedTrackForAdd} />
        )}
      </div>
    );
  }

  // ── All other pages ──
  if (pageLoading || loading) return <PageSkeleton />;

  const displayData = localData || pageData;
  if (!displayData) return null;

  const tracks = displayData.tracks || displayData.songs || displayData.queue || [];
  const items = displayData.primarySection?.items || [];
  const secondaryItems = displayData.secondarySection?.items || [];
  const tertiaryItems = displayData.tertiarySection?.items || [];
  const chartVideoItems = (displayData.chartItems || []).filter((item) => item?.videoId);
  const userRecentKeys = new Set((recentPlays || []).map((t) => t?.videoId).filter(Boolean));
  const userFavoriteKeys = new Set((favoriteItems || []).map((t) => t?.videoId).filter(Boolean));
  const energyPool = [...tracks, ...items, ...secondaryItems].slice(0, 18);
  const averageEnergy = energyPool.length
    ? Math.round(energyPool.reduce((sum, track) => sum + estimateEnergy(track), 0) / energyPool.length)
    : 50;
  const cloudLayer = averageEnergy < 40 ? t("calm") : averageEnergy < 70 ? t("medium") : t("intense");
  const lightningChance = Math.max(5, Math.min(95, Math.round((averageEnergy - 25) * 1.5)));

  const isHome = pageKey === "home";
  const isDiscover = pageKey === "discover" || pageKey === "chill" || pageKey === "energy";

  return (
    <div className="animate-fade">
      {isHome ? (
        <HomeHero
          eyebrow={displayData.eyebrow}
          title={displayData.title}
          subtitle={displayData.description}
          cover={displayData.thumbnail || displayData.cover || displayData.art}
          spotlightTitle={displayData.spotlightTitle}
          spotlightText={displayData.spotlightText}
          spotlightItems={displayData.spotlightItems}
          stats={displayData.stats}
          onPlay={() => tracks.length > 0 && play(tracks[0], tracks)}
          playLabel={t("playAll")}
        />
      ) : isDiscover ? (
        <DiscoverHero
          eyebrow={displayData.eyebrow}
          title={displayData.title}
          subtitle={displayData.description}
          mood={pageKey}
        />
      ) : (
        <HeroSection
          title={displayData.title || displayData.name}
          subtitle={displayData.description || displayData.author || (language === "pl" ? "Odkrywaj nową muzykę dopasowaną do Ciebie." : "Discover new music made for you.")}
          eyebrow={displayData.eyebrow || displayData.category || "Discovery"}
          cover={displayData.thumbnail || displayData.cover || displayData.art}
          stats={displayData.stats}
          onPlay={() => tracks.length > 0 && play(tracks[0], tracks)}
          playLabel={t("playAll")}
        />
      )}

      {displayData.chips?.length > 0 && (
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
          {displayData.chips.map((chip, i) => (
            <button key={`${chip}-${i}`}
              className="px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
              style={{ borderColor: "var(--surface-line)", color: "var(--text-muted)", backgroundColor: "var(--bg-card)" }}>
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {isHome && (
            <section className="p-5 sm:p-6 rounded-2xl border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--surface-line)" }}>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold">{t("revolutionFlowComposer")}</h2>
                  <p className="text-xs opacity-50 mt-0.5">{t("revolutionFlowDesc")}</p>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold border" style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", color: "var(--primary)" }}>
                  {t("newListeningMode")}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {Object.entries(FLOW_PRESETS).map(([key, cfg]) => (
                  <button key={key} onClick={() => setFlowPreset(key)}
                    className="px-3 py-2.5 rounded-xl text-left border transition-colors text-sm"
                    style={flowPreset === key
                      ? { borderColor: "var(--primary)", backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }
                      : { borderColor: "var(--surface-line)", backgroundColor: "transparent" }
                    }>
                    <p className="font-semibold text-sm">{cfg.label}</p>
                    <p className="text-[10px] opacity-40 mt-0.5">{cfg.stages.join(" / ")} energy</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-hover)" }}>
                  <div className="flex justify-between text-xs font-medium opacity-50 mb-2">
                    <span>{t("sessionLength")}</span><span>{flowMinutes} min</span>
                  </div>
                  <input type="range" min="10" max="120" step="5" value={flowMinutes} onChange={(e) => setFlowMinutes(Number(e.target.value))} className="w-full" />
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-hover)" }}>
                  <div className="flex justify-between text-xs font-medium opacity-50 mb-2">
                    <span>{t("discoveryLevel")}</span><span>{flowNovelty}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={flowNovelty} onChange={(e) => setFlowNovelty(Number(e.target.value))} className="w-full" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => {
                  const pool = [...tracks, ...items, ...secondaryItems, ...tertiaryItems, ...chartVideoItems];
                  const generated = buildRevolutionQueue(pool, { preset: flowPreset, sessionMinutes: flowMinutes, novelty: flowNovelty }, userRecentKeys, userFavoriteKeys);
                  setFlowQueue(generated);
                }} className="px-5 py-2.5 rounded-lg font-semibold text-sm" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
                  {t("generateFlow")}
                </button>
                <button onClick={() => flowQueue.length > 0 && play(flowQueue[0], flowQueue)} disabled={flowQueue.length === 0}
                  className="px-5 py-2.5 rounded-lg border font-semibold text-sm disabled:opacity-30"
                  style={{ borderColor: "var(--surface-line)", color: "var(--text-main)" }}>
                  {t("playFlow")}
                </button>
                {flowQueue.length > 0 && (
                  <span className="text-xs opacity-40">{flowQueue.length} {t("tracksInSession")}</span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--surface-line)" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-1">{t("visualPulse")}</p>
                  <p className="text-xs opacity-60">{t("visualPulseDesc")}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--surface-line)" }}>
                  <div className="flex items-center justify-between text-xs font-medium opacity-50 mb-2">
                    <span>{t("cloudLayer")}</span><span>{cloudLayer}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-hover)" }}>
                    <div className="h-full rounded-full" style={{ width: `${lightningChance}%`, backgroundColor: "var(--primary)", opacity: 0.7 }} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {tracks.length > 0 && (
            <section>
              <SectionHeader icon={<List size={20} />} title={t("tracks")} count={tracks.length} />
              <TrackList tracks={tracks} play={play} onAdd={handleAddClick} playNext={playNext} addToQueue={addToQueue} nowPlaying={nowPlaying} />
            </section>
          )}

          {items.length > 0 && (
            <section>
              <SectionHeader title={displayData.primarySection?.title || "Top Hits"} />
              <MediaGrid items={items} play={play} navigate={navigate} />
            </section>
          )}

          {tertiaryItems.length > 0 && (
            <section>
              <SectionHeader title={displayData.tertiarySection?.title || "More music"} />
              <MediaGrid items={tertiaryItems} play={play} navigate={navigate} />
            </section>
          )}
        </div>

        <div className="space-y-10">
          {displayData.chartItems?.length > 0 && (
            <section className="p-5 rounded-2xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                <TrendingUp size={18} style={{ color: "var(--primary)" }} />
                {displayData.chartTitle || "Trending"}
              </h2>
              <div className="space-y-4">
                {displayData.chartItems.map((chart, i) => (
                  <div key={`${chart.label || chart.title || "chart"}-${i}`} className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => {
                      if (chart.videoId) play({ ...chart, thumbnail: chart.thumbnail || displayData.thumbnail }, displayData.chartItems.filter((c) => c.videoId));
                      else if (chart.browseId) navigate(`/artist/${chart.browseId}`);
                    }}>
                    <span className="text-lg font-bold opacity-10 italic w-6">{chart.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-[var(--primary)] transition-colors">{chart.title}</p>
                      <p className="text-[10px] opacity-40">{chart.subtitle}</p>
                    </div>
                    <span className="text-xs font-medium" style={{ color: "#22c55e" }}>{chart.change}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {secondaryItems.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-4">{displayData.secondarySection?.title || "Recommended"}</h2>
              <div className="grid grid-cols-2 gap-3">
                {secondaryItems.slice(0, 6).map((item, i) => (
                  <div key={getItemKey(item, i)} className="group cursor-pointer" onClick={() => item.browseId && navigate(`/${item.browseId.startsWith("UC") ? "artist" : "album"}/${item.browseId}`)}>
                    <div className="aspect-square rounded-xl overflow-hidden mb-2" style={{ backgroundColor: "var(--bg-hover)" }}>
                      <img src={item.cover || item.thumbnail} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover media-zoom" />
                    </div>
                    <p className="text-xs font-semibold truncate">{item.title}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <AddTrackModal onClose={() => { setIsAddModalOpen(false); setSelectedTrackForAdd(null); }} initialTrack={selectedTrackForAdd} playlistId={playlistId} isLocal={playlistId?.startsWith("local-")} />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function HeroSection({ title, subtitle, eyebrow, icon, cover, stats, onPlay, playLabel, disabled, count, countLabel }) {
  return (
    <div className="mb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
        <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm" style={{ backgroundColor: "var(--bg-hover)" }}>
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover" />
          ) : icon ? (
            <div className="w-full h-full flex items-center justify-center">{icon}</div>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-hover)" }}>
              <MusicIcon size={48} className="opacity-30" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {eyebrow && <span className="text-[11px] font-semibold uppercase tracking-wider opacity-40 mb-1 block">{eyebrow}</span>}
          <h1 className="text-3xl sm:text-5xl font-bold mb-2 tracking-tight" style={{ color: "var(--text-main)" }}>{title}</h1>
          <p className="text-sm opacity-50 max-w-xl mb-4 leading-relaxed">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onPlay} disabled={disabled}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-30 transition-colors"
              style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
              <Play size={16} fill="currentColor" />
              {playLabel}
            </button>
            {stats?.map((stat, i) => (
              <div key={`${stat.label || "stat"}-${i}`} className="px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--surface-line)" }}>
                <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-40">{stat.label}</span>
                <span className="font-semibold">{stat.value}</span>
              </div>
            ))}
            {count !== undefined && (
              <div className="px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--surface-line)" }}>
                <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-40">{countLabel}</span>
                <span className="font-semibold">{count}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeHero({ eyebrow, title, subtitle, cover, spotlightTitle, spotlightText, spotlightItems, stats, onPlay, playLabel }) {
  return (
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-3xl border p-6 sm:p-8" style={{
        borderColor: "var(--surface-line)",
        background: `radial-gradient(ellipse 80% 50% at 20% 40%, color-mix(in srgb, var(--primary) 12%, transparent), transparent),
                       radial-gradient(ellipse 60% 40% at 80% 60%, color-mix(in srgb, var(--primary) 8%, transparent), transparent),
                       var(--bg-card)`
      }}>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 min-w-0">
            {eyebrow && <span className="text-[11px] font-semibold uppercase tracking-wider opacity-40 mb-2 block">{eyebrow}</span>}
            <h1 className="text-3xl sm:text-5xl font-bold mb-3 tracking-tight" style={{ color: "var(--text-main)" }}>{title}</h1>
            <p className="text-sm opacity-50 max-w-lg mb-6 leading-relaxed">{subtitle}</p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button onClick={onPlay}
                className="px-6 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
                <Play size={16} fill="currentColor" />
                {playLabel}
              </button>
            </div>

            {stats?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {stats.map((stat, i) => (
                  <div key={`${stat.label || "stat"}-${i}`} className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2" style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--surface-line)" }}>
                    <span className="opacity-40">{stat.label}</span>
                    <span className="font-bold" style={{ color: "var(--primary)" }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="rounded-2xl p-5 border" style={{ backgroundColor: "var(--bg-main)", borderColor: "var(--surface-line)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} style={{ color: "var(--primary)" }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-40">{spotlightTitle || "Spotlight"}</span>
              </div>
              <p className="text-sm font-semibold mb-3">{spotlightText}</p>
              {spotlightItems?.length > 0 && (
                <ol className="space-y-1.5">
                  {spotlightItems.slice(0, 5).map((line, i) => (
                    <li key={i} className="text-xs opacity-50 truncate">{line}</li>
                  ))}
                </ol>
              )}
              {cover && (
                <div className="mt-4 aspect-video rounded-xl overflow-hidden" style={{ backgroundColor: "var(--bg-hover)" }}>
                  <img src={cover} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscoverHero({ eyebrow, title, subtitle, mood }) {
  const MoodIcon = mood === "energy" ? Flame : mood === "chill" ? Wind : Sparkles;
  return (
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-3xl border p-8 sm:p-12 text-center" style={{
        borderColor: "var(--surface-line)",
        background: `radial-gradient(ellipse 60% 50% at 50% 120%, color-mix(in srgb, var(--primary) 18%, transparent), transparent), var(--bg-card)`
      }}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
          <MoodIcon size={24} style={{ color: "var(--primary)" }} />
        </div>
        {eyebrow && <span className="text-[11px] font-semibold uppercase tracking-wider opacity-40 mb-2 block">{eyebrow}</span>}
        <h1 className="text-3xl sm:text-5xl font-bold mb-3 tracking-tight" style={{ color: "var(--text-main)" }}>{title}</h1>
        <p className="text-sm opacity-50 max-w-md mx-auto leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, count }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: "var(--primary)" }}>{icon}</span>}
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {count !== undefined && <span className="text-xs font-medium opacity-40">{count}</span>}
    </div>
  );
}

function TrackList({ tracks, play, onAdd, toggleFavoriteTrack, showFavorite, playNext, addToQueue, nowPlaying }) {
  return (
    <div className="space-y-0.5">
      {tracks.map((track, i) => {
        const isCurrent = nowPlaying?.videoId && track?.videoId === nowPlaying.videoId;
        return (
          <div key={getItemKey(track, i)}
            className="group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors stagger-item"
            style={{ border: "1px solid transparent", backgroundColor: isCurrent ? "var(--bg-hover)" : "transparent", borderColor: isCurrent ? "var(--surface-line)" : "transparent", animationDelay: `${Math.min(i * 30, 600)}ms` }}
            onClick={() => play(track, tracks)}
            onMouseEnter={(e) => { if (!isCurrent) { e.currentTarget.style.backgroundColor = "var(--bg-hover)"; e.currentTarget.style.borderColor = "var(--surface-line)"; } }}
            onMouseLeave={(e) => { if (!isCurrent) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
          >
            <div className="w-6 text-center text-xs font-medium opacity-20 tabular-nums flex-shrink-0">
              {isCurrent ? (
                <span className="inline-block w-3 h-3 rounded-full animate-pulse-dot" style={{ backgroundColor: "var(--primary)" }} />
              ) : (
                (i + 1).toString().padStart(2, "0")
              )}
            </div>
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: "var(--bg-hover)" }}>
              {(track.art || track.thumbnail) && <img src={track.art || track.thumbnail} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                <Play size={14} fill="white" className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: isCurrent ? "var(--primary)" : "var(--text-main)" }}>{track.title}</p>
              <p className="text-xs truncate opacity-40">{track.artist || track.subtitle}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <EnergyBadge track={track} />
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
              {showFavorite && toggleFavoriteTrack && (
                <button onClick={(e) => { e.stopPropagation(); toggleFavoriteTrack(track); }} className="p-1.5 rounded-md transition-colors" style={{ color: "var(--primary)" }}>
                  <Heart size={16} fill="currentColor" />
                </button>
              )}
              {onAdd && (
                <button onClick={(e) => onAdd(e, track)} className="p-1.5 rounded-md transition-colors" style={{ color: "var(--text-muted)" }}>
                  <Plus size={16} />
                </button>
              )}
              <span className="text-[11px] font-medium opacity-30 tabular-nums w-8 text-right">{track.duration || ""}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MediaGrid({ items, play, navigate }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div key={getItemKey(item, i)} className="group cursor-pointer stagger-item" style={{ animationDelay: `${Math.min(i * 40, 800)}ms` }}
          onClick={() => {
            if (item.videoId) play(item);
            else if (item.browseId) navigate(`/${item.resultType || (item.browseId.startsWith("UC") ? "artist" : "album")}/${item.browseId}`);
          }}>
          <div className="aspect-square rounded-xl overflow-hidden mb-2.5 relative shadow-sm" style={{ backgroundColor: "var(--bg-hover)" }}>
            <img src={item.cover || item.thumbnail} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover media-zoom" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                <Play size={18} fill="black" className="text-black ml-0.5" />
              </div>
            </div>
            {item.meta && (
              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                {item.meta}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold truncate group-hover:text-[var(--primary)] transition-colors">{item.title}</p>
          <p className="text-xs truncate opacity-40 mt-0.5">{item.subtitle || item.author}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 opacity-40">
      {icon}
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm">{subtitle}</p>
    </div>
  );
}
