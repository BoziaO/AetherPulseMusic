<template>
  <div class="music-page animate-fade">
    <PageSkeleton v-if="loading && !pageData" />

    <template v-else>
      <PrivacyBanner v-if="pageKey === 'home'" />

      <PageHero
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
      >
        <template #actions>
          <button
            v-if="pageKey === 'playlists'"
            class="btn-secondary"
            type="button"
            @click="showPlaylistComposer = true"
          >
            <Plus :size="14" />
            {{ t('newPlaylist') }}
          </button>
          <button
            v-if="canRefresh"
            class="icon-btn !w-9 !h-9"
            type="button"
            :title="t('refresh')"
            @click="loadPage(true)"
          >
            <RefreshCw :size="16" />
          </button>
        </template>
      </PageHero>

      <!-- Detail view: when a local playlist is selected, show its tracks instead of grid -->
      <section v-if="selectedPlaylist" class="section">
        <header class="section-head">
          <button class="link-btn" type="button" @click="closePlaylist">
            <ChevronLeft :size="14" />
            {{ t('backToPlaylists') }}
          </button>
        </header>
        <TrackList
          :tracks="selectedPlaylist.tracks"
          :now-playing="appState.nowPlaying.value"
          :favorite-keys="appState.favoriteKeys.value"
          @play="(track) => playFromList(track, selectedPlaylist.tracks)"
          @add-queue="appState.addToQueue"
          @play-next="appState.playNext"
          @toggle-favorite="appState.toggleFavoriteTrack"
        />
      </section>

      <template v-else>
        <!-- Favorites & Recent show local data as a track list -->
        <section v-if="pageKey === 'favorites'" class="section">
          <h2 class="section-title">{{ t('navFavorites') }}</h2>
          <TrackList
            :tracks="appState.favoriteItems.value"
            :now-playing="appState.nowPlaying.value"
            :favorite-keys="appState.favoriteKeys.value"
            :empty-label="t('emptyFavorites')"
            @play="(track) => playFromList(track, appState.favoriteItems.value)"
            @add-queue="appState.addToQueue"
            @play-next="appState.playNext"
            @toggle-favorite="appState.toggleFavoriteTrack"
          />
        </section>

        <section v-else-if="pageKey === 'recent'" class="section">
          <h2 class="section-title">{{ t('recentlyPlayed') }}</h2>
          <TrackList
            :tracks="appState.recentPlays.value"
            :now-playing="appState.nowPlaying.value"
            :favorite-keys="appState.favoriteKeys.value"
            :empty-label="t('emptyRecent')"
            @play="(track) => playFromList(track, appState.recentPlays.value)"
            @add-queue="appState.addToQueue"
            @play-next="appState.playNext"
            @toggle-favorite="appState.toggleFavoriteTrack"
          />
        </section>

        <!-- Standard sections -->
        <section v-if="primaryItems.length" class="section">
          <header class="section-head">
            <h2 class="section-title">{{ pageData.primarySection.title }}</h2>
          </header>
          <MediaGrid
            :items="primaryItems"
            @open="openItem"
            @play="playMediaItem"
          />
        </section>

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

        <section v-if="secondaryItems.length" class="section">
          <header class="section-head">
            <h2 class="section-title">{{ pageData.secondarySection.title }}</h2>
          </header>
          <MediaGrid
            :items="secondaryItems"
            :circle="circleSecondary"
            @open="openItem"
            @play="playMediaItem"
          />
        </section>

        <section v-if="tertiaryItems.length" class="section">
          <header class="section-head">
            <h2 class="section-title">{{ pageData.tertiarySection.title }}</h2>
          </header>
          <MediaGrid
            :items="tertiaryItems"
            @open="openItem"
            @play="playMediaItem"
          />
        </section>

        <section v-if="chartItems.length" class="section">
          <header class="section-head">
            <h2 class="section-title">{{ pageData.chartTitle || t('chartTitle') }}</h2>
          </header>
          <ol class="chart">
            <li v-for="(item, index) in chartItems" :key="`${item.title}-${index}`" class="chart-row">
              <span class="chart-pos">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="chart-text">
                <span class="chart-title">{{ item.title }}</span>
                <span class="chart-sub">{{ item.subtitle }}</span>
              </span>
              <button
                v-if="item.videoId"
                class="icon-btn"
                type="button"
                :title="t('play')"
                @click="appState.play({ ...item, videoId: item.videoId })"
              >
                <Play :size="16" fill="currentColor" />
              </button>
              <button
                v-else-if="item.browseId"
                class="icon-btn"
                type="button"
                :title="t('navArtists')"
                @click="$router.push(`/artist/${item.browseId}`)"
              >
                <ChevronRight :size="16" />
              </button>
            </li>
          </ol>
        </section>

        <section v-if="pageKey === 'home' || pageKey === 'discover'" class="section">
          <header class="section-head">
            <h2 class="section-title">{{ t('flowComposer') }}</h2>
          </header>
          <FlowComposer />
        </section>
      </template>

      <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
    </template>

    <!-- Playlist composer -->
    <div v-if="showPlaylistComposer" class="modal-overlay animate-fade" @click.self="showPlaylistComposer = false">
      <section class="modal animate-slide-up">
        <header class="modal-header">
          <h2 class="modal-title">{{ t('newPlaylist') }}</h2>
          <button class="icon-btn" type="button" :title="t('close')" @click="showPlaylistComposer = false">
            <X :size="18" />
          </button>
        </header>
        <div class="modal-body">
          <label class="form-row">
            <span class="form-label">{{ t('playlistName') }}</span>
            <input v-model="newPlaylistName" type="text" />
          </label>
          <button class="btn-primary" type="button" :disabled="!newPlaylistName.trim()" @click="createPlaylist">
            {{ t('create') }}
          </button>

          <div class="form-divider" />

          <label class="form-row">
            <span class="form-label">{{ t('youtubePlaylistId') }}</span>
            <input v-model="importPlaylistId" type="text" placeholder="VLPL..." />
          </label>
          <button class="btn-secondary" type="button" :disabled="!importPlaylistId.trim() || importing" @click="importPlaylist">
            <Download :size="14" />
            {{ importing ? t('searching') : t('importPlaylist') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Play,
  Plus,
  RefreshCw,
  X,
} from "lucide-vue-next";
import MediaGrid from "../components/MediaGrid.vue";
import PageHero from "../components/PageHero.vue";
import PageSkeleton from "../components/PageSkeleton.vue";
import PrivacyBanner from "../components/PrivacyBanner.vue";
import TrackList from "../components/TrackList.vue";
import FlowComposer from "../components/FlowComposer.vue";
import { fetchJson } from "../lib/api";
import { cleanData, normalizeTrack, trackKey } from "../lib/format";

const props = defineProps({
  pageKey: { type: String, default: "home" },
});

const appState = inject("appState");
const route = useRoute();
const router = useRouter();

function t(key, vars) {
  return appState?.t?.(key, vars) ?? key;
}

const pageData = ref(null);
const loading = ref(false);
const errorMessage = ref("");

const selectedPlaylist = ref(null);
const showPlaylistComposer = ref(false);
const newPlaylistName = ref("");
const importPlaylistId = ref("");
const importing = ref(false);

const heroTitle = computed(() => {
  if (props.pageKey === "favorites") return t("navFavorites");
  if (props.pageKey === "recent") return t("navRecent");
  if (props.pageKey === "home") return t("listenNow");
  return pageData.value?.title || "";
});

const heroSubtitle = computed(() => {
  if (props.pageKey === "favorites") return t("emptyFavorites");
  if (props.pageKey === "recent") return t("emptyRecent");
  if (props.pageKey === "home") return t("listenNowSubtitle");
  return pageData.value?.description || "";
});

const heroEyebrow = computed(() => {
  if (props.pageKey === "home") return "";
  return pageData.value?.eyebrow || "";
});

const heroCover = computed(() => {
  const items = primaryItems.value;
  return items[0]?.thumbnail || items[0]?.cover || "";
});

const heroStats = computed(() => pageData.value?.stats || []);

const primaryItems = computed(() =>
  filterItems(pageData.value?.primarySection?.items || []),
);
const secondaryItems = computed(() =>
  filterItems(pageData.value?.secondarySection?.items || []),
);
const tertiaryItems = computed(() =>
  filterItems(pageData.value?.tertiarySection?.items || []),
);
const chartItems = computed(() => pageData.value?.chartItems || []);
const queueItems = computed(() => pageData.value?.queue || []);

const circleSecondary = computed(() => props.pageKey === "artists");

const canPlayHero = computed(() => {
  if (props.pageKey === "favorites") return appState?.favoriteItems?.value?.length > 0;
  if (props.pageKey === "recent") return appState?.recentPlays?.value?.length > 0;
  return queueItems.value.length > 0;
});

const canRefresh = computed(() =>
  ["home", "discover", "chill", "energy", "playlists", "albums", "artists"].includes(props.pageKey),
);

function filterItems(items) {
  return (items || []).filter((item) => item && (item.title || item.name));
}

async function loadPage(force = false) {
  if (props.pageKey === "favorites" || props.pageKey === "recent") {
    pageData.value = makeLocalPage();
    loading.value = false;
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    const params = new URLSearchParams();
    const recentIds = (appState?.recentPlays?.value || [])
      .map((track) => track.videoId)
      .filter(Boolean)
      .slice(0, 5);
    if (recentIds.length) params.set("recent", recentIds.join(","));
    if (force) params.set("ts", Date.now().toString());
    const data = await fetchJson(`/api/page/${props.pageKey}?${params.toString()}`, { timeout: 15000 });
    pageData.value = cleanData(data);
  } catch (error) {
    errorMessage.value = error.message;
    pageData.value = makeLocalPage();
  } finally {
    loading.value = false;
  }
}

function makeLocalPage() {
  return {
    eyebrow: "",
    title: t(props.pageKey === "favorites" ? "navFavorites" : props.pageKey === "recent" ? "navRecent" : "listenNow"),
    description: "",
    stats: [],
    primarySection: { title: "", items: [] },
    secondarySection: { title: "", items: [] },
    tertiarySection: { title: "", items: [] },
    chartTitle: "",
    chartItems: [],
    queueTitle: "",
    queueAction: "",
    queue: [],
  };
}

function playFromList(track, list) {
  appState?.play(track, list);
}

function playMediaItem(item) {
  if (item?.videoId) {
    const list = primaryItems.value.filter((entry) => entry.videoId);
    appState?.play(item, list);
    return;
  }
  openItem(item);
}

function openItem(item) {
  if (!item) return;
  if (item.videoId) {
    appState?.play(item);
    return;
  }
  const id = item.browseId || item.playlistId;
  if (!id) return;
  if (typeof id === "string" && id.startsWith("local-")) {
    openLocalPlaylist(id.replace("local-", ""));
    return;
  }
  if (item.resultType === "artist" || id.startsWith?.("UC")) {
    router.push(`/artist/${id}`);
  } else if (item.resultType === "album") {
    router.push(`/album/${id}`);
  } else if (item.resultType === "playlist") {
    openYtPlaylist(id);
  } else {
    router.push(`/album/${id}`);
  }
}

async function openLocalPlaylist(id) {
  try {
    const data = await fetchJson(`/api/local/playlists/${id}`);
    selectedPlaylist.value = {
      id: data.id,
      title: data.title,
      tracks: (data.tracks || []).map(normalizeTrack),
    };
  } catch (error) {
    appState?.showToast(error.message, "error");
  }
}

async function openYtPlaylist(id) {
  try {
    const data = await fetchJson(`/api/ytmusic/playlist/${id}?limit=200`, { timeout: 15000 });
    const tracks = (data?.tracks || []).map(normalizeTrack);
    selectedPlaylist.value = {
      id,
      title: data?.title || t("playlistName"),
      tracks,
    };
  } catch (error) {
    appState?.showToast(error.message, "error");
  }
}

function closePlaylist() {
  selectedPlaylist.value = null;
}

function playHero(shuffle) {
  if (props.pageKey === "favorites") {
    const list = [...(appState?.favoriteItems?.value || [])];
    if (!list.length) return;
    const ordered = shuffle ? shuffleList(list) : list;
    appState?.play(ordered[0], ordered);
    return;
  }
  if (props.pageKey === "recent") {
    const list = [...(appState?.recentPlays?.value || [])];
    if (!list.length) return;
    const ordered = shuffle ? shuffleList(list) : list;
    appState?.play(ordered[0], ordered);
    return;
  }
  playPageQueue(shuffle);
}

function playPageQueue(shuffle) {
  const list = [...queueItems.value].filter((track) => track.videoId);
  if (!list.length) return;
  const ordered = shuffle ? shuffleList(list) : list;
  appState?.play(ordered[0], ordered);
}

function shuffleList(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function createPlaylist() {
  const name = newPlaylistName.value.trim();
  if (!name) return;
  try {
    await fetchJson("/api/local/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name }),
    });
    appState?.showToast(t("playlistCreated"), "success");
    showPlaylistComposer.value = false;
    newPlaylistName.value = "";
    if (props.pageKey === "playlists") loadPage(true);
  } catch (error) {
    appState?.showToast(error.message, "error");
  }
}

async function importPlaylist() {
  const id = importPlaylistId.value.trim();
  if (!id) return;
  importing.value = true;
  try {
    await fetchJson(`/api/local/playlists/import-yt/${encodeURIComponent(id)}`, {
      method: "POST",
      timeout: 60000,
    });
    appState?.showToast(t("playlistImported"), "success");
    showPlaylistComposer.value = false;
    importPlaylistId.value = "";
    if (props.pageKey === "playlists") loadPage(true);
  } catch (error) {
    appState?.showToast(error.message, "error");
  } finally {
    importing.value = false;
  }
}

watch(
  () => props.pageKey,
  () => {
    selectedPlaylist.value = null;
    loadPage(false);
  },
  { immediate: true },
);

watch(
  () => route.query.playlist,
  (id) => {
    if (id) {
      const decoded = String(id);
      if (decoded.startsWith("local-")) openLocalPlaylist(decoded.replace("local-", ""));
      else openYtPlaylist(decoded);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  selectedPlaylist.value = null;
});
</script>

<style scoped>
.music-page {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}

.chart {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
}

.chart-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--radius-md);
}

.chart-row:hover {
  background: var(--bg-hover);
}

.chart-pos {
  font-size: 18px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
}

.chart-text {
  min-width: 0;
}

.chart-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chart-sub {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.error-banner {
  font-size: 12px;
  color: var(--danger);
  background: rgba(255, 69, 58, 0.1);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 12px;
}

.modal {
  width: 100%;
  max-width: 460px;
  background: var(--bg-card-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-strong);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.modal-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-divider {
  height: 1px;
  background: var(--line);
  margin: 8px 0;
}
</style>
