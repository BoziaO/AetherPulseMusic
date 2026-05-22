<template>
  <div class="music-page animate-fade">
    <PageSkeleton v-if="loading && !pageData" />

    <template v-else>
      <div v-if="pageKey === 'home' || pageKey === 'discover'" class="explore-header">
        <h1 class="text-3xl font-bold mb-8">Explore AetherPulse</h1>
        <ExploreTiles />
      </div>

      <PageHero
        v-else
        :title="heroTitle"
        :subtitle="heroSubtitle"
        :eyebrow="heroEyebrow"
        :cover="heroCover"
        :stats="heroStats"
        :playable="canPlayHero"
        :shuffleable="canPlayHero"
        :play-label="t('playAll')"
        :shuffle-label="t('shuffle')"
        @play="playHero(false)"
        @shuffle="playHero(true)"
      />

      <!-- Featured Playlists -->
      <section v-if="primaryItems.length" class="section">
        <header class="section-head">
          <h2 class="section-title">{{ pageData.primarySection.title || t('featuredPlaylists') }}</h2>
        </header>
        <MediaGrid
          :items="primaryItems"
          :current-video-id="appState.nowPlaying.value?.videoId"
          :is-playing="appState.isPlaying.value"
          @open="openItem"
          @play="playMediaItem"
        />
      </section>

      <!-- Top Artists -->
      <section v-if="secondaryItems.length" class="section">
        <header class="section-head">
          <h2 class="section-title">{{ pageData.secondarySection.title || t('topArtists') }}</h2>
        </header>
        <MediaGrid
          :items="secondaryItems"
          :circle="true"
          :current-video-id="appState.nowPlaying.value?.videoId"
          :is-playing="appState.isPlaying.value"
          @open="openItem"
          @play="playMediaItem"
        />
      </section>

      <!-- Track List / Queue -->
      <section v-if="queueItems.length" class="section">
        <header class="section-head">
          <h2 class="section-title">{{ pageData.queueTitle || t('topCharts') }}</h2>
          <button class="link-btn" type="button" @click="playPageQueue(false)">
            <Play :size="14" fill="currentColor" />
            {{ pageData.queueAction || t('playAll') }}
          </button>
        </header>
        <TrackList
          :tracks="queueItems"
          :now-playing="appState.nowPlaying.value"
          :favorite-keys="appState.favoriteKeys.value"
          @play="(track) => playFromList(track, queueItems)"
          @add-queue="appState.addToQueue"
          @play-next="appState.playNext"
          @toggle-favorite="appState.toggleFavoriteTrack"
        />
      </section>

      <!-- Favorites / Recent (Local) -->
      <section v-if="pageKey === 'favorites' && appState.favoriteItems.value.length" class="section">
        <TrackList
          :tracks="appState.favoriteItems.value"
          :now-playing="appState.nowPlaying.value"
          :favorite-keys="appState.favoriteKeys.value"
          @play="(track) => playFromList(track, appState.favoriteItems.value)"
          @toggle-favorite="appState.toggleFavoriteTrack"
        />
      </section>

      <section v-if="pageKey === 'recent' && appState.recentPlays.value.length" class="section">
        <TrackList
          :tracks="appState.recentPlays.value"
          :now-playing="appState.nowPlaying.value"
          :favorite-keys="appState.favoriteKeys.value"
          @play="(track) => playFromList(track, appState.recentPlays.value)"
          @toggle-favorite="appState.toggleFavoriteTrack"
        />
      </section>

      <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
    </template>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Play } from "lucide-vue-next";
import MediaGrid from "../components/MediaGrid.vue";
import PageHero from "../components/PageHero.vue";
import PageSkeleton from "../components/PageSkeleton.vue";
import TrackList from "../components/TrackList.vue";
import ExploreTiles from "../components/ExploreTiles.vue";
import { fetchJson } from "../lib/api";
import { cleanData, normalizeTrack } from "../lib/format";

const props = defineProps({
  pageKey: { type: String, default: "home" },
});

const appState = inject("appState");
const route = useRoute();
const router = useRouter();

function t(key, vars) { return appState?.t?.(key, vars) ?? key; }

const pageData = ref(null);
const loading = ref(false);
const errorMessage = ref("");

const heroTitle = computed(() => {
  if (props.pageKey === "favorites") return t("navFavorites");
  if (props.pageKey === "recent") return t("navRecent");
  return pageData.value?.title || "";
});

const heroSubtitle = computed(() => pageData.value?.description || "");
const heroEyebrow = computed(() => pageData.value?.eyebrow || "");
const heroCover = computed(() => primaryItems.value[0]?.thumbnail || "");
const heroStats = computed(() => pageData.value?.stats || []);

const primaryItems = computed(() => pageData.value?.primarySection?.items || []);
const secondaryItems = computed(() => pageData.value?.secondarySection?.items || []);
const queueItems = computed(() => pageData.value?.queue || []);

const canPlayHero = computed(() => queueItems.value.length > 0 || (props.pageKey === 'favorites' && appState.favoriteItems.value.length > 0));

async function loadPage(force = false) {
  if (props.pageKey === "favorites" || props.pageKey === "recent") {
    pageData.value = { primarySection: { items: [] }, secondarySection: { items: [] }, queue: [] };
    return;
  }
  loading.value = true;
  try {
    const data = await fetchJson(`/api/page/${props.pageKey}`);
    pageData.value = cleanData(data);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

function playFromList(track, list) { appState?.play(track, list); }
function playMediaItem(item) { if (item.videoId) appState?.play(item); else openItem(item); }

function openItem(item) {
  const id = item.browseId || item.playlistId;
  if (!id) return;
  if (item.resultType === "artist") router.push(`/artist/${id}`);
  else if (item.resultType === "album") router.push(`/album/${id}`);
  else router.push({ path: "/playlists", query: { playlist: id } });
}

function playHero(shuffle) {
  const list = props.pageKey === 'favorites' ? appState.favoriteItems.value : queueItems.value;
  if (!list.length) return;
  appState?.play(list[0], list);
}

function playPageQueue(shuffle) {
  if (!queueItems.value.length) return;
  appState?.play(queueItems.value[0], queueItems.value);
}

watch(() => props.pageKey, () => loadPage(), { immediate: true });
</script>

<style scoped>
.music-page { display: flex; flex-direction: column; gap: 48px; }
.section { display: flex; flex-direction: column; gap: 24px; }
.section-title { font-size: 24px; font-weight: 800; }
.section-head { display: flex; align-items: center; justify-content: space-between; }
.link-btn { color: var(--primary); font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.explore-header h1 { letter-spacing: -0.02em; }
</style>
