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
        <div class="stat-value">{{ totalMinutes }}h {{ totalHours }}m</div>
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
        <div class="stat-value">{{ topArtist }}</div>
        <div class="stat-detail">{{ topArtistCount }} plays</div>
      </div>

      <!-- Favorite hour -->
      <div class="stat-card">
        <div class="stat-label">{{ appState.t('topHours') }}</div>
        <div class="stat-value">{{ favoriteHour }}:00</div>
        <div class="stat-detail">{{ favoriteHourCount }} plays</div>
      </div>
    </div>

    <!-- Week's genres -->
    <div class="genres-section">
      <h3 class="section-title">{{ appState.t('topGenres') }}</h3>
      <div class="genres-list">
        <div v-for="(count, genre) of topGenres.slice(0, 5)" :key="genre" class="genre-item">
          <span class="genre-name">{{ formatGenre(genre) }}</span>
          <span class="genre-count">{{ count }}</span>
        </div>
      </div>
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
import { computed, inject, ref, onMounted } from 'vue';

const appState = inject('appState');

const recentPlays = computed(() => appState.recentPlays || []);

// Stats
const totalMinutes = ref(0);
const totalHours = ref(0);
const avgEnergy = ref(0);
const topArtist = ref('—');
const topArtistCount = ref(0);
const favoriteHour = ref(0);
const favoriteHourCount = ref(0);
const topGenres = ref({});
const evolutionData = ref([]);

function calculateStats() {
  if (recentPlays.value.length === 0) {
    return;
  }

  // Total listening time (assume 3min per track)
  const totalSecs = recentPlays.value.length * 180;
  totalMinutes.value = Math.floor(totalSecs / 60 / 60);
  totalHours.value = Math.floor((totalSecs / 60) % 60);

  // Average energy
  const energies = recentPlays.value
    .map((t) => t.energy || 50)
    .filter((e) => Number.isFinite(e));
  avgEnergy.value = energies.length > 0
    ? Math.round(energies.reduce((a, b) => a + b, 0) / energies.length)
    : 0;

  // Top artists
  const artistCounts = {};
  recentPlays.value.forEach((track) => {
    const artist = track.artist || track.subtitle || 'Unknown';
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
  });

  const topArtistEntry = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0];
  if (topArtistEntry) {
    topArtist.value = topArtistEntry[0];
    topArtistCount.value = topArtistEntry[1];
  }

  // Favorite hour (based on play dates)
  const hourCounts = {};
  recentPlays.value.forEach((track) => {
    if (track.playedAt) {
      const hour = new Date(track.playedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  const topHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  if (topHourEntry) {
    favoriteHour.value = parseInt(topHourEntry[0]);
    favoriteHourCount.value = topHourEntry[1];
  }

  // Top genres (extracted from track metadata)
  const genreCounts = {};
  recentPlays.value.forEach((track) => {
    // Extract genres from artist/album name or use energy as proxy
    const genres = extractGenres(track);
    genres.forEach((g) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });

  topGenres.value = genreCounts;

  // Evolution: last 5 days
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const evolution = [];

  for (let i = 4; i >= 0; i--) {
    const startTime = now - (i + 1) * dayMs;
    const endTime = now - i * dayMs;

    const count = recentPlays.value.filter((t) => {
      const playTime = t.playedAt ? new Date(t.playedAt).getTime() : 0;
      return playTime >= startTime && playTime < endTime;
    }).length;

    const dayName = new Date(now - i * dayMs).toLocaleDateString('en-US', { weekday: 'short' });
    evolution.push({ label: dayName, count });
  }

  const maxCount = Math.max(...evolution.map((e) => e.count), 1);
  evolutionData.value = evolution.map((e) => ({
    ...e,
    pct: (e.count / maxCount) * 100,
  }));
}

function extractGenres(track) {
  const text = `${track.title || ''} ${track.artist || ''} ${track.subtitle || ''}`.toLowerCase();
  const genres = [];

  // Genre keywords
  if (text.includes('remix') || text.includes('edm') || text.includes('dance')) {
    genres.push('Electronic');
  }
  if (text.includes('hip') || text.includes('hop') || text.includes('rap')) {
    genres.push('Hip-Hop');
  }
  if (
    text.includes('rock') ||
    text.includes('metal') ||
    text.includes('punk') ||
    text.includes('indie')
  ) {
    genres.push('Rock');
  }
  if (text.includes('jazz') || text.includes('blues')) {
    genres.push('Jazz');
  }
  if (text.includes('pop')) {
    genres.push('Pop');
  }
  if (
    text.includes('chill') ||
    text.includes('ambient') ||
    text.includes('lofi') ||
    text.includes('acoustic')
  ) {
    genres.push('Ambient');
  }

  // If no genres detected, use energy as proxy
  if (genres.length === 0) {
    const energy = track.energy || 50;
    if (energy > 75) genres.push('Upbeat');
    else if (energy > 50) genres.push('Pop');
    else genres.push('Chill');
  }

  return genres.length > 0 ? genres : ['Other'];
}

function formatGenre(genre) {
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

onMounted(() => {
  calculateStats();
});
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
  background: linear-gradient(135deg, var(--accent-color), #ff6b9d);
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
  color: var(--accent-color);
  margin-bottom: 6px;
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
  background: linear-gradient(90deg, var(--accent-color), #ff6b9d);
  height: 100%;
  transition: width 0.3s ease;
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
  background: var(--accent-color);
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
  background: linear-gradient(180deg, var(--accent-color), rgba(250, 36, 60, 0.5));
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  min-height: 4px;
  position: relative;
  transition: all 0.2s;
  cursor: pointer;
}

.evolution-bar:hover {
  opacity: 0.8;
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

