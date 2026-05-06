<template>
  <div class="app-shell flex min-h-screen">
    <Sidebar :open="sidebarOpen" :current-path="route.path" @close="sidebarOpen = false" />

    <main
      class="relative z-10 min-w-0 flex-1 px-4 pb-28 pt-4 transition-[padding] sm:px-6 lg:ml-[268px] lg:px-8 lg:pt-6"
      :class="nowPlaying && playerVisible ? 'lg:pb-36' : 'lg:pb-10'"
    >
      <header class="sticky top-0 z-[180] mb-8 flex items-center justify-between px-2 py-4 backdrop-blur-md lg:px-0">
        <div class="flex flex-1 items-center gap-4">
          <button class="icon-button lg:hidden" type="button" @click="sidebarOpen = true">
            <Menu :size="20" />
          </button>

          <div ref="searchRef" class="relative w-full max-w-[480px]">
            <Search :size="18" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
            <input
              ref="searchInputRef"
              v-model="query"
              class="h-10 w-full rounded-xl bg-[var(--bg-input)] pl-10 pr-10 text-[14px] font-medium transition-all focus:bg-[var(--bg-card)] focus:ring-2 focus:ring-[var(--primary)]/20"
              style="border: none; color: var(--text-main)"
              :placeholder="currentPage.searchPlaceholder"
              @focus="searchOpen = true"
              @keydown.enter.prevent="saveSearch(query)"
            />
            <button v-if="query" class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[var(--text-soft)] hover:text-[var(--text-main)]" type="button" @click="query = ''">
              <X :size="16" />
            </button>

          <div v-if="searchOpen && (query || searchHistory.length)" class="surface absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-lg">
            <div class="flex gap-2 overflow-x-auto border-b p-2 scrollbar-hide" style="border-color: var(--surface-line)">
              <button
                v-for="filter in searchFilters"
                :key="filter.value"
                class="rounded-lg px-3 py-1.5 text-xs font-black"
                type="button"
                :style="searchFilter === filter.value ? activePillStyle : passivePillStyle"
                @click="searchFilter = filter.value"
              >
                {{ filter.label }}
              </button>
            </div>

            <div class="max-h-[62vh] overflow-y-auto p-2">
              <div v-if="!query.trim() && searchHistory.length">
                <div class="mb-1 flex items-center justify-between px-2">
                  <p class="text-[11px] font-black uppercase" style="color: var(--text-soft)">{{ t('recentSearches') }}</p>
                  <button class="text-xs font-black" type="button" style="color: var(--primary)" @click="searchHistory = []">{{ t('clear') }}</button>
                </div>
                <button
                  v-for="entry in searchHistory"
                  :key="entry"
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold"
                  type="button"
                  @click="query = entry"
                >
                  <Search :size="15" style="color: var(--text-soft)" />
                  <span class="truncate">{{ entry }}</span>
                </button>
              </div>

              <div v-else-if="query.trim().length > 0 && query.trim().length < 2" class="p-8 text-center text-sm font-bold" style="color: var(--text-muted)">
                Wpisz co najmniej 2 znaki
              </div>

              <div v-else-if="searchLoading" class="p-8 text-center text-sm font-bold" style="color: var(--text-muted)">
                {{ t('searching') }}
              </div>

              <div v-else-if="searchResults.length" class="space-y-1">
                <button
                  v-for="(item, index) in searchResults"
                  :key="item.videoId || item.browseId || `${item.title}-${index}`"
                  class="track-row grid w-full grid-cols-[42px_1fr_auto] items-center gap-3 p-2 text-left"
                  type="button"
                  @click="handleSearchResultClick(item)"
                >
                  <span class="h-10 w-10 overflow-hidden rounded-lg" style="background: var(--bg-card)">
                    <img v-if="item.thumbnail || item.cover || item.art" :src="item.thumbnail || item.cover || item.art" alt="" class="h-full w-full object-cover" />
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-black">{{ item.title }}</span>
                    <span class="block truncate text-xs font-semibold" style="color: var(--text-muted)">
                      {{ item.artist || item.author || item.subtitle || artistsText(item) || "YouTube Music" }}
                    </span>
                  </span>
                  <span class="rounded-md px-2 py-1 text-[10px] font-black uppercase" style="background: var(--bg-card); color: var(--text-soft)">
                    {{ item.resultType || searchFilter }}
                  </span>
                </button>
              </div>

              <div v-else class="p-8 text-center text-sm font-bold" style="color: var(--text-muted)">
                {{ t('noResults') }}
              </div>
            </div>
          </div>
        </div>
      </div>

        <div class="flex items-center gap-2">
          <div class="relative">
            <button class="icon-button" type="button" :title="t('notifications')" @click="notificationsOpen = !notificationsOpen">
              <Bell :size="18" />
            </button>
            <div v-if="notificationsOpen" class="surface absolute right-0 mt-2 w-72 rounded-lg p-2">
              <div class="mb-1 flex items-center justify-between px-2 py-1">
                <p class="text-xs font-black">{{ t('notifications') }}</p>
                <button class="text-xs font-black" type="button" style="color: var(--primary)" @click="notifications = []">{{ t('clear') }}</button>
              </div>
              <div v-if="notifications.length" class="max-h-72 space-y-1 overflow-y-auto">
                <div v-for="note in notifications" :key="note.id" class="rounded-lg border p-3" style="border-color: var(--surface-line); background: var(--bg-card)">
                  <p class="text-sm font-bold">{{ note.message }}</p>
                  <p class="mt-1 text-[11px] font-semibold" style="color: var(--text-soft)">{{ new Date(note.createdAt).toLocaleTimeString() }}</p>
                </div>
              </div>
              <div v-else class="p-6 text-center text-sm font-bold" style="color: var(--text-muted)">{{ t('noNotifications') }}</div>
            </div>
          </div>

          <RouterLink class="icon-button hidden sm:inline-flex" to="/settings" :title="t('settings')">
            <Settings :size="18" />
          </RouterLink>

          <button v-if="authSession.auth?.connected" class="ghost-button hidden px-3 sm:inline-flex" type="button" @click="logout">
            {{ t('logout') }}
          </button>
          <a v-else class="primary-button hidden px-3 sm:inline-flex" :href="loginUrl">
            <LogIn :size="16" />
            {{ t('signIn') }}
          </a>
        </div>
      </header>

      <RouterView />
    </main>

    <div id="yt-hidden-player" class="hidden" />

    <PlayerBar
      v-if="nowPlaying && playerVisible"
      :track="nowPlaying"
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="audioDuration"
      :volume="volume"
      :shuffle="isShuffled"
      :repeat-mode="repeatMode"
      :favorite="favoriteKeys.has(trackKey(nowPlaying))"
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
      @hide="playerVisible = false"
    />

    <button
      v-else-if="nowPlaying"
      class="surface fixed bottom-4 left-4 right-4 z-[200] grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-lg p-2 lg:left-auto lg:w-[420px]"
      type="button"
      @click="playerVisible = true"
    >
      <span class="h-10 w-10 overflow-hidden rounded-lg" style="background: var(--bg-card)">
        <img v-if="nowPlaying.art || nowPlaying.thumbnail" :src="nowPlaying.art || nowPlaying.thumbnail" alt="" class="h-full w-full object-cover" />
      </span>
      <span class="min-w-0 text-left">
        <span class="block truncate text-sm font-black">{{ nowPlaying.title }}</span>
        <span class="block truncate text-xs font-semibold" style="color: var(--text-muted)">{{ nowPlaying.artist }}</span>
      </span>
      <Play v-if="!isPlaying" :size="18" fill="currentColor" />
      <Pause v-else :size="18" fill="currentColor" />
    </button>

    <QueueModal
      :open="showQueueModal"
      :tracks="visibleQueue"
      :current-index="currentQueueIndex"
      @close="showQueueModal = false"
      @play-index="playQueueIndex"
      @remove="removeFromQueue"
      @save="saveQueue"
    />

    <LyricsModal
      :open="showLyricsModal"
      :track="nowPlaying"
      :current-time="currentTime"
      @close="showLyricsModal = false"
      @seek="seekTo"
    />

    <ToastStack :toasts="toasts" @dismiss="dismissToast" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { Bell, LogIn, Menu, Pause, Play, Search, Settings, X } from "lucide-vue-next";
import LyricsModal from "./LyricsModal.vue";
import PlayerBar from "./PlayerBar.vue";
import QueueModal from "./QueueModal.vue";
import Sidebar from "./Sidebar.vue";
import ToastStack from "./ToastStack.vue";
import { getPageByPath } from "../data/navigation";
import { translate } from "../data/i18n";
import { buildApiUrl, fetchJson } from "../lib/api";
import { clamp, normalizeTrack, secondsFromDuration, trackKey } from "../lib/format";

const route = useRoute();
const router = useRouter();

const searchFilters = [
  { value: "songs", label: "Piosenki" },
  { value: "playlists", label: "Playlisty" },
  { value: "albums", label: "Albumy" },
  { value: "artists", label: "Wykonawcy" },
];

const activePillStyle = "background: var(--primary); color: #fff";
const passivePillStyle = "background: var(--bg-card); color: var(--text-muted)";
const USER_STATE_SAVE_DELAY_MS = 600;

const sidebarOpen = ref(false);
const searchRef = ref(null);
const searchInputRef = ref(null);
const query = ref("");
const searchFilter = ref("songs");
const searchResults = ref([]);
const searchLoading = ref(false);
const searchOpen = ref(false);
const searchHistory = ref(readJson("ap:search-history", []));
const notificationsOpen = ref(false);
const notifications = ref([]);
const toasts = ref([]);

const authSession = ref({ auth: { enabled: false, connected: false } });
const language = ref(localStorage.getItem("ap:language") || "pl");
const theme = ref(localStorage.getItem("ap:theme") || "dark");
const accent = ref(localStorage.getItem("ap:accent") || "#f2573d");

const nowPlaying = ref(null);
const playerVisible = ref(false);
const isPlaying = ref(false);
const currentTime = ref(0);
const audioDuration = ref(0);
const volume = ref(clamp(Number(localStorage.getItem("ap-player-volume") || 80), 0, 100));
const queue = ref([]);
const shuffledQueue = ref([]);
const currentQueueIndex = ref(-1);
const isShuffled = ref(false);
const repeatMode = ref("none");
const showQueueModal = ref(false);
const showLyricsModal = ref(false);

const recentPlays = ref(readJson("boziamusic:recent", []));
const favorites = ref(new Set(readJson("boziamusic:favorites", [])));
const favoriteTracks = ref(readJson("boziamusic:favoriteTracks", {}));
const userStateHydrated = ref(false);
const lastPersistedUserState = ref("");
let persistTimer = null;
let searchTimer = null;
let progressTimer = null;
let ytPlayer = null;
let ytReady = false;

const currentPage = computed(() => getPageByPath(route.path));
const loginUrl = computed(() => buildApiUrl("/api/auth/google"));
const favoriteKeys = computed(() => new Set(Array.from(favorites.value)));
const favoriteItems = computed(() => Object.values(favoriteTracks.value || {}));
const visibleQueue = computed(() => (isShuffled.value ? shuffledQueue.value : queue.value));

function t(key) {
  return translate(language.value, key);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function stableStringify(value) {
  return JSON.stringify(value);
}

function artistsText(item) {
  return Array.isArray(item?.artists) ? item.artists.map((artist) => artist.name).filter(Boolean).join(", ") : "";
}

function showToast(message, type = "info") {
  const toast = { id: `${Date.now()}-${Math.random()}`, message, type, createdAt: Date.now() };
  toasts.value = [toast, ...toasts.value].slice(0, 4);
  notifications.value = [toast, ...notifications.value].slice(0, 20);
  window.setTimeout(() => dismissToast(toast.id), 4200);
}

function dismissToast(id) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

function saveSearch(value) {
  const clean = value?.trim();
  if (!clean) return;
  searchHistory.value = [clean, ...searchHistory.value.filter((entry) => entry !== clean)].slice(0, 10);
}

function applyTheme() {
  document.documentElement.dataset.theme = theme.value === "light" ? "light" : "dark";
  document.documentElement.style.setProperty("--primary", accent.value);
  document.documentElement.style.setProperty("--primary-hover", shadeHex(accent.value, -18));
}

function shadeHex(hex, amount) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#d9472f";
  const parts = [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 6)].map((part) => {
    const next = clamp(parseInt(part, 16) + amount, 0, 255);
    return next.toString(16).padStart(2, "0");
  });
  return `#${parts.join("")}`;
}

function setLanguage(next) {
  language.value = next === "en" ? "en" : "pl";
}

function setTheme(next) {
  theme.value = next === "light" ? "light" : "dark";
}

function setAccent(next) {
  accent.value = next;
}

async function loadAuthSession() {
  try {
    authSession.value = await fetchJson("/api/auth/session", { timeout: 5000 });
  } catch {
    authSession.value = { auth: { enabled: false, connected: false } };
  }
}

async function logout() {
  try {
    await fetchJson("/api/auth/logout", { method: "POST", timeout: 5000 });
    await loadAuthSession();
    showToast("Wylogowano", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function hydrateUserState() {
  try {
    const state = await fetchJson("/api/user/state", { timeout: 4500 });
    const fallbackFavorites = readJson("boziamusic:favorites", []);
    const fallbackFavoriteTracks = readJson("boziamusic:favoriteTracks", {});
    const fallbackRecent = readJson("boziamusic:recent", []);
    const fallbackHistory = readJson("ap:search-history", []);

    recentPlays.value = Array.isArray(state.recentPlays) ? state.recentPlays : fallbackRecent;
    searchHistory.value = Array.isArray(state.searchHistory) ? state.searchHistory : fallbackHistory;
    favorites.value = new Set(Array.isArray(state.favorites) ? state.favorites : fallbackFavorites);
    favoriteTracks.value = state.favoriteTracks && typeof state.favoriteTracks === "object" ? state.favoriteTracks : fallbackFavoriteTracks;
    volume.value = Number.isFinite(Number(state.volume)) ? Number(state.volume) : volume.value;
    if (state.language === "en" || state.language === "pl") language.value = state.language;
    if (state.themeState?.theme) theme.value = state.themeState.theme;
    if (state.themeState?.accent) accent.value = state.themeState.accent;
    lastPersistedUserState.value = stableStringify(getPersistableState());
  } catch (error) {
    console.warn("Could not hydrate user state:", error.message);
  } finally {
    userStateHydrated.value = true;
  }
}

function getPersistableState() {
  return {
    recentPlays: recentPlays.value,
    searchHistory: searchHistory.value.slice(0, 10),
    favorites: Array.from(favorites.value),
    favoriteTracks: favoriteTracks.value,
    volume: volume.value,
    language: language.value,
    themeState: { theme: theme.value, accent: accent.value },
  };
}

function persistUserState() {
  const state = getPersistableState();
  localStorage.setItem("boziamusic:recent", JSON.stringify(state.recentPlays));
  localStorage.setItem("boziamusic:favorites", JSON.stringify(state.favorites));
  localStorage.setItem("boziamusic:favoriteTracks", JSON.stringify(state.favoriteTracks));
  localStorage.setItem("ap:search-history", JSON.stringify(state.searchHistory));
  localStorage.setItem("ap-player-volume", String(state.volume));
  localStorage.setItem("ap:language", state.language);
  localStorage.setItem("ap:theme", state.themeState.theme);
  localStorage.setItem("ap:accent", state.themeState.accent);
  applyTheme();

  if (!userStateHydrated.value) return;
  const serialized = stableStringify(state);
  if (serialized === lastPersistedUserState.value) return;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    lastPersistedUserState.value = serialized;
    fetchJson("/api/user/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      timeout: 4500,
    }).catch((error) => console.warn("Could not persist state:", error.message));
  }, USER_STATE_SAVE_DELAY_MS);
}

function loadYouTubeApi() {
  if (window.YT?.Player) {
    initYouTubePlayer();
    return;
  }
  const previousReady = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    previousReady?.();
    initYouTubePlayer();
  };
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  }
}

function initYouTubePlayer() {
  if (ytReady) return;
  ytReady = true;
  ytPlayer = new window.YT.Player("yt-hidden-player", {
    height: "1",
    width: "1",
    playerVars: {
      autoplay: 0,
      controls: 0,
      fs: 0,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
    },
    events: {
      onReady: () => {
        ytPlayer?.setVolume?.(volume.value);
        if (nowPlaying.value?.videoId) ytPlayer?.loadVideoById?.(nowPlaying.value.videoId);
      },
      onStateChange: (event) => {
        const states = window.YT?.PlayerState;
        if (!states) return;
        if (event.data === states.PLAYING) {
          isPlaying.value = true;
          startProgressTimer();
        } else if (event.data === states.PAUSED) {
          isPlaying.value = false;
          stopProgressTimer();
        } else if (event.data === states.ENDED) {
          isPlaying.value = false;
          stopProgressTimer();
          if (repeatMode.value === "one") {
            seekTo(0);
            ytPlayer?.playVideo?.();
          } else {
            nextTrack();
          }
        }
      },
      onError: () => showToast("Nie udalo sie odtworzyc tego utworu.", "error"),
    },
  });
}

function startProgressTimer() {
  stopProgressTimer();
  progressTimer = window.setInterval(() => {
    try {
      currentTime.value = ytPlayer?.getCurrentTime?.() || currentTime.value;
      const duration = ytPlayer?.getDuration?.() || 0;
      if (duration > 0) audioDuration.value = duration;
    } catch {
      stopProgressTimer();
    }
  }, 500);
}

function stopProgressTimer() {
  if (progressTimer) {
    window.clearInterval(progressTimer);
    progressTimer = null;
  }
}

function play(item, newQueue = null) {
  if (!item) return;
  const track = normalizeTrack(item);
  if (newQueue?.length) {
    queue.value = newQueue.map(normalizeTrack).filter(Boolean);
    currentQueueIndex.value = Math.max(0, queue.value.findIndex((entry) => trackKey(entry) === trackKey(track)));
    if (isShuffled.value) shuffledQueue.value = shuffle(queue.value);
  } else if (visibleQueue.value.length) {
    const index = visibleQueue.value.findIndex((entry) => trackKey(entry) === trackKey(track));
    if (index >= 0) currentQueueIndex.value = index;
  }

  nowPlaying.value = track;
  playerVisible.value = true;
  currentTime.value = 0;
  audioDuration.value = track.durationSeconds || secondsFromDuration(track.duration) || 0;
  document.title = `${track.title} | AetherPulse Music`;

  recentPlays.value = [track, ...recentPlays.value.filter((entry) => trackKey(entry) !== trackKey(track))].slice(0, 25);
  fetchJson("/api/user/recent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track }),
    timeout: 4500,
  }).catch(() => {});

  if (track.videoId && ytPlayer?.loadVideoById) {
    ytPlayer.loadVideoById(track.videoId);
  } else if (!track.videoId) {
    showToast("Ten element nie ma videoId.", "warning");
  }
}

function togglePlay() {
  if (!ytPlayer) return;
  try {
    const state = ytPlayer.getPlayerState();
    if (state === window.YT?.PlayerState?.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
  } catch {
    showToast("Odtwarzacz nie jest jeszcze gotowy.", "warning");
  }
}

function seekTo(seconds) {
  currentTime.value = Math.max(0, Number(seconds) || 0);
  try {
    ytPlayer?.seekTo?.(currentTime.value, true);
  } catch {}
}

function setVolume(next) {
  volume.value = clamp(Number(next), 0, 100);
  try {
    ytPlayer?.setVolume?.(volume.value);
  } catch {}
}

function nextTrack() {
  const list = visibleQueue.value;
  if (!list.length) return;
  const nextIndex = currentQueueIndex.value < list.length - 1 ? currentQueueIndex.value + 1 : (repeatMode.value === "all" ? 0 : -1);
  if (nextIndex >= 0) {
    currentQueueIndex.value = nextIndex;
    play(list[nextIndex]);
  } else {
    showToast("Koniec kolejki", "info");
  }
}

function prevTrack() {
  if (currentTime.value > 5) {
    seekTo(0);
    return;
  }
  const list = visibleQueue.value;
  const prevIndex = currentQueueIndex.value > 0 ? currentQueueIndex.value - 1 : -1;
  if (prevIndex >= 0) {
    currentQueueIndex.value = prevIndex;
    play(list[prevIndex]);
  } else {
    seekTo(0);
  }
}

function playNext(track) {
  const normalized = normalizeTrack(track);
  const next = [...queue.value];
  const insertAt = Math.max(currentQueueIndex.value + 1, 0);
  next.splice(insertAt, 0, normalized);
  queue.value = next;
  showToast("Dodano jako nastepny", "success");
}

function addToQueue(track) {
  queue.value = [...queue.value, normalizeTrack(track)];
  showToast(t("addedToQueue"), "success");
}

function playQueueIndex(index) {
  const item = visibleQueue.value[index];
  if (!item) return;
  currentQueueIndex.value = index;
  play(item);
}

function removeFromQueue(index) {
  if (isShuffled.value) {
    shuffledQueue.value = shuffledQueue.value.filter((_, itemIndex) => itemIndex !== index);
  } else {
    queue.value = queue.value.filter((_, itemIndex) => itemIndex !== index);
  }
}

async function saveQueue(title) {
  try {
    await fetchJson("/api/user/queues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, tracks: visibleQueue.value }),
      timeout: 6000,
    });
    showToast("Kolejka zapisana", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function toggleShuffle() {
  isShuffled.value = !isShuffled.value;
  if (isShuffled.value) shuffledQueue.value = shuffle(queue.value);
}

function toggleRepeat() {
  repeatMode.value = repeatMode.value === "none" ? "all" : repeatMode.value === "all" ? "one" : "none";
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

function toggleFavoriteTrack(track) {
  if (!track) return;
  const normalized = normalizeTrack(track);
  const key = trackKey(normalized);
  const nextFavorites = new Set(favorites.value);
  const nextTracks = { ...favoriteTracks.value };
  if (nextFavorites.has(key)) {
    nextFavorites.delete(key);
    delete nextTracks[key];
    showToast("Usunieto z ulubionych", "info");
  } else {
    nextFavorites.add(key);
    nextTracks[key] = normalized;
    showToast("Dodano do ulubionych", "success");
  }
  favorites.value = nextFavorites;
  favoriteTracks.value = nextTracks;

  fetchJson("/api/user/favorites/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track: normalized }),
    timeout: 4500,
  }).catch(() => {});
}

function handleSearchResultClick(item) {
  saveSearch(query.value);
  searchOpen.value = false;
  openMediaItem(item);
}

function openMediaItem(item) {
  if (!item) return;
  const type = item.resultType || searchFilter.value;
  if (item.videoId || type === "song" || type === "video") {
    play(item, searchResults.value.filter((entry) => entry.videoId));
    return;
  }
  const id = item.playlistId || item.browseId;
  if (type === "artist" || id?.startsWith("UC")) {
    router.push(`/artist/${id}`);
  } else if (type === "album") {
    router.push(`/album/${id}`);
  } else if (type === "playlist" || id) {
    router.push({ path: "/playlists", query: { playlist: id } });
  }
}

watch([query, searchFilter], () => {
  window.clearTimeout(searchTimer);
  const clean = query.value.trim();
  if (clean.length < 2) {
    searchResults.value = [];
    searchLoading.value = false;
    return;
  }
  searchLoading.value = true;
  searchTimer = window.setTimeout(async () => {
    try {
      const params = new URLSearchParams({ q: clean, filter: searchFilter.value, limit: "18" });
      const data = await fetchJson(`/api/ytmusic/search?${params.toString()}`, { timeout: 12000 });
      searchResults.value = Array.isArray(data) ? data : [];
    } catch (error) {
      searchResults.value = [];
      showToast(error.message, "error");
    } finally {
      searchLoading.value = false;
    }
  }, 300);
});

watch([recentPlays, favoriteTracks, favorites, volume, searchHistory, language, theme, accent], persistUserState, { deep: true });

watch([theme, accent], applyTheme);

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false;
    searchOpen.value = false;
  },
);

function handleDocumentClick(event) {
  if (searchRef.value && !searchRef.value.contains(event.target)) searchOpen.value = false;
}

function handleKeyboard(event) {
  const tag = event.target?.tagName?.toLowerCase();
  const isTyping = tag === "input" || tag === "textarea" || event.target?.isContentEditable;
  if (event.key === "/" && !isTyping) {
    event.preventDefault();
    searchOpen.value = true;
    nextTick(() => searchInputRef.value?.focus());
    return;
  }
  if (isTyping) return;
  if (event.key === " " || event.key.toLowerCase() === "k") {
    event.preventDefault();
    togglePlay();
  } else if (event.key === "ArrowRight") {
    event.shiftKey ? nextTrack() : seekTo(currentTime.value + 10);
  } else if (event.key === "ArrowLeft") {
    event.shiftKey ? prevTrack() : seekTo(currentTime.value - 10);
  } else if (event.key.toLowerCase() === "q") {
    showQueueModal.value = true;
  } else if (event.key.toLowerCase() === "l") {
    showLyricsModal.value = true;
  }
}

provide("appState", {
  language,
  t,
  setLanguage,
  theme,
  setTheme,
  accent,
  setAccent,
  authSession,
  loginUrl,
  logout,
  play,
  playNext,
  addToQueue,
  openMediaItem,
  nowPlaying,
  queue,
  favoriteKeys,
  favoriteItems,
  recentPlays,
  toggleFavoriteTrack,
  showToast,
});

onMounted(() => {
  applyTheme();
  loadAuthSession();
  hydrateUserState();
  loadYouTubeApi();
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeyboard);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleKeyboard);
  window.clearTimeout(searchTimer);
  window.clearTimeout(persistTimer);
  stopProgressTimer();
});
</script>
