<!--
InsightsPage: Widok analityczny aplikacji.
Prezentuje statystyki słuchania, mapy cieplne aktywności oraz nastroje dnia na podstawie historii użytkownika.
-->
<template>
  <div class="insights-page animate-fade">
    <header class="page-head">
      <h1 class="page-title">{{ t('insightsTitle') }}</h1>
      <p class="page-sub">{{ t('insightsSubtitle') }}</p>
    </header>

    <div v-if="!recentPlays.length" class="empty">
      {{ t('needMoreData') }}
    </div>

    <template v-else>
      <MyWrapped />

      <section class="block mood-card" :style="moodGradientStyle">
        <span class="mood-eyebrow">{{ t('moodOfTheDay') }}</span>
        <h2 class="mood-title">{{ t(`mood_${currentMood.id}`) }}</h2>
        <p class="mood-desc">{{ t(`moodDesc_${currentMood.id}`) }}</p>
        <div class="mood-meta">
          <span class="mood-pill">
            <Clock :size="12" /> {{ t(`timeOfDay_${currentMood.timeOfDay}`) }}
          </span>
          <span class="mood-pill">
            <Activity :size="12" /> {{ t('avgEnergy') }} {{ avgEnergy }}
          </span>
        </div>
      </section>

      <section class="kpi-grid">
        <div class="kpi">
          <span class="kpi-value">{{ recentPlays.length }}</span>
          <span class="kpi-label">{{ t('history') }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-value">{{ totalListenMinutes }} min</span>
          <span class="kpi-label">{{ t('listeningTime') }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-value">{{ avgEnergy }}</span>
          <span class="kpi-label">{{ t('avgEnergy') }}</span>
        </div>
        <div class="kpi">
          <span class="kpi-value">{{ favoriteCount }}</span>
          <span class="kpi-label">{{ t('favorites') }}</span>
        </div>
      </section>

      <section class="block">
        <h2 class="block-title">{{ t('insightsTrend14') }}</h2>
        <div v-if="trendPoints.some((p) => p.count > 0)" class="trend-chart">
          <svg :viewBox="`0 0 ${trendWidth} ${trendHeight}`" preserveAspectRatio="none">
            <path
              :d="trendAreaPath"
              fill="rgba(var(--primary-rgb), 0.18)"
            />
            <path
              :d="trendLinePath"
              fill="none"
              stroke="var(--primary)"
              stroke-width="2"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            <circle
              v-for="(pt, i) in trendCoords"
              :key="i"
              :cx="pt.x"
              :cy="pt.y"
              r="3"
              fill="var(--primary)"
            />
          </svg>
          <div class="trend-axis">
            <span v-for="day in trendPoints" :key="day.label">{{ day.label }}</span>
          </div>
        </div>
        <p v-else class="muted">{{ t('emptyData') }}</p>
      </section>

      <section class="block">
        <h2 class="block-title">{{ t('insightsHeatmap') }}</h2>
        <div class="heatmap-wrap">
          <div class="heatmap-rows">
            <div
              v-for="(row, dayIndex) in heatmapData"
              :key="dayIndex"
              class="heatmap-row"
            >
              <span class="heatmap-day">{{ t(`day_${dayIndex}`) }}</span>
              <div class="heatmap-cells">
                <div
                  v-for="(cell, hour) in row"
                  :key="hour"
                  class="heatmap-cell"
                  :style="{ '--intensity': cell.intensity }"
                  :title="`${cell.count} odtworzeń, ${hour}:00`"
                />
              </div>
            </div>
          </div>
          <div class="heatmap-axis">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>24h</span>
          </div>
        </div>
      </section>

      <section class="block">
        <h2 class="block-title">{{ t('topArtists') }}</h2>
        <div v-if="topArtists.length" class="artist-list">
          <div v-for="entry in topArtists" :key="entry.name" class="artist-row">
            <span class="artist-name">{{ entry.name }}</span>
            <div class="artist-bar">
              <span :style="{ width: `${(entry.count / topArtists[0].count) * 100}%` }" />
            </div>
            <span class="artist-count">{{ entry.count }}</span>
          </div>
        </div>
        <p v-else class="muted">{{ t('emptyData') }}</p>
      </section>

      <section class="block">
        <h2 class="block-title">{{ t('historyEnergy') }}</h2>
        <div v-if="energyPoints.length" class="energy-chart">
          <div
            v-for="(pt, i) in energyPoints"
            :key="i"
            class="energy-bar"
            :style="{ height: `${pt}%` }"
            :title="`${pt}%`"
          />
        </div>
        <p v-else class="muted">{{ t('emptyData') }}</p>
      </section>

      <section class="block">
        <header class="block-head">
          <h2 class="block-title">{{ t('history') }}</h2>
          <RouterLink class="link-btn" to="/recent">{{ t('navRecent') }}</RouterLink>
        </header>
        <TrackList
          :tracks="recentPlays.slice(0, 10)"
          :now-playing="appState.nowPlaying.value"
          :favorite-keys="appState.favoriteKeys.value"
          @play="(track) => appState.play(track, recentPlays.slice(0, 10))"
          @add-queue="appState.addToQueue"
          @play-next="appState.playNext"
          @toggle-favorite="appState.toggleFavoriteTrack"
        />
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, inject } from "vue";
import { RouterLink } from "vue-router";
import { Activity, Clock } from "lucide-vue-next";
import TrackList from "../components/TrackList.vue";
import MyWrapped from "../components/MyWrapped.vue";
import { secondsFromDuration } from "../lib/format";
import { getCurrentMood, getCurrentTimeOfDay, MOOD_PRESETS } from "../lib/smartSuggestions";

const appState = inject("appState");
function t(key) {
  return appState?.t?.(key) ?? key;
}

const recentPlays = computed(() => appState?.recentPlays?.value || []);
const favoriteCount = computed(() => appState?.favoriteItems?.value?.length || 0);

const ENERGY_HIGH = ["remix", "dance", "edm", "bass", "phonk", "trap", "workout", "party"];
const ENERGY_LOW = ["acoustic", "sad", "chill", "ambient", "sleep", "piano", "lofi"];

function estimateEnergy(track) {
  const blob = `${track?.title || ""} ${track?.artist || ""}`.toLowerCase();
  let score = 55;
  ENERGY_HIGH.forEach((word) => {
    if (blob.includes(word)) score += 8;
  });
  ENERGY_LOW.forEach((word) => {
    if (blob.includes(word)) score -= 9;
  });
  return Math.max(15, Math.min(95, score));
}

const totalListenMinutes = computed(() => {
  const total = recentPlays.value.reduce((sum, track) => {
    const sec = Number(track?.durationSeconds) || secondsFromDuration(track?.duration);
    return sum + (sec > 0 ? sec : 180);
  }, 0);
  return Math.round(total / 60);
});

const avgEnergy = computed(() => {
  if (!recentPlays.value.length) return 0;
  const sum = recentPlays.value.reduce((acc, track) => acc + estimateEnergy(track), 0);
  return Math.round(sum / recentPlays.value.length);
});

const energyPoints = computed(() =>
  recentPlays.value.slice(0, 24).reverse().map((track) => estimateEnergy(track)),
);

const topArtists = computed(() => {
  const map = new Map();
  recentPlays.value.forEach((track) => {
    const name = track.artist || track.subtitle || "—";
    map.set(name, (map.get(name) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
});

const currentMood = computed(() => {
  const mood = getCurrentMood({
    avgEnergy: avgEnergy.value,
    favoriteGenres: topArtists.value.map((a) => a.name),
  });
  return mood || MOOD_PRESETS[0];
});

const moodGradientStyle = computed(() => {
  const colors = currentMood.value.gradient || ["#1a1a2e", "#16213e"];
  return {
    background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
  };
});

const trendWidth = 600;
const trendHeight = 120;

const trendPoints = computed(() => {
  const buckets = new Map();
  const now = new Date();
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: d, count: 0, label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}` });
  }
  recentPlays.value.forEach((track) => {
    const ts = track?.playedAt ? new Date(track.playedAt) : null;
    if (!ts || Number.isNaN(ts.getTime())) return;
    const key = ts.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) bucket.count += 1;
  });
  return [...buckets.values()];
});

const trendCoords = computed(() => {
  const max = Math.max(1, ...trendPoints.value.map((p) => p.count));
  const padX = 12;
  const padY = 12;
  const innerW = trendWidth - padX * 2;
  const innerH = trendHeight - padY * 2;
  const stepX = trendPoints.value.length > 1 ? innerW / (trendPoints.value.length - 1) : 0;
  return trendPoints.value.map((pt, i) => ({
    x: padX + stepX * i,
    y: padY + innerH - (pt.count / max) * innerH,
    count: pt.count,
  }));
});

const trendLinePath = computed(() => {
  if (!trendCoords.value.length) return "";
  return trendCoords.value
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(" ");
});

const trendAreaPath = computed(() => {
  if (!trendCoords.value.length) return "";
  const baseY = trendHeight - 12;
  const first = trendCoords.value[0];
  const last = trendCoords.value[trendCoords.value.length - 1];
  return [
    `M${first.x.toFixed(1)},${baseY}`,
    ...trendCoords.value.map((pt) => `L${pt.x.toFixed(1)},${pt.y.toFixed(1)}`),
    `L${last.x.toFixed(1)},${baseY}`,
    "Z",
  ].join(" ");
});

const heatmapData = computed(() => {
  const grid = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ count: 0, intensity: 0 })),
  );
  let max = 0;

  recentPlays.value.forEach((track) => {
    const ts = track?.playedAt ? new Date(track.playedAt) : null;
    if (!ts || Number.isNaN(ts.getTime())) return;
    const day = (ts.getDay() + 6) % 7;
    const hour = ts.getHours();
    grid[day][hour].count += 1;
    if (grid[day][hour].count > max) max = grid[day][hour].count;
  });

  if (max > 0) {
    for (let d = 0; d < 7; d += 1) {
      for (let h = 0; h < 24; h += 1) {
        grid[d][h].intensity = grid[d][h].count / max;
      }
    }
  }
  return grid;
});
</script>

<style scoped>
.insights-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.page-sub {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.empty {
  padding: 48px;
  text-align: center;
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 20px;
  background: var(--bg-elevated);
  border-radius: var(--radius-md);
}

.kpi-value {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.kpi-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.block {
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.block-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.link-btn {
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}

.muted {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

.artist-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.artist-row {
  display: grid;
  grid-template-columns: 140px 1fr 28px;
  align-items: center;
  gap: 12px;
}

.artist-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-bar {
  height: 6px;
  background: var(--bg-input);
  border-radius: 3px;
  overflow: hidden;
}

.artist-bar span {
  display: block;
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
}

.artist-count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
  text-align: right;
}

.energy-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
}

.energy-bar {
  flex: 1;
  min-width: 4px;
  background: linear-gradient(180deg, var(--primary), rgba(var(--primary-rgb), 0.4));
  border-radius: 3px 3px 0 0;
}

/* ── Mood card ── */
.mood-card {
  position: relative;
  overflow: hidden;
  color: #fff;
  border: none;
}

.mood-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  pointer-events: none;
}

.mood-card > * { position: relative; z-index: 1; }

.mood-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.85;
}

.mood-title {
  margin: 4px 0 6px;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.mood-desc {
  margin: 0 0 14px;
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.9;
  max-width: 540px;
}

.mood-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mood-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
}

/* ── Trend chart ── */
.trend-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trend-chart svg {
  width: 100%;
  height: 120px;
  display: block;
}

.trend-axis {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
}

.trend-axis span:nth-child(even) { /* hide every other date to avoid crowding */
  visibility: hidden;
}

@media (max-width: 600px) {
  .trend-axis span:nth-child(2n) { visibility: hidden; }
  .trend-axis span:nth-child(4n+1) { visibility: visible; }
}

/* ── Heatmap ── */
.heatmap-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: auto;
}

.heatmap-rows {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 480px;
}

.heatmap-row {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 8px;
  align-items: center;
}

.heatmap-day {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.heatmap-cells {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 2px;
}

.heatmap-cell {
  aspect-ratio: 1 / 1;
  min-height: 12px;
  min-width: 8px;
  border-radius: 3px;
  background: rgba(var(--primary-rgb), calc(0.05 + var(--intensity, 0) * 0.85));
  transition: transform 0.1s;
}

.heatmap-cell:hover {
  transform: scale(1.4);
  outline: 1px solid var(--primary);
  z-index: 1;
}

.heatmap-axis {
  display: flex;
  justify-content: space-between;
  padding-left: 40px;
  font-size: 10px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  min-width: 480px;
}
</style>
