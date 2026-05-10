<template>
  <div class="my-wrapped">
    <div class="wrapped-header">
      <h2 class="wrapped-title">{{ appState.t('myWrapped') }}</h2>
      <button
        class="wrapped-refresh"
        type="button"
        :title="appState.t('refresh')"
        @click="calculateStats"
      >
        🔄
      </button>
    </div>

    <!-- Stats grid -->
    <div class="stats-grid">
      <!-- Total listening time -->
      <div class="stat-card">
        <div class="stat-label">{{ appState.t('listeningTime') }}</div>
        <div class="stat-value">{{ listeningHours }}h {{ listeningMinutes }}m</div>
        <div class="stat-detail">{{ recentPlays.length }} {{ appState.t('tracks') }}</div>
      </div>

      <!-- Average energy -->
      <div class="stat-card">
        <div class="stat-label">{{ appState.t('avgEnergy') }}</div>
        <div class="stat-value">{{ avgEnergy }}/100</div>
        <div class="stat-bar">
          <div class="bar-fill" :style="{ width: avgEnergy + '%' }" />
        </div>
      </div>

      <!-- Top artists -->
      <div class="stat-card">
        <div class="stat-label">{{ appState.t('topArtists') }}</div>
        <div class="stat-value stat-value-sm" :title="topArtist">{{ topArtist }}</div>
        <div class="stat-detail">{{ topArtistCount }} plays</div>
      </div>

      <!-- Favorite hour -->
      <div class="stat-card">
        <div class="stat-label">{{ appState.t('topHours') }}</div>
        <div class="stat-value">{{ favoriteHourLabel }}</div>
        <div class="stat-detail">{{ favoriteHourCount }} plays</div>
      </div>
    </div>

    <!-- Week's genres -->
    <div class="genres-section">
      <h3 class="section-title">{{ appState.t('topGenres') }}</h3>
      <div v-if="genreList.length" class="genres-list">
        <div v-for="item in genreList" :key="item.name" class="genre-item">
          <span class="genre-name">{{ formatGenre(item.name) }}</span>
          <span class="genre-count">{{ item.count }}</span>
        </div>
      </div>
      <p v-else class="muted">{{ appState.t('emptyData') }}</p>
    </div>

    <!-- Taste evolution chart -->
    <div class="evolution-section">
      <h3 class="section-title">{{ appState.t('evolvingTaste') }}</h3>
      <div class="evolution-chart">
        <div
          v-for="(data, idx) of evolutionData"
          :key="idx"
          class="evolution-bar"
          :style="{ height: data.pct + '%' }"
          :title="`${data.label}: ${data.count} plays`"
        >
          <span class="bar-label">{{ data.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { secondsFromDuration } from '../lib/format';

const appState = inject('appState');

// FIX: appState.recentPlays is a ref, need .value to unwrap array
const recentPlays = computed(() => appState?.recentPlays?.value || []);

const ENERGY_HIGH = ['remix', 'dance', 'edm', 'bass', 'phonk', 'trap', 'workout', 'party'];
const ENERGY_LOW = ['acoustic', 'sad', 'chill', 'ambient', 'sleep', 'piano', 'lofi'];

function estimateEnergy(track) {
  if (Number.isFinite(Number(track?.energy))) return Number(track.energy);
  const blob = `${track?.title || ''} ${track?.artist || track?.subtitle || ''}`.toLowerCase();
  let score = 55;
  ENERGY_HIGH.forEach((word) => {
    if (blob.includes(word)) score += 8;
  });
  ENERGY_LOW.forEach((word) => {
    if (blob.includes(word)) score -= 9;
  });
  return Math.max(15, Math.min(95, score));
}

function trackSeconds(track) {
  const sec = Number(track?.durationSeconds) || secondsFromDuration(track?.duration);
  return sec > 0 ? sec : 180; // fallback 3 min when duration unknown
}

// Total listening time — based on real durations
const totalSeconds = computed(() =>
  recentPlays.value.reduce((sum, t) => sum + trackSeconds(t), 0),
);
const listeningHours = computed(() => Math.floor(totalSeconds.value / 3600));
const listeningMinutes = computed(() => Math.floor((totalSeconds.value % 3600) / 60));

// Average energy
const avgEnergy = computed(() => {
  if (!recentPlays.value.length) return 0;
  const sum = recentPlays.value.reduce((acc, t) => acc + estimateEnergy(t), 0);
  return Math.round(sum / recentPlays.value.length);
});

// Top artist
const artistStats = computed(() => {
  const map = new Map();
  recentPlays.value.forEach((track) => {
    const name = track.artist || track.subtitle || '—';
    map.set(name, (map.get(name) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
});
const topArtist = computed(() => artistStats.value[0]?.[0] || '—');
const topArtistCount = computed(() => artistStats.value[0]?.[1] || 0);

// Favorite hour — fallback to position-based estimate when playedAt missing
const hourStats = computed(() => {
  const counts = new Array(24).fill(0);
  let hasRealData = false;
  recentPlays.value.forEach((track) => {
    if (track.playedAt) {
      hasRealData = true;
      const hour = new Date(track.playedAt).getHours();
      if (Number.isFinite(hour)) counts[hour] += 1;
    }
  });
  return { counts, hasRealData };
});
const favoriteHour = computed(() => {
  const { counts } = hourStats.value;
  let best = -1;
  let bestCount = 0;
  counts.forEach((c, i) => {
    if (c > bestCount) {
      bestCount = c;
      best = i;
    }
  });
  return { hour: best, count: bestCount };
});
const favoriteHourLabel = computed(() => {
  const { hour } = favoriteHour.value;
  return hour >= 0 ? `${String(hour).padStart(2, '0')}:00` : '—';
});
const favoriteHourCount = computed(() => favoriteHour.value.count);

// Genres
function extractGenres(track) {
  const text = `${track.title || ''} ${track.artist || ''} ${track.subtitle || ''}`.toLowerCase();
  const genres = [];
  if (text.includes('remix') || text.includes('edm') || text.includes('dance')) genres.push('Electronic');
  if (text.includes('hip') || text.includes('hop') || text.includes('rap')) genres.push('Hip-Hop');
  if (text.includes('rock') || text.includes('metal') || text.includes('punk') || text.includes('indie')) genres.push('Rock');
  if (text.includes('jazz') || text.includes('blues')) genres.push('Jazz');
  if (text.includes('pop')) genres.push('Pop');
  if (text.includes('chill') || text.includes('ambient') || text.includes('lofi') || text.includes('acoustic')) genres.push('Ambient');

  if (genres.length === 0) {
    const energy = estimateEnergy(track);
    if (energy > 75) genres.push('Upbeat');
    else if (energy > 50) genres.push('Pop');
    else genres.push('Chill');
  }
  return genres;
}

const genreList = computed(() => {
  const counts = {};
  recentPlays.value.forEach((track) => {
    extractGenres(track).forEach((g) => {
      counts[g] = (counts[g] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
});

// Evolution chart — last 7 days. Falls back to slotting plays across days
// evenly when playedAt isn't recorded (so the chart isn't completely empty).
const evolutionData = computed(() => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const buckets = [];
  const hasTimestamps = recentPlays.value.some((t) => t.playedAt);

  for (let i = 6; i >= 0; i--) {
    const startTime = now - (i + 1) * dayMs;
    const endTime = now - i * dayMs;
    let count = 0;
    if (hasTimestamps) {
      count = recentPlays.value.filter((t) => {
        const playTime = t.playedAt ? new Date(t.playedAt).getTime() : 0;
        return playTime >= startTime && playTime < endTime;
      }).length;
    } else {
      // Synthetic distribution: spread recent plays across recent days
      const slice = Math.max(1, Math.ceil(recentPlays.value.length / 7));
      const offset = (6 - i) * slice;
      count = Math.min(slice, Math.max(0, recentPlays.value.length - offset));
    }
    const label = new Date(now - i * dayMs).toLocaleDateString(
      appState?.language?.value === 'pl' ? 'pl-PL' : 'en-US',
      { weekday: 'short' },
    );
    buckets.push({ label, count });
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  return buckets.map((b) => ({ ...b, pct: (b.count / maxCount) * 100 }));
});

function formatGenre(genre) {
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

// Manual refresh is a no-op now (everything is reactive) but kept for the
// spinner affordance — touching the computed dependency forces recompute.
function calculateStats() {
  // Intentionally empty — all metrics are computed from recentPlays reactively.
}
</script>

<style scoped>
.my-wrapped {
  padding: 20px;
  background: linear-gradient(135deg, rgba(250, 36, 60, 0.05), rgba(250, 36, 60, 0.02));
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
}

.wrapped-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.wrapped-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), #ff6b9d);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.wrapped-refresh {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  width: 36px;
  height: 36px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.wrapped-refresh:hover {
  background: var(--bg-hover);
  transform: rotate(180deg);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 14px;
  text-align: center;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 6px;
  line-height: 1.2;
}

.stat-value-sm {
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.muted {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

.stat-detail {
  font-size: 11px;
  color: var(--text-secondary);
}

.stat-bar {
  background: var(--bg-base);
  border-radius: var(--radius-sm);
  height: 4px;
  margin-top: 8px;
  overflow: hidden;
}

.bar-fill {
  background: linear-gradient(90deg, var(--primary), #ff6b9d);
  height: 100%;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.genres-section,
.evolution-section {
  margin-bottom: 24px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
}

.genres-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.genre-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  font-size: 13px;
}

.genre-name {
  font-weight: 500;
  color: var(--text-primary);
}

.genre-count {
  background: var(--primary);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.evolution-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8px;
  height: 120px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 12px;
}

.evolution-bar {
  flex: 1;
  background: linear-gradient(180deg, var(--primary), rgba(var(--primary-rgb), 0.5));
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  min-height: 4px;
  position: relative;
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s;
  cursor: pointer;
  animation: grow-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.evolution-bar:hover {
  opacity: 0.82;
}

@keyframes grow-up {
  from {
    transform: scaleY(0);
    transform-origin: bottom;
  }
  to {
    transform: scaleY(1);
    transform-origin: bottom;
  }
}

.bar-label {
  position: absolute;
  bottom: -20px;
  left: 0;
  right: 0;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .my-wrapped {
    padding: 16px;
  }

  .wrapped-title {
    font-size: 18px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .evolution-bar {
    min-height: 2px;
  }
}
</style>

