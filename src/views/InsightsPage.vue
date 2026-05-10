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
import TrackList from "../components/TrackList.vue";
import MyWrapped from "../components/MyWrapped.vue";
import { secondsFromDuration } from "../lib/format";

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
  const sum = recentPlays.value.reduce((a, t) => a + estimateEnergy(t), 0);
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
</style>
