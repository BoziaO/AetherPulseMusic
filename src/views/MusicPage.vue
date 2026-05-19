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
            @click="openCreateModal"
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
          <div class="flex items-center gap-4">
            <button class="link-btn" type="button" @click="closePlaylist">
              <ChevronLeft :size="14" />
              {{ t('backToPlaylists') }}
            </button>
            <span v-if="isSavingOrder" class="text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">
              {{ t('saving') }}
            </span>
          </div>
          <button
            class="icon-btn !w-9 !h-9"
            type="button"
            :title="t('editPlaylist')"
            @click="startEditPlaylist"
          >
            <Pencil :size="16" />
          </button>
        </header>
        <div v-if="selectedPlaylist.description" class="px-1 mb-4 text-sm text-secondary italic opacity-80">
          {{ selectedPlaylist.description }}
        </div>
        <draggable
          v-model="selectedPlaylist.tracks"
          item-key="videoId"
          handle=".drag-handle"
          ghost-class="drag-ghost"
          @end="saveNewOrder"
        >
          <template #item="{ element, index }">
            <div class="flex items-center group">
              <div class="drag-handle p-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical :size="16" class="text-tertiary" />
              </div>
              <div class="flex-1">
                <TrackList
                  :tracks="[element]"
                  :now-playing="appState.nowPlaying.value"
                  :favorite-keys="appState.favoriteKeys.value"
                  @play="(track) => playFromList(track, selectedPlaylist.tracks)"
                  @add-queue="appState.addToQueue"
                  @play-next="appState.playNext"
                  @toggle-favorite="appState.toggleFavoriteTrack"
                />
              </div>
            </div>
          </template>
        </draggable>
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
            :current-video-id="appState.nowPlaying.value?.videoId"
            :is-playing="appState.isPlaying.value"
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
            :current-video-id="appState.nowPlaying.value?.videoId"
            :is-playing="appState.isPlaying.value"
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
            :current-video-id="appState.nowPlaying.value?.videoId"
            :is-playing="appState.isPlaying.value"
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
    <div v-if="showPlaylistComposer" class="modal-overlay animate-fade" @click.self="showPlaylistComposer = false" @keydown.esc.window="showPlaylistComposer = false">
      <section class="modal animate-slide-up">
        <header class="modal-header">
          <h2 class="modal-title">{{ editingPlaylistId ? t('editPlaylist') : t('newPlaylist') }}</h2>
          <button class="icon-btn" type="button" :title="t('close')" @click="showPlaylistComposer = false">
            <X :size="18" />
          </button>
        </header>
        <div class="modal-body">
          <div class="composer-section">
            <h3 class="section-subtitle">{{ editingPlaylistId ? t('editPlaylist') : t('create') }}</h3>
            <label class="form-row">
              <span class="form-label">{{ t('playlistName') }}</span>
              <input v-model="newPlaylistName" type="text" :placeholder="t('playlistName')" />
            </label>
          <div class="form-row">
            <span class="form-label">{{ t('playlistCover') }}</span>
            <div class="flex gap-3 items-center">
              <div class="w-16 h-16 rounded-md bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                <img v-if="newPlaylistCover" :src="newPlaylistCover" class="w-full h-full object-cover" />
                <Music v-else :size="24" class="opacity-20" />
              </div>
              <div class="flex-1 flex flex-col gap-2">
                <input
                  v-model="newPlaylistCover"
                  type="text"
                  class="text-xs p-2 bg-black/20 rounded border border-white/5 outline-none focus:border-primary/50"
                  :placeholder="t('coverUrl')"
                />
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileUpload"
                />
                <div class="flex gap-2">
                  <button class="btn-secondary !py-1 !px-3 !text-[11px] w-fit" type="button" @click="triggerFileUpload">
                    <Download :size="12" />
                    {{ t('uploadCover') }}
                  </button>
                  <button
                    v-if="editingPlaylistId && !newPlaylistCover && selectedPlaylist?.tracks?.length"
                    class="btn-secondary !py-1 !px-3 !text-[11px] w-fit"
                    type="button"
                    :disabled="generatingCover"
                    @click="generateCover"
                  >
                    <Plus :size="12" />
                    {{ t('generateCover') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
            <label class="form-row">
              <span class="form-label">{{ t('playlistDescription') }}</span>
              <textarea v-model="editDescription" :placeholder="t('playlistDescription')" class="form-input min-h-[80px] p-2 bg-black/20 rounded border border-white/5 outline-none focus:border-primary/50 text-sm" />
            </label>
            <button class="btn-primary" type="button" :disabled="!newPlaylistName.trim()" @click="savePlaylist">
              <component :is="editingPlaylistId ? Save : Plus" :size="16" />
              {{ editingPlaylistId ? t('save') : t('create') }}
            </button>
          </div>

          <template v-if="!editingPlaylistId">
            <div class="composer-divider">
              <span>{{ t('or') || 'Lub' }}</span>
            </div>

            <div class="composer-section">
            <h3 class="section-subtitle">{{ t('importYouTube') }}</h3>
            <label class="form-row">
              <span class="form-label">{{ t('youtubePlaylistOrAlbumUrl') }}</span>
              <input v-model="importPlaylistId" type="text" :placeholder="t('importPlaceholder')" />
            </label>
            <button class="btn-secondary" type="button" :disabled="!importPlaylistId.trim() || importing" @click="importPlaylist">
              <Download :size="16" />
              {{ importing ? t('searching') : t('importPlaylist') }}
            </button>
          </div>
          </template>
        </div>
      </section>
    </div>
  </div>

  <!-- Modal Przycinania Zdjęcia -->
  <div v-if="cropImageSrc" class="modal-overlay z-[300]" @click.self="cancelCrop">
    <div class="modal max-w-lg">
      <header class="modal-header">
        <h2 class="modal-title">Przytnij okładkę</h2>
      </header>
      <div class="modal-body">
        <div class="aspect-square bg-black overflow-hidden rounded-md">
          <img ref="cropImgRef" :src="cropImageSrc" class="max-w-full block" />
        </div>
        <div class="flex justify-center gap-4 mt-4">
          <button class="icon-btn" @click="rotate(-90)" :title="t('rotateLeft')"><RotateCcw :size="18" /></button>
          <button class="icon-btn" @click="rotate(90)" :title="t('rotateRight')"><RotateCw :size="18" /></button>
          <button class="icon-btn" @click="flipX" :title="t('flipHorizontal')">
            <FlipHorizontal :size="18" />
          </button>
          <button class="icon-btn" @click="flipY" :title="t('flipVertical')">
            <FlipVertical :size="18" />
          </button>
        </div>
        <div class="mt-4 flex flex-col gap-3">
          <label class="form-row">
            <span class="form-label">{{ t('brightness') }}</span>
            <input type="range" v-model="imageBrightness" min="50" max="200" step="5" class="w-full" />
          </label>
          <label class="form-row">
            <span class="form-label">{{ t('contrast') }}</span>
            <input type="range" v-model="imageContrast" min="50" max="200" step="5" class="w-full" />
          </label>
        </div>
        <div class="flex gap-3 mt-4">
          <button class="btn-primary flex-1" @click="applyCrop">Zastosuj</button>
          <button class="btn-secondary" @click="cancelCrop">Anuluj</button>
        </div>
        <div class="flex gap-3 mt-4">
          <button class="btn-primary flex-1" @click="applyCrop">Zastosuj</button>
          <button class="btn-secondary" @click="cancelCrop">Anuluj</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import draggable from "vuedraggable";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Download,
  FlipHorizontal,
  FlipVertical,
  Music,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
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
const editDescription = ref("");
const newPlaylistCover = ref("");
const editingPlaylistId = ref(null);
const importPlaylistId = ref("");
const generatingCover = ref(false);
const importing = ref(false);
const fileInput = ref(null);

const heroTitle = computed(() => {
  if (props.pageKey === "favorites") return t("navFavorites");
  if (props.pageKey === "recent") return t("navRecent");
  if (props.pageKey === "home") return t("listenNow");
  return pageData.value?.title || "";
});

const heroSubtitle = computed(() => {
  if (props.pageKey === "home") return t("listenNowSubtitle");
  if (props.pageKey === "favorites") return "";
  if (props.pageKey === "recent") return "";
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

const heroStats = computed(() => {
  if (props.pageKey === "favorites") {
    const count = appState?.favoriteItems?.value?.length || 0;
    return [
      { label: t("tracks"), value: String(count) },
      { label: t("favoritesStat"), value: count > 0 ? "♥" : "—" },
    ];
  }
  if (props.pageKey === "recent") {
    const list = appState?.recentPlays?.value || [];
    const artists = new Set(list.map((t) => t.artist || t.author).filter(Boolean));
    return [
      { label: t("tracks"), value: String(list.length) },
      { label: t("navArtists"), value: String(artists.size) },
    ];
  }
  return pageData.value?.stats || [];
});

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
    const region = appState?.chartsRegion?.value;
    if (region && region !== "ZZ") params.set("region", region);
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
  if (item.resultType === "artist" || (typeof id === "string" && id.startsWith("UC"))) {
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
      description: data.description || "",
      tracks: (data.tracks || []).map(normalizeTrack),
    };
  } catch (error) {
    appState?.showToast(error.message, "error");
  }
}

function saveNewOrder() {
  if (!selectedPlaylist.value) return;
  isSavingOrder.value = true;

  if (reorderTimer) clearTimeout(reorderTimer);

  reorderTimer = setTimeout(async () => {
    if (!selectedPlaylist.value) {
      isSavingOrder.value = false;
      return;
    }
    const videoIds = selectedPlaylist.value.tracks.map((t) => t.videoId);
    try {
      await fetchJson(`/api/local/playlists/${selectedPlaylist.value.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds }),
      });
    } catch (error) {
      appState?.showToast(error.message, "error");
    } finally {
      isSavingOrder.value = false;
    }
  }, 1500);
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
    await fetchJson(`/api/import/playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: id }),
      timeout: 30000,
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
    // Don't reset selectedPlaylist if we're navigating with a playlist query param
    if (!route.query.playlist) {
      selectedPlaylist.value = null;
    }
    loadPage(false);
  },
  { immediate: true },
);

watch(
  () => route.query.playlist,
  (id) => {
    if (id) {
      const decoded = String(id);
      if (decoded.startsWith("local-")) {
        openLocalPlaylist(decoded.replace("local-", ""));
      } else {
        openYtPlaylist(decoded);
      }
    } else {
      selectedPlaylist.value = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  selectedPlaylist.value = null;
  if (reorderTimer) clearTimeout(reorderTimer);
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

.composer-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
}

.section-subtitle {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}

.composer-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 4px 0;
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.composer-divider::before, .composer-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--line);
}

.composer-divider span {
  padding: 0 12px;
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
