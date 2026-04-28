import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Clock, Heart, Music, TrendingUp, Zap, Disc, BarChart3 } from "../components/Icons";
import { useLanguage } from "../contexts/LanguageContext";
import { estimateEnergy } from "../lib/energy";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0m";
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

function parseDurationToSeconds(durationStr) {
  if (!durationStr) return 0;
  if (typeof durationStr === "number") return durationStr;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export default function InsightsPage() {
  const { recentPlays, favoriteItems } = useOutletContext();
  const { language } = useLanguage();

  const stats = useMemo(() => {
    const recent = Array.isArray(recentPlays) ? recentPlays : [];
    const favorites = Array.isArray(favoriteItems) ? favoriteItems : [];
    const totalListens = recent.length;
    const totalFavorites = favorites.length;
    const estimatedSeconds = recent.reduce((sum, track) => sum + parseDurationToSeconds(track.duration), 0);
    const artistCounts = {};
    recent.forEach((track) => {
      const artist = track.artist || track.subtitle || "Unknown";
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
    const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const energyValues = recent.map((track) => estimateEnergy(track));
    const avgEnergy = energyValues.length ? Math.round(energyValues.reduce((a, b) => a + b, 0) / energyValues.length) : 50;
    const uniqueTracks = new Set(recent.map((t) => t.videoId || t.title)).size;
    return { totalListens, totalFavorites, estimatedSeconds, topArtists, avgEnergy, uniqueTracks };
  }, [recentPlays, favoriteItems]);

  const statCards = [
    { icon: Music, label: language === "pl" ? "Odsłuchane" : "Listens", value: stats.totalListens, color: "var(--primary)" },
    { icon: Heart, label: language === "pl" ? "Ulubione" : "Favorites", value: stats.totalFavorites, color: "#ff6b9d" },
    { icon: Clock, label: language === "pl" ? "Czas" : "Time", value: formatDuration(stats.estimatedSeconds), color: "#3498db" },
    { icon: Disc, label: language === "pl" ? "Unikalne" : "Unique", value: stats.uniqueTracks, color: "#9b59b6" },
  ];

  const energyLabel = stats.avgEnergy < 40 ? (language === "pl" ? "Spokojnie" : "Calm")
    : stats.avgEnergy < 70 ? (language === "pl" ? "Balans" : "Balanced")
    : (language === "pl" ? "Intensywnie" : "Intense");
  const energyColor = stats.avgEnergy < 40 ? "#3498db" : stats.avgEnergy < 70 ? "#f1c40f" : "var(--primary)";

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm" style={{ backgroundColor: "var(--bg-hover)" }}>
            <BarChart3 size={48} className="opacity-30" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-40 mb-1 block">{language === "pl" ? "Statystyki" : "Insights"}</span>
            <h1 className="text-3xl sm:text-5xl font-bold mb-2 tracking-tight" style={{ color: "var(--text-main)" }}>{language === "pl" ? "Twoja muzyka" : "Your Music"}</h1>
            <p className="text-sm opacity-50 max-w-xl">{language === "pl" ? "Analiza nawyków słuchania." : "Analysis of your listening habits."}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="p-4 rounded-xl transition-colors" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                <card.icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold mb-0.5">{card.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-40">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
          <div className="flex items-center gap-2 mb-5">
            <Zap size={18} style={{ color: "var(--primary)" }} />
            <h2 className="text-lg font-bold">{language === "pl" ? "Energia" : "Energy"}</h2>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium opacity-50">{language === "pl" ? "Średnia energia" : "Average"}</span>
            <span className="text-sm font-semibold" style={{ color: energyColor }}>{stats.avgEnergy}% — {energyLabel}</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden mb-5" style={{ backgroundColor: "var(--bg-hover)" }}>
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${stats.avgEnergy}%`, backgroundColor: energyColor }} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: language === "pl" ? "Spokojne" : "Calm", active: stats.avgEnergy < 40, color: "#3498db" },
              { label: language === "pl" ? "Balans" : "Balanced", active: stats.avgEnergy >= 40 && stats.avgEnergy < 70, color: "#f1c40f" },
              { label: language === "pl" ? "Intensywne" : "Intense", active: stats.avgEnergy >= 70, color: "var(--primary)" },
            ].map((m) => (
              <div key={m.label} className="p-2.5 rounded-lg text-center text-xs" style={{ backgroundColor: m.active ? `${m.color}15` : "var(--bg-hover)", border: `1px solid ${m.active ? m.color : "var(--surface-line)"}` }}>
                <p className="font-semibold mb-0.5" style={{ color: m.active ? m.color : "var(--text-muted)" }}>{m.active ? "●" : "○"}</p>
                <p className="opacity-50">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} style={{ color: "var(--primary)" }} />
            <h2 className="text-lg font-bold">{language === "pl" ? "Top wykonawcy" : "Top Artists"}</h2>
          </div>
          {stats.topArtists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
              <Music size={24} />
              <p className="text-sm">{language === "pl" ? "Brak danych" : "No data"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topArtists.map(([artist, count], i) => (
                <div key={artist} className="flex items-center gap-3">
                  <span className="text-sm font-bold opacity-10 italic w-5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{artist}</p>
                  </div>
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-hover)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (count / stats.topArtists[0][1]) * 100)}%`, backgroundColor: "var(--primary)", opacity: 0.7 }} />
                  </div>
                  <span className="text-[11px] font-medium opacity-30 w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 p-5 rounded-2xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} style={{ color: "var(--primary)" }} />
          <h2 className="text-lg font-bold">{language === "pl" ? "Ostatnia aktywność" : "Recent Activity"}</h2>
        </div>
        {recentPlays.length === 0 ? (
          <p className="opacity-40 text-sm">{language === "pl" ? "Brak ostatnich odsłuchów." : "No recent listens."}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentPlays.slice(0, 6).map((track, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--surface-line)" }}>
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: "var(--bg-hover)" }}>
                  {(track.art || track.thumbnail) && <img src={track.art || track.thumbnail} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{track.title}</p>
                  <p className="text-[10px] truncate opacity-40">{track.artist || track.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
