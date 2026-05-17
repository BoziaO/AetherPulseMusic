<template>
  <div class="for-you-page animate-fade">
    <header class="page-head">
      <p class="page-eyebrow">{{ contextLabel }}</p>
      <h1 class="page-title">{{ t('forYouTitle') }}</h1>
      <p class="page-sub">{{ t('forYouSubtitle') }}</p>
    </header>

    <!-- Smart Radio hero -->
    <section class="smart-radio-card">
      <div class="sr-bg" />
      <div class="sr-content">
        <div class="sr-text">
          <p class="sr-eyebrow">
            <Sparkles :size="14" />
            {{ t('smartRadio') }}
          </p>
          <h2 class="sr-title">{{ smartRadioHeading }}</h2>
          <p class="sr-sub">{{ t('smartRadioDesc') }}</p>
        </div>
        <button
          class="btn-primary sr-btn"
          type="button"
          :disabled="!radioReady || smartRadioLoading"
          @click="startSmartRadio"
        >
          <Radio :size="16" />
          {{ smartRadioLoading ? t('generating') : t('startSmartRadio') }}
        </button>
      </div>
    </section>

    <!-- Empty state -->
    <div v-if="!hasAnyData && !poolLoading" class="empty-block">
      <Music2 :size="36" />
      <p>{{ t('forYouEmpty') }}</p>
    </div>

    <!-- Daily Mixes -->
    <section v-if="dailyMixes.length" class="section">
      <header class="section-head">
        <h2 class="section-title">{{ t('dailyMixes') }}</h2>
        <span class="section-sub">{{ t('dailyMixesDesc') }}</span>
      </header>
      <div class="mix-grid">
        <article
          v-for="mix in dailyMixes"
          :key="mix.id"
          class="mix-card"
          @click="playMix(mix)"
          @keydown.enter.prevent="playMix(mix)"
          tabindex="0"
          role="button"
        >
          <div class="mix-cover">
            <div class="mix-cover-stack">
              <img
                v-for="(track, idx) in mix.tracks.slice(0, 4)"
                :key="track.videoId || idx"
                :src="track.thumbnail || track.cover || track.art"
                :alt="track.title"
                loading="lazy"
                @error="$event.target.style.display='none'"
              />
            </div>
            <span class="play-fab"><Play :size="18" fill="currentColor" /></span>
          </div>
          <div class="mix-meta">
            <p class="mix-title">{{ mix.title }}</p>
            <p class="mix-sub">{{ t('trackCount', { count: mix.tracks.length }) }}</p>
          </div>
        </article>
      </div>
    </section>

    <!-- Contextual / Time-of-day -->
    <section v-if="contextual.tracks.length" class="section">
      <header class="section-head">
        <h2 class="section-title">{{ t('moodForTime') }} · {{ t(contextual.bucket.labelKey) }}</h2>
      </header>
      <TrackList
        :tracks="contextual.tracks"
        :now-playing="appState.nowPlaying.value"
        :favorite-keys="appState.favoriteKeys.value"
        @play="(track) => appState.play(track, contextual.tracks)"
        @add-queue="appState.addToQueue"
        @play-next="appState.playNext"
        @toggle-favorite="appState.toggleFavoriteTrack"
      />
    </section>

    <!-- Personalized -->
    <section v-if="personalized.length" class="section">
      <header class="section-head">
        <h2 class="section-title">{{ t('contextualSuggestions') }}</h2>
        <span class="section-sub">{{ t('basedOnHistory', { count: historyCount }) }}</span>
      </header>
      <TrackList
        :tracks="personalized"
        :now-playing="appState.nowPlaying.value"
        :favorite-keys="appState.favoriteKeys.value"
        @play="(track) => appState.play(track, personalized)"
        @add-queue="appState.addToQueue"
        @play-next="appState.playNext"
        @toggle-favorite="appState.toggleFavoriteTrack"
      />
    </section>

    <!-- Retro hits -->
    <section v-if="retro.length" class="section">
      <header class="section-head">
        <h2 class="section-title">{{ t('backToOldHits') }}</h2>
      </header>
      <TrackList
        :tracks="retro"
        :now-playing="appState.nowPlaying.value"
        :favorite-keys="appState.favoriteKeys.value"
        @play="(track) => appState.play(track, retro)"
        @add-queue="appState.addToQueue"
        @play-next="appState.playNext"
        @toggle-favorite="appState.toggleFavoriteTrack"
      />
    </section>

    <!-- Library sync -->
    <section v-if="appState.authSession.value.auth?.connected" class="section">
      <header class="section-head">
        <h2 class="section-title">{{ t('basedOnLibrary') }}</h2>
        <button
          class="link-btn"
          type="button"
          :disabled="poolLoading"
          @click="loadPool(true)"
        >
          <RefreshCw :size="13" />
          {{ poolLoading ? t('syncingLibrary') : t('syncLibrary') }}
        </button>
      </header>
      <TrackList
        :tracks="cloudHybrid"
        :now-playing="appState.nowPlaying.value"
        :favorite-keys="appState.favoriteKeys.value"
        :empty-label="poolLoading ? t('syncingLibrary') : t('forYouEmpty')"
        @play="(track) => appState.play(track, cloudHybrid)"
        @add-queue="appState.addToQueue"
        @play-next="appState.playNext"
        @toggle-favorite="appState.toggleFavoriteTrack"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Music2, Play, Radio, RefreshCw, Sparkles } from "lucide-vue-next";
import TrackList from "../components/TrackList.vue";
import { fetchJson } from "../lib/api";
import { normalizeTrack as normalize } from "../lib/format";
import {
  buildContextual,
  buildDailyMixes,
  buildProfile,
  buildRetroHits,
  getCurrentTimeBucket,
  pickSmartRadioSeed,
  scoreTracks,
} from "../lib/recommendations";

const appState = inject("appState");

function t(key, vars) {
  return appState?.t?.(key, vars) ?? key;
}

const pool = ref([]);
const poolLoading = ref(false);
const smartRadioLoading = ref(false);
const now = ref(new Date());

// Re-evaluate context bucket every 15 minutes for time-aware suggestions.
let bucketTimer = null;

const history = computed(() => appState.recentPlays?.value || []);
const favorites = computed(() => appState.favoriteItems?.value || []);

const profile = computed(() => buildProfile({
  history: history.value,
  favorites: favorites.value,
}));

const historyCount = computed(() => Math.min(history.value.length, 50));

const hasAnyData = computed(
  () => history.value.length > 0 || favorites.value.length > 0,
);

const contextLabel = computed(() => {
  const bucket = getCurrentTimeBucket(now.value);
  return t(bucket.labelKey);
});

const dailyMixes = computed(() =>
  buildDailyMixes({
    history: history.value,
    favorites: favorites.value,
    pool: pool.value,
  }).filter((mix) => mix.tracks.length > 0),
);

const contextual = computed(() =>
  buildContextual({
    history: history.value,
    favorites: favorites.value,
    pool: pool.value,
    now: now.value,
  }),
);

const personalized = computed(() => {
  if (!pool.value.length) return [];
  return scoreTracks(pool.value, profile.value, {
    excludePlayed: true,
    noveltyBonus: 0.4,
  }).slice(0, 18);
});

const retro = computed(() =>
  buildRetroHits({ history: history.value, minPlays: 1 }),
);

const cloudHybrid = computed(() => {
  if (!appState.authSession.value.auth?.connected) return [];
  return scoreTracks(pool.value, profile.value, {
    excludePlayed: false,
    noveltyBonus: 0.2,
  }).slice(0, 18);
});

const radioReady = computed(() =>
  Boolean(pickSmartRadioSeed({
    history: history.value,
    favorites: favorites.value,
  })),
);

const smartRadioHeading = computed(() => {
  const seed = pickSmartRadioSeed({
    history: history.value,
    favorites: favorites.value,
  });
  if (seed?.title) {
    return `${seed.title}${seed.artist ? ` · ${seed.artist}` : ""}`;
  }
  return t("smartRadioDesc");
});

async function loadPool(force = false) {
  if (poolLoading.value) return;
  if (!force && pool.value.length) return;
  poolLoading.value = true;
  try {
    const seedId = history.value
      .map((track) => track.videoId)
      .filter(Boolean)[0] || null;
    const params = new URLSearchParams();
    if (seedId) params.set("seeds", seedId);
    const data = await fetchJson(`/api/recommendations/pool?${params.toString()}`, {
      timeout: 15000,
    });
    pool.value = Array.isArray(data?.pool) ? data.pool.map(normalize) : [];
  } catch (error) {
    appState?.showToast?.(error.message, "error");
  } finally {
    poolLoading.value = false;
  }
}

async function startSmartRadio() {
  const seed = pickSmartRadioSeed({
    history: history.value,
    favorites: favorites.value,
  });
  if (!seed?.videoId) return;
  smartRadioLoading.value = true;
  try {
    const data = await fetchJson(`/api/recommendations/smart-radio/${seed.videoId}`, {
      timeout: 15000,
    });
    const tracks = Array.isArray(data?.items) ? data.items.map(normalize) : [];
    if (tracks.length) {
      appState?.play?.(tracks[0], tracks);
      appState?.showToast?.(t("smartRadioStarted"), "success");
    } else {
      appState?.showToast?.(t("forYouEmpty"), "info");
    }
  } catch (error) {
    appState?.showToast?.(error.message, "error");
  } finally {
    smartRadioLoading.value = false;
  }
}

function playMix(mix) {
  if (!mix?.tracks?.length) return;
  const playable = mix.tracks.filter((track) => track.videoId);
  if (!playable.length) return;
  appState?.play?.(playable[0], playable);
}

watch(
  () => appState.authSession.value.auth?.connected,
  (connected) => {
    if (connected) loadPool(true);
  },
);

onMounted(() => {
  loadPool(false);
  bucketTimer = window.setInterval(() => {
    now.value = new Date();
  }, 15 * 60 * 1000);
});

onBeforeUnmount(() => {
  if (bucketTimer) window.clearInterval(bucketTimer);
});
</script>

<style scoped>
.for-you-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--primary);
}

.page-title {
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.page-sub {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Smart Radio Hero */
.smart-radio-card {
  position: relative;
  padding: 28px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-card-strong);
  border: 1px solid var(--line);
  isolation: isolate;
}

.sr-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at 0% 0%, rgba(var(--primary-rgb), 0.35) 0%, transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(var(--primary-rgb), 0.18) 0%, transparent 50%);
  opacity: 0.65;
  filter: blur(40px);
}

.sr-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.sr-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary);
}

.sr-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.sr-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.sr-btn {
  flex-shrink: 0;
  height: 44px;
  padding: 0 22px;
  font-size: 14px;
}

/* Daily Mixes */
.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.section-sub {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.link-btn:disabled {
  opacity: 0.5;
}

.mix-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}

.mix-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px;
  margin: -8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  background: transparent;
  text-align: left;
}

.mix-card:hover,
.mix-card:focus-visible {
  background: var(--bg-hover);
  outline: none;
}

.mix-cover {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-card);
}

.mix-cover-stack {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  width: 100%;
  height: 100%;
}

.mix-cover-stack img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mix-cover .play-fab {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  box-shadow: 0 8px 20px rgba(var(--primary-rgb), 0.45);
}

.mix-card:hover .play-fab,
.mix-card:focus-visible .play-fab {
  opacity: 1;
  transform: translateY(0);
}

.mix-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mix-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.mix-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-block {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-tertiary);
  border: 1px dashed var(--line);
  border-radius: var(--radius-md);
}

.empty-block p {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
