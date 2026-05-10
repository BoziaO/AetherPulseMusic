<template>
  <div class="app-shell">
    <Sidebar :open="sidebarOpen" :current-path="route.path" @close="sidebarOpen = false" />

    <main class="main" :class="nowPlaying ? 'has-player' : ''">
      <header class="topbar">
        <div class="topbar-inner">
          <button class="icon-btn lg:hidden" type="button" :title="t('navHome')" @click="sidebarOpen = true">
            <Menu :size="20" />
          </button>

          <div ref="searchRef" class="search-wrap">
            <Search :size="16" class="search-icon" />
            <input
              ref="searchInputRef"
              v-model="query"
              class="search-input"
              type="search"
              :placeholder="t('searchPlaceholder')"
              @focus="searchOpen = true"
              @keydown.enter.prevent="saveSearch(query)"
            />
            <button v-if="query" class="search-clear" type="button" :title="t('clear')" @click="query = ''">
              <X :size="14" />
            </button>

            <div v-if="searchOpen && (query || searchHistory.length)" class="search-pop">
              <div class="search-filters">
                <button
                  v-for="filter in searchFilters"
                  :key="filter.value"
                  class="chip"
                  :class="searchFilter === filter.value ? 'chip-active' : ''"
                  type="button"
                  @click="searchFilter = filter.value"
                >
                  {{ t(filter.labelKey) }}
                </button>
              </div>

              <div v-if="!query.trim() && searchHistory.length" class="search-results">
                <div class="search-history-head">
                  <p>{{ t('recentSearches') }}</p>
                  <button class="link-btn" type="button" @click="searchHistory = []">{{ t('clear') }}</button>
                </div>
                <button
                  v-for="entry in searchHistory"
                  :key="entry"
                  class="history-row"
                  type="button"
                  @click="query = entry"
                >
                  <Search :size="14" :style="{ color: 'var(--text-tertiary)' }" />
                  <span class="truncate">{{ entry }}</span>
                </button>
              </div>

              <div v-else-if="query.trim().length > 0 && query.trim().length < 2" class="state-msg">
                {{ t('minTwoChars') }}
              </div>

              <div v-else-if="searchLoading" class="state-msg">
                {{ t('searching') }}
              </div>

              <div v-else-if="searchResults.length" class="result-list">
                <button
                  v-for="(item, index) in searchResults"
                  :key="item.videoId || item.browseId || `${item.title}-${index}`"
                  class="result-row"
                  type="button"
                  @click="handleSearchResultClick(item)"
                >
                  <span class="result-cover">
                    <img v-if="item.thumbnail || item.cover || item.art" :src="item.thumbnail || item.cover || item.art" alt="" />
                  </span>
                  <span class="result-text">
                    <span class="result-title">{{ item.title }}</span>
                    <span class="result-sub">
                      {{ item.artist || item.author || item.subtitle || artistsText(item) || "YouTube Music" }}
                    </span>
                  </span>
                  <span class="result-tag">{{ item.resultType || searchFilter }}</span>
                </button>
              </div>

              <div v-else class="state-msg">{{ t('noResults') }}</div>
            </div>
          </div>

          <div class="header-actions">
            <RouterLink class="icon-btn" to="/insights" :title="t('navInsights')">
              <BarChart3 :size="18" />
            </RouterLink>
            <RouterLink class="icon-btn" to="/settings" :title="t('navSettings')">
              <Settings :size="18" />
            </RouterLink>
            <button v-if="authSession.auth?.connected" class="btn-secondary hidden sm:inline-flex" type="button" @click="logout">
              {{ t('logout') }}
            </button>
            <a v-else-if="authSession.auth?.enabled" class="btn-primary hidden sm:inline-flex" :href="loginUrl">
              <LogIn :size="14" />
              {{ t('signIn') }}
            </a>
          </div>
        </div>
        <div v-if="showPrivacyBanner" class="privacy-banner">
          <p>{{ t('privacyBanner') }}</p>
          <button
            class="privacy-close-btn"
            type="button"
            :title="t('close')"
            @click="showPrivacyBanner = false"
          >
            <X :size="16" />
          </button>
        </div>
      </header>

      <div class="page">
        <RouterView />
      </div>
    </main>

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
      :favorite="favoriteKeys.has(trackKey(nowPlaying))"
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

    <FullPlayer
      v-if="nowPlaying && showFullPlayer"
      :track="nowPlaying"
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="audioDuration"
      :volume="volume"
      :shuffle="isShuffled"
      :repeat-mode="repeatMode"
      :favorite="favoriteKeys.has(trackKey(nowPlaying))"
      :playlist-name="getCurrentPlaylistName()"
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

    <QueueModal
      :open="showQueueModal"
      :tracks="visibleQueue"
      :current-index="currentQueueIndex"
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

    <ToastStack :toasts="toasts" @dismiss="dismissToast" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { BarChart3, LogIn, Menu, Search, Settings, X } from "lucide-vue-next";
import LyricsModal from "./LyricsModal.vue";
import PlayerBar from "./PlayerBar.vue";
import QueueModal from "./QueueModal.vue";
import FullPlayer from "./FullPlayer.vue";
import Sidebar from "./Sidebar.vue";
import ToastStack from "./ToastStack.vue";
import { translate } from "../data/i18n";
import { buildApiUrl, fetchJson } from "../lib/api";
import { clamp, normalizeTrack, secondsFromDuration, trackKey } from "../lib/format";

const route = useRoute();
const router = useRouter();

const searchFilters = [
  { value: "songs", labelKey: "filterSongs" },
  { value: "playlists", labelKey: "filterPlaylists" },
  { value: "albums", labelKey: "filterAlbums" },
  { value: "artists", labelKey: "filterArtists" },
];

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
const showPrivacyBanner = ref(true);
const toasts = ref([]);

const authSession = ref({ auth: { enabled: false, connected: false } });
const language = ref(localStorage.getItem("ap:language") || "pl");
const theme = ref(localStorage.getItem("ap:theme") || "dark");
const accent = ref(localStorage.getItem("ap:accent") || "#fa243c");

const nowPlaying = ref(null);
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
const showFullPlayer = ref(false);
const playerMinimized = ref(false);

const recentPlays = ref(readJson("boziamusic:recent", []));
const favorites = ref(new Set(readJson("boziamusic:favorites", [])));
const favoriteTracks = ref(readJson("boziamusic:favoriteTracks", {}));
const lyricsFollowMode = ref(readJson("ap-lyrics-follow-mode", true));

const userStateHydrated = ref(false);
const lastPersistedUserState = ref("");
let persistTimer = null;
let searchTimer = null;
let progressTimer = null;
let ytPlayer = null;
let ytReady = false;

const loginUrl = computed(() => buildApiUrl("/api/auth/google"));
const favoriteKeys = computed(() => new Set(favorites.value));
const favoriteItems = computed(() => Object.values(favoriteTracks.value || {}));
const visibleQueue = computed(() => (isShuffled.value ? shuffledQueue.value : queue.value));

function isFavorite(track) {
  return favoriteKeys.value.has(trackKey(track));
}

function t(key, vars) {
  return translate(language.value, key, vars);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function stableStringify(value) {
  return JSON.stringify(value);
}

function artistsText(item) {
  return Array.isArray(item?.artists)
    ? item.artists.map((artist) => artist.name).filter(Boolean).join(", ")
    : "";
}

function showToast(message, type = "info") {
  const toast = { id: `${Date.now()}-${Math.random()}`, message, type, createdAt: Date.now() };
  toasts.value = [toast, ...toasts.value].slice(0, 4);
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
  const rgb = hexToRgb(accent.value);
  if (rgb) document.documentElement.style.setProperty("--primary-rgb", rgb.join(", "));
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return null;
  return [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 6)].map((p) => parseInt(p, 16));
}

function shadeHex(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return (
    "#" +
    rgb
      .map((value) => clamp(value + amount, 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
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
    showToast(t("loggedOut"), "success");
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
    favoriteTracks.value =
      state.favoriteTracks && typeof state.favoriteTracks === "object"
        ? state.favoriteTracks
        : fallbackFavoriteTracks;
    if (Number.isFinite(Number(state.volume))) volume.value = Number(state.volume);
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
    }).catch(() => {});
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
    playerVars: { autoplay: 0, controls: 0, fs: 0, rel: 0, modestbranding: 1, playsinline: 1 },
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
      onError: () => showToast(t("cantPlay"), "error"),
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
    currentQueueIndex.value = Math.max(
      0,
      queue.value.findIndex((entry) => trackKey(entry) === trackKey(track)),
    );
    if (isShuffled.value) shuffledQueue.value = shuffle(queue.value);
  } else if (visibleQueue.value.length) {
    const index = visibleQueue.value.findIndex((entry) => trackKey(entry) === trackKey(track));
    if (index >= 0) currentQueueIndex.value = index;
  }

  nowPlaying.value = track;
  currentTime.value = 0;
  audioDuration.value = track.durationSeconds || secondsFromDuration(track.duration) || 0;
  document.title = `${track.title} — ${t("appName")}`;

  recentPlays.value = [
    track,
    ...recentPlays.value.filter((entry) => trackKey(entry) !== trackKey(track)),
  ].slice(0, 25);
  fetchJson("/api/user/recent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track }),
    timeout: 4500,
  }).catch(() => {});

  if (track.videoId && ytPlayer?.loadVideoById) {
    ytPlayer.loadVideoById(track.videoId);
  } else if (!track.videoId) {
    showToast(t("noVideoId"), "warning");
  }
}

function togglePlay() {
  if (!ytPlayer) {
    showToast(t("playerNotReady"), "warning");
    return;
  }
  try {
    const state = ytPlayer.getPlayerState();
    if (state === window.YT?.PlayerState?.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
  } catch {
    showToast(t("playerNotReady"), "warning");
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
  const nextIndex =
    currentQueueIndex.value < list.length - 1
      ? currentQueueIndex.value + 1
      : repeatMode.value === "all"
      ? 0
      : -1;
  if (nextIndex >= 0) {
    currentQueueIndex.value = nextIndex;
    play(list[nextIndex]);
  } else {
    showToast(t("endOfQueue"), "info");
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
  showToast(t("addedAsNext"), "success");
}

function addToQueue(track) {
  queue.value = [...queue.value, normalizeTrack(track)];
  showToast(t("addedToQueue"), "success");
}

function playQueueIndex(index) {
  const list = visibleQueue.value;
  if (index >= 0 && index < list.length) {
    currentQueueIndex.value = index;
    play(list[index]);
  }
}

function removeFromQueue(index) {
  const next = [...queue.value];
  next.splice(index, 1);
  queue.value = next;
  if (currentQueueIndex.value > index) {
    currentQueueIndex.value -= 1;
  } else if (currentQueueIndex.value === index && index >= queue.value.length) {
    currentQueueIndex.value = queue.value.length - 1;
    if (currentQueueIndex.value >= 0) play(queue.value[currentQueueIndex.value]);
  }
}

function clearQueue() {
  queue.value = [];
  shuffledQueue.value = [];
  currentQueueIndex.value = -1;
  showToast(t("queueCleared"), "info");
}

function saveQueue(title) {
  if (!title?.trim()) return;
  fetchJson("/api/user/queues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title.trim(), tracks: [...queue.value] }),
    timeout: 4500,
  })
    .then(() => {
      showToast(t("saved"), "success");
      showQueueModal.value = false;
    })
    .catch(() => showToast(t("saveFailed"), "error"));
}

function getCurrentPlaylistName() {
  if (!queue.value.length) return "";
  return t("trackCount", { count: queue.value.length });
}

function toggleShuffle() {
  isShuffled.value = !isShuffled.value;
  if (isShuffled.value) shuffledQueue.value = shuffle(queue.value);
}

function toggleRepeat() {
  repeatMode.value =
    repeatMode.value === "none" ? "all" : repeatMode.value === "all" ? "one" : "none";
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
    showToast(t("removedFromFavorites"), "info");
  } else {
    nextFavorites.add(key);
    nextTracks[key] = normalized;
    showToast(t("addedToFavorites"), "success");
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
    play(
      item,
      searchResults.value.filter((entry) => entry.videoId),
    );
    return;
  }
  const id = item.playlistId || item.browseId;
  if (type === "artist" || id?.startsWith?.("UC")) {
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
      const params = new URLSearchParams({
        q: clean,
        filter: searchFilter.value,
        limit: "18",
      });
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

watch(
  [recentPlays, favoriteTracks, favorites, volume, searchHistory, language, theme, accent],
  persistUserState,
  { deep: true },
);

watch([theme, accent], applyTheme);

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false;
    searchOpen.value = false;
  },
);

watch(lyricsFollowMode, () => {
  localStorage.setItem("ap-lyrics-follow-mode", JSON.stringify(lyricsFollowMode.value));
});

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
  } else if (event.key === "Escape") {
    if (showFullPlayer.value) showFullPlayer.value = false;
    else if (showQueueModal.value) showQueueModal.value = false;
    else if (showLyricsModal.value) showLyricsModal.value = false;
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
  isPlaying,
  currentTime,
  audioDuration,
  volume,
  queue,
  favoriteKeys,
  favoriteItems,
  recentPlays,
  toggleFavoriteTrack,
  showToast,
  lyricsFollowMode,
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

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--bg-base);
}

.main {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 24px;
}

.main.has-player {
  padding-bottom: 92px;
}

@media (min-width: 1024px) {
  .main {
    margin-left: 260px;
  }
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 180;
  background: var(--bg-base);
  border-bottom: 1px solid var(--line);
  backdrop-filter: var(--glass);
  -webkit-backdrop-filter: var(--glass);
}

.topbar-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.privacy-banner {
  background-color: var(--primary); /* Using primary accent color for visibility */
  color: var(--bg-base); /* Text color that contrasts with primary */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-bottom: 1px solid var(--line);
  position: relative;
}

.privacy-banner p {
  margin: 0;
}

.privacy-close-btn {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
}

.privacy-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 480px;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 38px 0 36px;
  border-radius: 10px;
  background: var(--bg-input);
  border: 1px solid transparent;
  font-size: 14px;
  color: var(--text-primary);
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.search-input:focus {
  outline: none;
  background: var(--bg-elevated);
  border-color: var(--line-strong);
}

.search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-tertiary);
  transition: background var(--transition-fast);
}

.search-clear:hover {
  background: var(--bg-hover);
}

.search-pop {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-card-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-strong);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

.search-filters {
  display: flex;
  gap: 6px;
  padding: 10px;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
}

.search-filters .chip {
  flex-shrink: 0;
}

.search-results {
  padding: 6px;
  overflow-y: auto;
}

.search-history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 4px;
}

.search-history-head p {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.link-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  text-align: left;
  transition: background var(--transition-fast);
}

.history-row:hover {
  background: var(--bg-hover);
}

.state-msg {
  padding: 32px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
}

.result-list {
  display: flex;
  flex-direction: column;
}

.result-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  text-align: left;
  transition: background var(--transition-fast);
}

.result-row:hover {
  background: var(--bg-hover);
}

.result-cover {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--bg-elevated);
}

.result-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-text {
  min-width: 0;
}

.result-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-sub {
  display: block;
  margin-top: 1px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.page {
  flex: 1;
  padding: 24px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#yt-hidden-player {
  position: fixed;
  inset: -9999px;
  pointer-events: none;
  visibility: hidden;
  height: 1px;
  width: 1px;
}
</style>
