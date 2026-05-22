<template>
  <div class="app-shell" :style="themeStyles">
    <Sidebar :open="sidebarOpen" :current-path="route.path" @close="sidebarOpen = false" />

    <main class="main" :class="{ 'has-player': nowPlaying, 'has-right-sidebar': showRightSidebar }">
      <header class="topbar" :class="{ 'topbar-scrolled': topbarScrolled }">
        <div class="topbar-inner">
          <div class="topbar-left lg:hidden">
            <button class="icon-btn" type="button" @click="sidebarOpen = true">
              <Menu :size="20" />
            </button>
          </div>

          <div class="topbar-center">
            <div class="nav-arrows hidden md:flex mr-4">
              <button class="arrow-btn" @click="router.back()"><ChevronLeft :size="20" /></button>
              <button class="arrow-btn" @click="router.forward()"><ChevronRight :size="20" /></button>
            </div>
            
            <div ref="searchRef" class="search-wrap" :class="{ 'search-focused': searchOpen }">
              <Search :size="18" class="search-icon" />
              <input
                ref="searchInputRef"
                v-model="query"
                class="search-input"
                type="text"
                :placeholder="t('searchPlaceholder')"
                @focus="searchOpen = true"
                @keydown.enter.prevent="saveSearch(query)"
              />
            </div>
          </div>

          <div class="topbar-right">
            <RouterLink to="/settings" class="icon-btn-alt" :title="t('navSettings')"><Settings :size="18" /></RouterLink>
            <button class="icon-btn-alt" :title="t('notifications')"><Bell :size="18" /></button>
            <div class="user-avatar ml-2">
              <img src="https://ui-avatars.com/api/?name=User&background=random" alt="User" />
            </div>
          </div>
        </div>
      </header>

      <div class="page-container">
        <div class="page">
          <Transition name="search-pop-anim">
            <div v-if="searchOpen && (query || searchHistory.length)" class="search-pop">
              <div v-if="!query.trim() && searchHistory.length" class="search-section">
                <div class="search-section-head">
                  <span>{{ t('recentSearches') }}</span>
                  <button class="link-btn" type="button" @click="searchHistory = []">{{ t('clear') }}</button>
                </div>
                <div class="search-history-list">
                  <button v-for="entry in searchHistory" :key="entry" class="history-row" @click="query = entry">
                    <Clock :size="14" class="mr-3 opacity-50" />
                    <span class="truncate">{{ entry }}</span>
                  </button>
                </div>
              </div>

              <template v-else-if="query.trim().length >= 2">
                <div class="search-filters">
                  <button
                    v-for="filter in searchFilters"
                    :key="filter.value"
                    class="filter-pill"
                    :class="searchFilter === filter.value ? 'filter-pill-active' : ''"
                    @click="searchFilter = filter.value"
                  >
                    {{ t(filter.labelKey) }}
                  </button>
                </div>

                <div v-if="searchLoading" class="search-loading">
                  <span class="search-spinner" />
                </div>

                <div v-else-if="searchResults.length" class="result-list">
                  <button
                    v-for="(item, index) in searchResults"
                    :key="item.videoId || item.browseId || `${item.title}-${index}`"
                    class="result-row"
                    @click="handleSearchResultClick(item)"
                  >
                    <img :src="item.thumbnail || item.cover" class="result-img" :class="{ 'round': item.resultType === 'artist' }" />
                    <div class="result-info">
                      <div class="result-name truncate">{{ item.title }}</div>
                      <div class="result-sub truncate">{{ item.artist || item.subtitle }}</div>
                    </div>
                  </button>
                </div>
              </template>
            </div>
          </Transition>

          <router-view v-slot="{ Component }">
            <transition name="page-fade" mode="out-in">
              <component :is="Component" :key="route.fullPath" />
            </transition>
          </router-view>
        </div>
      </div>
    </main>

    <!-- Right Sidebar: Now Playing -->
    <aside v-if="showRightSidebar" class="right-sidebar hidden xl:flex flex-col">
      <div class="right-sidebar-header">
        <h3 class="text-sm font-bold uppercase tracking-widest opacity-60">{{ t('nowPlaying') }}</h3>
        <button class="icon-btn-sm ml-auto"><MoreHorizontal :size="18" /></button>
      </div>

      <div v-if="nowPlaying" class="now-playing-content px-8 py-6">
        <div class="now-playing-art mb-8">
          <img :src="nowPlaying.thumbnail || nowPlaying.cover" alt="" class="w-full aspect-square object-cover rounded-2xl shadow-2xl transition-transform hover:scale-[1.02] duration-500" />
        </div>
        <div class="flex items-center justify-between mb-10">
          <div class="min-w-0 pr-4">
            <h2 class="text-2xl font-bold truncate tracking-tight">{{ nowPlaying.title }}</h2>
            <p class="text-base opacity-50 truncate font-medium mt-1">{{ nowPlaying.artist }}</p>
          </div>
          <button class="favorite-btn p-2 hover:bg-white/5 rounded-full transition-colors" @click="toggleFavoriteTrack(nowPlaying)">
            <Heart :size="22" :fill="isFavorite(nowPlaying) ? 'currentColor' : 'none'" :class="{ 'text-primary': isFavorite(nowPlaying) }" />
          </button>
        </div>

        <div class="mini-queue mt-auto">
          <div class="flex items-center justify-between mb-6">
            <span class="text-xs font-bold uppercase tracking-[0.2em] opacity-30">{{ t('queue') }}</span>
            <button class="text-xs font-bold text-primary hover:underline" @click="showQueueModal = true">{{ t('playAll') }}</button>
          </div>
          <div class="space-y-5">
            <div v-for="(track, idx) in visibleQueue.slice(0, 4)" :key="track.videoId || idx" class="mini-queue-item flex items-center gap-4 group cursor-pointer" @click="playback.play(track)">
              <div class="relative w-11 h-11 flex-shrink-0">
                <img :src="track.thumbnail" class="w-full h-full rounded-lg object-cover group-hover:brightness-50 transition-all" />
                <Play :size="14" class="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-bold truncate group-hover:text-primary transition-colors">{{ track.title }}</div>
                <div class="text-xs opacity-40 truncate font-medium mt-0.5">{{ track.artist }}</div>
              </div>
              <button class="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"><MoreHorizontal :size="16" /></button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-20">
        <Music2 :size="64" class="mb-6" />
        <p class="text-sm font-bold uppercase tracking-widest">{{ t('queueEmpty') }}</p>
      </div>
    </aside>

    <div id="yt-hidden-player" aria-hidden="true" />

    <PlayerBar
      v-if="nowPlaying"
      :track="nowPlaying"
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="audioDuration"
      :volume="volume"
      :shuffle="isShuffled"
      :repeat-mode="repeatMode"
      :favorite="isFavorite(nowPlaying)"
      :minimized="playerMinimized"
      @toggle-play="togglePlay"
      @seek="seekTo"
      @volume="setVolume"
      @prev="prevTrack"
      @next="nextTrack"
      @shuffle="toggleShuffle"
      @repeat="toggleRepeat"
      @toggle-favorite="toggleFavoriteTrack(nowPlaying)"
      @queue="showQueueModal = true"
      @lyrics="showLyricsModal = true"
      @expand="showFullPlayer = true"
      @minimize="playerMinimized = !playerMinimized"
    />

    <Transition name="full-player">
      <FullPlayer
        v-if="nowPlaying && showFullPlayer"
        :track="nowPlaying"
        :is-playing="isPlaying"
        :current-time="currentTime"
        :duration="audioDuration"
        :volume="volume"
        :shuffle="isShuffled"
        :repeat-mode="repeatMode"
        :favorite="isFavorite(nowPlaying)"
        @close="showFullPlayer = false"
        @toggle-play="togglePlay"
        @seek="seekTo"
        @volume="setVolume"
        @prev="prevTrack"
        @next="nextTrack"
        @shuffle="toggleShuffle"
        @repeat="toggleRepeat"
        @toggle-favorite="toggleFavoriteTrack(nowPlaying)"
        @queue="showQueueModal = true"
        @lyrics="showLyricsModal = true"
      />
    </Transition>

    <QueueModal
      :open="showQueueModal"
      :tracks="visibleQueue"
      :current-index="playback.currentQueueIndex"
      :is-favorite="isFavorite"
      @close="showQueueModal = false"
      @play-index="playQueueIndex"
      @remove="removeFromQueue"
      @save="saveQueue"
      @clear="clearQueue"
      @shuffle="toggleShuffle"
      @favorite="toggleFavoriteTrack"
    />

    <LyricsModal
      :open="showLyricsModal"
      :track="nowPlaying"
      :current-time="currentTime"
      @close="showLyricsModal = false"
      @seek="seekTo"
    />

    <CookieBanner />
    <ToastStack :toasts="toasts" @dismiss="dismissToast" />
    <OfflineBanner @retry="retryNetworkAction" />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Heart, 
  Menu, 
  MoreHorizontal, 
  Music2, 
  Play,
  Search, 
  Settings, 
  X 
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { usePlaybackStore } from "../stores/playback";

// Components
import Sidebar from "./Sidebar.vue";
import PlayerBar from "./PlayerBar.vue";
import ToastStack from "./ToastStack.vue";
import CookieBanner from "./CookieBanner.vue";
import OfflineBanner from "./OfflineBanner.vue";

// Lazy-loaded modals
const FullPlayer = defineAsyncComponent(() => import("./FullPlayer.vue"));
const LyricsModal = defineAsyncComponent(() => import("./LyricsModal.vue"));
const QueueModal = defineAsyncComponent(() => import("./QueueModal.vue"));

import { translate } from "../data/i18n";
import { buildApiUrl, fetchJson } from "../lib/api";
import { normalizeTrack, trackKey } from "../lib/format";
import { useTheme } from "../lib/useTheme";

const route = useRoute();
const router = useRouter();
const playback = usePlaybackStore();

const {
  nowPlaying,
  isPlaying,
  currentTime,
  audioDuration,
  volume,
  queue,
  isShuffled,
  repeatMode,
  visibleQueue,
  playerMinimized,
} = storeToRefs(playback);

const sidebarOpen = ref(false);
const showRightSidebar = computed(() => !!nowPlaying.value);
const topbarScrolled = ref(false);
const searchOpen = ref(false);
const query = ref("");
const searchLoading = ref(false);
const searchResults = ref([]);
const searchFilter = ref("songs");
const searchHistory = ref(JSON.parse(localStorage.getItem("ap:search-history") || "[]"));
const toasts = ref([]);

const themeStore = useTheme();
const themeStyles = computed(() => ({
  '--primary': themeStore.accent,
  '--primary-rgb': hexToRgb(themeStore.accent),
}));

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '59, 130, 246';
}

const searchFilters = [
  { value: "songs", labelKey: "filterSongs" },
  { value: "playlists", labelKey: "filterPlaylists" },
  { value: "albums", labelKey: "filterAlbums" },
  { value: "artists", labelKey: "filterArtists" },
];

function t(key, vars) { return translate(localStorage.getItem("ap:language") || "pl", key, vars); }

function showToast(message, type = "info") {
  const toast = { id: Math.random().toString(), message, type };
  toasts.value.push(toast);
  setTimeout(() => dismissToast(toast.id), 4000);
}

function dismissToast(id) { toasts.value = toasts.value.filter(t => t.id !== id); }

function togglePlay() { playback.togglePlay(); }
function seekTo(seconds) { playback.seekTo(seconds); }
function setVolume(v) { playback.setVolume(v); }
function nextTrack() { playback.nextTrack(); }
function prevTrack() { playback.prevTrack(); }
function toggleShuffle() { playback.toggleShuffle(); }
function toggleRepeat() { playback.toggleRepeat(); }

const favorites = ref(new Set(JSON.parse(localStorage.getItem("boziamusic:favorites") || "[]")));
const isFavorite = (track) => track && favorites.value.has(trackKey(track));

function toggleFavoriteTrack(track) {
  if (!track) return;
  const key = trackKey(track);
  if (favorites.value.has(key)) {
    favorites.value.delete(key);
    showToast(t("removedFromFavorites"), "info");
  } else {
    favorites.value.add(key);
    showToast(t("addedToFavorites"), "success");
  }
  localStorage.setItem("boziamusic:favorites", JSON.stringify(Array.from(favorites.value)));
}

// Search Logic
watch(query, async (newQuery) => {
  const q = newQuery.trim();
  if (q.length < 2) {
    searchResults.value = [];
    return;
  }
  searchLoading.value = true;
  try {
    const data = await fetchJson(`/api/ytmusic/search?q=${encodeURIComponent(q)}&filter=${searchFilter.value}`);
    searchResults.value = data;
  } finally {
    searchLoading.value = false;
  }
});

function handleSearchResultClick(item) {
  searchOpen.value = false;
  playback.play(item, searchResults.value.filter(i => i.videoId));
}

function saveSearch(q) {
  if (!q.trim()) return;
  const history = [q.trim(), ...searchHistory.value.filter(h => h !== q.trim())].slice(0, 10);
  searchHistory.value = history;
  localStorage.setItem("ap:search-history", JSON.stringify(history));
}

const showQueueModal = ref(false);
const showLyricsModal = ref(false);
const showFullPlayer = ref(false);

function playQueueIndex(index) {
  const list = visibleQueue.value;
  if (index >= 0 && index < list.length) playback.play(list[index]);
}

function removeFromQueue(index) {
  const next = [...queue.value];
  next.splice(index, 1);
  queue.value = next;
}

function clearQueue() {
  playback.clearQueue();
  showToast(t("queueCleared"), "info");
}

function saveQueue(title) {
  if (!title?.trim()) return;
  fetchJson("/api/user/queues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title.trim(), tracks: [...queue.value] }),
  }).then(() => {
    showToast(t("saved"), "success");
    showQueueModal.value = false;
  }).catch(() => showToast(t("saveFailed"), "error"));
}

async function retryNetworkAction() {
  try {
    await fetchJson("/api/page/home", { timeout: 6000 });
    showToast(t("offlineRetrySuccess"), "success");
  } catch {
    showToast(t("offlineRetryFailed"), "warning");
  }
}

provide("appState", {
  t, showToast, 
  toggleFavoriteTrack,
  openImportModal: () => { /* Implement modal open logic */ }
});

onMounted(() => {
  window.addEventListener("scroll", () => topbarScrolled.value = window.scrollY > 10);
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #08080a;
  color: #fff;
  display: flex;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 260px;
  transition: margin-right 0.3s;
}

.has-right-sidebar {
  margin-right: 320px;
}

@media (max-width: 1280px) {
  .has-right-sidebar { margin-right: 0; }
}

@media (max-width: 1024px) {
  .main { margin-left: 0; }
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 16px 32px;
  background: rgba(8, 8, 10, 0.8);
  backdrop-filter: blur(20px);
}

.topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.topbar-center {
  flex: 1;
  max-width: 600px;
  display: flex;
  align-items: center;
}

.search-wrap {
  flex: 1;
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: background 0.2s;
}

.search-wrap:hover, .search-focused {
  background: rgba(255, 255, 255, 0.08);
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.4;
}

.search-input {
  width: 100%;
  height: 44px;
  padding: 0 16px 0 44px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 14px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn-alt {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s;
}

.icon-btn-alt:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.page-container {
  flex: 1;
}

.page {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.right-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 320px;
  background: #0d0d12;
  border-left: 1px solid rgba(255, 255, 255, 0.03);
}

.right-sidebar-header {
  padding: 24px 32px;
  display: flex;
  align-items: center;
}

.now-playing-art img {
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.7);
}

.arrow-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.arrow-btn:hover { opacity: 1; }

.search-pop {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 600px;
  background: #1a1a20;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8);
  z-index: 1000;
  padding: 16px;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  text-align: left;
}

.result-row:hover { background: rgba(255, 255, 255, 0.05); }

.result-img {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
}

.result-img.round { border-radius: 50%; }

.result-name { font-size: 14px; font-weight: 700; }
.result-sub { font-size: 12px; opacity: 0.4; }

.filter-pill {
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
}

.filter-pill-active {
  background: var(--primary);
  color: #fff;
}
</style>
