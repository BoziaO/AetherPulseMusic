<template>
  <div class="wrapped">
    <div class="wrapped-bg" />

    <div class="wrapped-top">
      <div class="wrapped-badge">
        <Sparkles :size="12" />
        Twoje Wrapped
      </div>
      <h2 class="wrapped-title">{{ appState.t('myWrapped') }}</h2>
      <p class="wrapped-sub">Twoja muzyczna historia</p>
    </div>

    <div class="wrapped-kpis">
      <div class="kpi-card" v-for="kpi in kpis" :key="kpi.label">
        <div class="kpi-icon">{{ kpi.icon }}</div>
        <div class="kpi-value">{{ kpi.value }}</div>
        <div class="kpi-label">{{ kpi.label }}</div>
      </div>
    </div>

    <div class="wrapped-grid">
      <div class="wrapped-block artist-block">
        <div class="block-label">
          <Mic2 :size="12" />
          Top Artysta
        </div>
        <div class="artist-hero">
          <div class="artist-avatar">{{ topArtist.charAt(0) }}</div>
          <div class="artist-info">
            <div class="artist-name">{{ topArtist }}</div>
            <div class="artist-plays">{{ topArtistCount }} odtworzeń</div>
          </div>
        </div>
      </div>

      <div class="wrapped-block hour-block">
        <div class="block-label">
          <Clock :size="12" />
          Ulubiona pora
        </div>
        <div class="hour-display">{{ favoriteHourLabel }}</div>
        <div class="hour-sub">szczyt aktywności</div>
      </div>

      <div class="wrapped-block energy-block">
        <div class="block-label">
          <Zap :size="12" />
          Energia muzyki
        </div>
        <div class="energy-ring-wrap">
          <svg class="energy-ring" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/>
            <circle
              cx="40" cy="40" r="32"
              fill="none"
              stroke="url(#energy-grad)"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="`${avgEnergy * 2.01} 201`"
              stroke-dashoffset="-50"
            />
            <defs>
              <linearGradient id="energy-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#fa243c"/>
                <stop offset="100%" stop-color="#ff9f0a"/>
              </linearGradient>
            </defs>
          </svg>
          <div class="energy-val">{{ avgEnergy }}</div>
        </div>
        <div class="energy-label">/ 100</div>
      </div>
    </div>

    <div class="wrapped-block genres-block">
      <div class="block-label">
        <Music2 :size="12" />
        Gatunki muzyczne
      </div>
      <div v-if="genreList.length" class="genre-pills">
        <div
          v-for="(item, i) in genreList"
          :key="item.name"
          class="genre-pill"
          :class="`genre-rank-${i}`"
        >
          <span class="genre-rank">#{{ i + 1 }}</span>
          <span>{{ item.name }}</span>
          <span class="genre-count">{{ item.count }}</span>
        </div>
      </div>
      <p v-else class="muted">{{ appState.t('emptyData') }}</p>
    </div>

    <div class="wrapped-block evolution-block">
      <div class="block-label">
        <TrendingUp :size="12" />
        Aktywność (ostatnie 7 dni)
      </div>
      <div class="evo-chart">
        <div
          v-for="(data, idx) of evolutionData"
          :key="idx"
          class="evo-col"
        >
          <div class="evo-bar-wrap">
            <div class="evo-bar" :style="{ height: Math.max(4, data.pct) + '%' }" :title="`${data.count} plays`" />
          </div>
          <span class="evo-label">{{ data.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { Clock, Mic2, Music2, Sparkles, TrendingUp, Zap } from 'lucide-vue-next';
import { secondsFromDuration } from '../lib/format';

const appState = inject('appState');

const recentPlays = computed(() => appState?.recentPlays?.value || []);

const ENERGY_HIGH = ['remix', 'dance', 'edm', 'bass', 'phonk', 'trap', 'workout', 'party'];
const ENERGY_LOW = ['acoustic', 'sad', 'chill', 'ambient', 'sleep', 'piano', 'lofi'];

function estimateEnergy(track) {
  if (Number.isFinite(Number(track?.energy))) return Number(track.energy);
  const blob = `${track?.title || ''} ${track?.artist || track?.subtitle || ''}`.toLowerCase();
  let score = 55;
  ENERGY_HIGH.forEach((word) => { if (blob.includes(word)) score += 8; });
  ENERGY_LOW.forEach((word) => { if (blob.includes(word)) score -= 9; });
  return Math.max(15, Math.min(95, score));
}

function trackSeconds(track) {
  const sec = Number(track?.durationSeconds) || secondsFromDuration(track?.duration);
  return sec > 0 ? sec : 180;
}

const totalSeconds = computed(() =>
  recentPlays.value.reduce((sum, t) => sum + trackSeconds(t), 0),
);
const listeningHours = computed(() => Math.floor(totalSeconds.value / 3600));
const listeningMinutes = computed(() => Math.floor((totalSeconds.value % 3600) / 60));

const avgEnergy = computed(() => {
  if (!recentPlays.value.length) return 0;
  return Math.round(recentPlays.value.reduce((acc, t) => acc + estimateEnergy(t), 0) / recentPlays.value.length);
});

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

const hourStats = computed(() => {
  const counts = new Array(24).fill(0);
  recentPlays.value.forEach((track) => {
    if (track.playedAt) {
      const hour = new Date(track.playedAt).getHours();
      if (Number.isFinite(hour)) counts[hour] += 1;
    }
  });
  return counts;
});

const favoriteHour = computed(() => {
  let best = -1, bestCount = 0;
  hourStats.value.forEach((c, i) => { if (c > bestCount) { bestCount = c; best = i; } });
  return { hour: best, count: bestCount };
});
const favoriteHourLabel = computed(() => {
  const { hour } = favoriteHour.value;
  return hour >= 0 ? `${String(hour).padStart(2, '0')}:00` : '—';
});

const kpis = computed(() => [
  {
    icon: '⏱',
    value: listeningHours.value > 0 ? `${listeningHours.value}h ${listeningMinutes.value}m` : `${listeningMinutes.value}m`,
    label: 'Czas słuchania',
  },
  { icon: '🎵', value: String(recentPlays.value.length), label: 'Odtworzeń' },
  { icon: '🎤', value: String(new Set(recentPlays.value.map((t) => t.artist || '')).size), label: 'Artystów' },
]);

function extractGenres(track) {
  const text = `${track.title || ''} ${track.artist || ''} ${track.subtitle || ''}`.toLowerCase();
  const genres = [];
  if (text.includes('remix') || text.includes('edm') || text.includes('dance')) genres.push('Electronic');
  if (text.includes('hip') || text.includes('hop') || text.includes('rap')) genres.push('Hip-Hop');
  if (text.includes('rock') || text.includes('metal') || text.includes('indie')) genres.push('Rock');
  if (text.includes('jazz') || text.includes('blues')) genres.push('Jazz');
  if (text.includes('pop')) genres.push('Pop');
  if (text.includes('chill') || text.includes('ambient') || text.includes('lofi') || text.includes('acoustic')) genres.push('Ambient');
  if (!genres.length) {
    const e = estimateEnergy(track);
    genres.push(e > 70 ? 'Upbeat' : e > 45 ? 'Pop' : 'Chill');
  }
  return genres;
}

const genreList = computed(() => {
  const counts = {};
  recentPlays.value.forEach((track) => {
    extractGenres(track).forEach((g) => { counts[g] = (counts[g] || 0) + 1; });
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
});

const evolutionData = computed(() => {
  const now = Date.now();
  const dayMs = 86400000;
  const hasTs = recentPlays.value.some((t) => t.playedAt);
  const buckets = [];
  for (let i = 6; i >= 0; i--) {
    const start = now - (i + 1) * dayMs;
    const end = now - i * dayMs;
    let count = 0;
    if (hasTs) {
      count = recentPlays.value.filter((t) => {
        const pt = t.playedAt ? new Date(t.playedAt).getTime() : 0;
        return pt >= start && pt < end;
      }).length;
    } else {
      const slice = Math.max(1, Math.ceil(recentPlays.value.length / 7));
      const offset = (6 - i) * slice;
      count = Math.min(slice, Math.max(0, recentPlays.value.length - offset));
    }
    const label = new Date(now - i * dayMs).toLocaleDateString('pl-PL', { weekday: 'short' });
    buckets.push({ label, count });
  }
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return buckets.map((b) => ({ ...b, pct: (b.count / max) * 100 }));
});

function calculateStats() {}
</script>

<style scoped>
.wrapped {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid rgba(var(--primary-rgb), 0.2);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.wrapped-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    rgba(var(--primary-rgb), 0.12) 0%,
    transparent 50%,
    rgba(var(--primary-rgb), 0.06) 100%);
  pointer-events: none;
  z-index: 0;
}

.wrapped > * { position: relative; z-index: 1; }

.wrapped-top {
  padding: 24px 24px 20px;
}

.wrapped-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 8px;
}

.wrapped-title {
  margin: 0 0 4px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--text-primary), var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.wrapped-sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.wrapped-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--line);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.kpi-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 16px 12px;
  background: var(--bg-elevated);
  text-align: center;
}

.kpi-icon { font-size: 20px; line-height: 1; margin-bottom: 4px; }

.kpi-value {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.kpi-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}

.wrapped-grid {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1px;
  background: var(--line);
  border-bottom: 1px solid var(--line);
}

@media (max-width: 560px) {
  .wrapped-grid { grid-template-columns: 1fr 1fr; }
  .hour-block { grid-column: 1; }
  .energy-block { grid-column: 2; }
}

.wrapped-block {
  background: var(--bg-elevated);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.block-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.artist-hero {
  display: flex;
  align-items: center;
  gap: 10px;
}

.artist-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb), 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.artist-name {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.artist-plays {
  font-size: 11px;
  color: var(--text-secondary);
}

.hour-block, .energy-block {
  align-items: center;
  min-width: 100px;
}

.hour-display {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--primary);
  line-height: 1;
}

.hour-sub {
  font-size: 10px;
  color: var(--text-tertiary);
}

.energy-ring-wrap {
  position: relative;
  width: 64px;
  height: 64px;
}

.energy-ring {
  width: 64px;
  height: 64px;
  transform: rotate(-90deg);
}

.energy-val {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 900;
  color: var(--text-primary);
}

.energy-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.genres-block {
  border-bottom: 1px solid var(--line);
}

.genre-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.genre-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-base);
  border: 1px solid var(--line);
  color: var(--text-primary);
  transition: all 0.15s;
}

.genre-rank-0 { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.08); }
.genre-rank-1 { border-color: rgba(var(--primary-rgb), 0.5); }

.genre-rank {
  font-size: 10px;
  font-weight: 800;
  color: var(--primary);
}

.genre-count {
  font-size: 10px;
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  padding: 1px 5px;
  border-radius: 4px;
}

.evolution-block {
  border-top: 1px solid var(--line);
}

.evo-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 80px;
}

.evo-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}

.evo-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.evo-bar {
  width: 100%;
  background: linear-gradient(180deg, var(--primary), rgba(var(--primary-rgb), 0.3));
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.evo-label {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  white-space: nowrap;
}

.muted {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}
</style>
