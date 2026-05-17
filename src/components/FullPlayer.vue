<template>
  <div
    class="full-player"
    :class="{ 'is-minimal': minimalMode }"
    @click.self="$emit('close')"
  >
    <canvas ref="canvasRef" style="display: none;" />
    <div class="dynamic-bg" :style="playerBackgroundStyle">
      <img v-if="cover" :src="cover" class="bg-image" alt="" />
      <div class="bg-overlay" />
    </div>

    <header class="full-header">
      <button class="icon-btn" type="button" :title="t('collapsePlayer')" @click="$emit('close')">
        <ChevronDown :size="22" />
      </button>
      <div class="hdr-meta">
        <p class="hdr-eyebrow">{{ t('fromQueue') }}</p>
        <p class="hdr-title">{{ playlistName || t('queue') }}</p>
      </div>
      <button
        class="icon-btn"
        type="button"
        :title="t(minimalMode ? 'minimalModeOff' : 'minimalModeOn')"
        @click="toggleMinimalMode"
      >
        <Maximize2 v-if="minimalMode" :size="18" />
        <Minimize2 v-else :size="18" />
      </button>
    </header>

    <div class="full-body">
      <div class="player-main">
        <div class="left-panel">
          <div class="album-frame">
            <div class="album-cover" :class="{ 'is-playing': isPlaying }">
              <img
                v-if="cover"
                :src="highResCover"
                alt=""
                :key="cover"
                @error="onCoverError"
              />
              <Music v-else :size="80" :style="{ color: 'var(--text-tertiary)' }" />
            </div>
          </div>

          <div class="track-text" :key="track?.videoId || track?.title">
            <h2 class="track-title" :class="{ 'marquee': titleOverflows }">
              <span class="track-title-inner" ref="titleRef">{{ track?.title }}</span>
            </h2>
            <p class="track-artist">{{ artist }}<span v-if="trackDislikes !== null" class="dislikes"> · 👎 {{ formatNumber(trackDislikes) }}</span></p>
          </div>

          <div class="track-progress">
            <input
              type="range"
              min="0"
              :max="safeDuration"
              step="1"
              :value="currentTime"
              class="am-slider"
              :style="{ '--progress': `${progressPercent}%` }"
              @input="$emit('seek', Number($event.target.value))"
            />
            <div class="sponsor-segments" v-if="sponsorSegments.length">
              <div
                v-for="segment in sponsorSegments"
                :key="segment.segment"
                class="segment-marker"
                :style="{ left: `${(segment.segment[0] / safeDuration) * 100}%`, width: `${((segment.segment[1] - segment.segment[0]) / safeDuration) * 100}%` }"
                :title="`${segment.category}: ${formatClock(segment.segment[0])} - ${formatClock(segment.segment[1])}`"
              ></div>
            </div>
            <div class="time-row">
              <span>{{ formatClock(currentTime) }}</span>
              <span>-{{ formatClock(Math.max(0, safeDuration - currentTime)) }}</span>
            </div>
          </div>

          <div class="controls">
            <button class="ctrl" type="button" :title="t('shuffle')" @click="$emit('shuffle')">
              <Shuffle :size="20" :style="shuffle ? 'color: var(--primary)' : ''" />
            </button>
            <button class="ctrl" type="button" :title="t('previous')" @click="$emit('prev')">
              <SkipBack :size="32" fill="currentColor" />
            </button>
            <button class="big-play" type="button" :title="isPlaying ? t('pause') : t('play')" @click="$emit('toggle-play')">
              <Pause v-if="isPlaying" :size="36" fill="currentColor" />
              <Play v-else :size="36" fill="currentColor" class="translate-x-[2px]" />
            </button>
            <button class="ctrl" type="button" :title="t('next')" @click="$emit('next')">
              <SkipForward :size="32" fill="currentColor" />
            </button>
            <button class="ctrl" type="button" :title="t('repeat')" @click="$emit('repeat')">
              <Repeat :size="20" :style="repeatMode !== 'none' ? 'color: var(--primary)' : ''" />
            </button>
          </div>

          <div class="bottom-row">
            <div class="volume">
              <Volume2 v-if="volume > 0" :size="16" :style="{ color: 'rgba(255,255,255,0.6)' }" />
              <VolumeX v-else :size="16" :style="{ color: 'rgba(255,255,255,0.6)' }" />
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="volume"
                class="am-slider am-slider-pink"
                :style="{ '--progress': `${volume}%` }"
                @input="$emit('volume', Number($event.target.value))"
              />
            </div>
            <div class="row-actions">
              <button class="ctrl-sm" type="button" :title="t('download')" @click="handleDownload">
                <Download :size="20" :style="isDownloaded(track?.videoId) ? 'color: var(--success)' : ''" />
              </button>
              <button class="ctrl-sm" type="button" :title="t('timestampComments')" @click="showComments = !showComments">
                <MessageSquare :size="20" />
              </button>
              <button class="ctrl-sm" type="button" :title="t('audioMixer')" @click="app?.openEqualizer?.()">
                <SlidersHorizontal :size="20" />
              </button>
              <button class="ctrl-sm" type="button" :title="t('audioVisualizer')" @click="showVisualizer = !showVisualizer">
                <span style="font-size:18px;font-weight:700;line-height:1">≈</span>
              </button>
              <SleepTimer />
              <button class="ctrl-sm" type="button" :title="t('lyrics')" @click="showLyrics = !showLyrics">
                <Captions :size="20" :style="showLyrics ? 'color: var(--primary)' : ''" />
              </button>
              <button class="ctrl-sm" type="button" :title="t('queue')" @click="$emit('queue')">
                <ListMusic :size="20" />
              </button>
              <button class="ctrl-sm" type="button" :title="t('favorites')" @click="$emit('toggle-favorite')">
                <Heart :size="20" :fill="favorite ? 'var(--primary)' : 'none'" :style="favorite ? 'color: var(--primary)' : ''" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="showLyrics" class="right-panel lyrics-panel">
          <div class="lyrics-header">
            <h3 class="lyrics-title">{{ t('lyrics') }}</h3>
            <div class="lyrics-header-actions">
              <button
                class="lyrics-follow-btn"
                :class="{ active: lyricsFollowMode }"
                type="button"
                :title="lyricsFollowMode ? t('lyricsFollowOn') : t('lyricsFollowOff')"
                @click="toggleLyricsFollow"
              >
                <span class="follow-dot" />
                {{ t('autoScroll') }}
              </button>
              <button class="lyrics-toggle" type="button" @click="showLyrics = false">
                <X :size="16" />
              </button>
            </div>
          </div>
          <div class="lyrics-body-wrap">
            <div ref="lyricsContainerRef" class="lyrics-content">
              <div v-if="lyricsLoading" class="lyrics-loading">
                <div class="loading-dots"><span /><span /><span /></div>
              </div>
              <div v-else-if="timedLyrics.length" class="lyrics-lines">
                <button
                  v-for="(line, index) in timedLyrics"
                  :key="`${line.time}-${index}`"
                  class="lyric-line"
                  :class="{
                    'is-active': activeLyricIndex === index,
                    'is-past': index < activeLyricIndex,
                    'is-future': index > activeLyricIndex && activeLyricIndex >= 0,
                  }"
                  :data-index="index"
                  type="button"
                  @click="$emit('seek', line.time)"
                >
                  {{ line.text }}
                </button>
              </div>
              <pre v-else-if="plainLyrics" class="lyrics-plain">{{ plainLyrics }}</pre>
              <div v-else class="lyrics-empty">{{ t('emptyData') }}</div>
            </div>
            <div class="lyrics-fade-top" />
            <div class="lyrics-fade-bottom" />
          </div>
        </div>
      </div>

      <div v-if="showVisualizer" class="visualizer-section">
        <AudioVisualizer />
      </div>

      <div v-if="showComments" class="comments-section">
        <TrackComments @seek="$emit('seek', $event)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  Captions,
  ChevronDown,
  Download,
  Heart,
  ListMusic,
  Maximize2,
  MessageSquare,
  Minimize2,
  Music,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-vue-next";
import AudioVisualizer from "./AudioVisualizer.vue";
import TrackComments from "./TrackComments.vue";
import SleepTimer from "./SleepTimer.vue";
import { formatClock, formatNumber, upgradeThumbUrl } from "../lib/format";
import { fetchJson } from "../lib/api";
import { getEffectiveOffset, lyricsOffsetState } from "../lib/lyricsOffset";
import { isDownloaded, enqueueDownload, removeDownload, settings as offlineSettings } from "../lib/offlineStore";

const props = defineProps({
  track: { type: Object, required: true },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  volume: { type: Number, default: 80 },
  shuffle: { type: Boolean, default: false },
  repeatMode: { type: String, default: "none" },
  favorite: { type: Boolean, default: false },
  sponsorSegments: { type: Array, default: () => [] },
  playlistName: { type: String, default: "" },
});

defineEmits([
  "close",
  "toggle-play",
  "seek",
  "volume",
  "prev",
  "next",
  "shuffle",
  "repeat",
  "toggle-favorite",
  "queue",
  "lyrics",
]);

const app = inject("appState");

const canvasRef = ref(null);
const titleRef = ref(null);
const lyricsContainerRef = ref(null);
const showVisualizer = ref(false);
const showComments = ref(false);
const showLyrics = ref(false);
const titleOverflows = ref(false);

// Minimalistyczny tryb — ukrywa wszystko poza okładką, tytułem i podstawowymi
// kontrolkami. Stan zapisywany w localStorage.
const minimalMode = ref(localStorage.getItem("ap-fullplayer-minimal") === "1");

function toggleMinimalMode() {
  minimalMode.value = !minimalMode.value;
  try {
    localStorage.setItem("ap-fullplayer-minimal", minimalMode.value ? "1" : "0");
  } catch { /* ignore */ }
  // Wyłączamy panele boczne aby nie kolidowały z minimalnym wyglądem.
  if (minimalMode.value) {
    showLyrics.value = false;
    showVisualizer.value = false;
    showComments.value = false;
  }
}
// Default: neutral deep bg — overridden by extracted dominant color
const dominantColor = ref("rgba(20, 20, 24, 1)");
const accentColor = ref("rgba(80, 80, 90, 1)");

function handleDownload() {
  const track = props.track;
  if (!track?.videoId) return;

  if (isDownloaded(track.videoId)) {
    if (window.confirm(t("confirmClear"))) {
      removeDownload(track.videoId);
      app?.showToast?.(t("downloadRemoved"), "info");
    }
    return;
  }

  if (!offlineSettings.legalAccepted) {
    app?.requestDownloadConsent?.(track);
    return;
  }

  if (enqueueDownload(track)) {
    app?.showToast?.(t("downloadStarted"), "success");
  }
}

// Lyrics state
const lyricsLoading = ref(false);
const plainLyrics = ref("");
const timedLyrics = ref([]);

function t(key) {
  return app?.t?.(key) ?? key;
}

const cover = computed(
  () => props.track?.art || props.track?.thumbnail || props.track?.cover || null,
);

// Upgraded cover URL — with fallback to original on 404
const coverErrored = ref(false);
watch(cover, () => { coverErrored.value = false; });

const highResCover = computed(() =>
  coverErrored.value ? cover.value : getHighResCover(cover.value),
);

function onCoverError() {
  if (!coverErrored.value) {
    coverErrored.value = true; // triggers fallback to original URL
  }
}
const artist = computed(
  () => props.track?.artist || props.track?.subtitle || props.track?.author || "",
);
const safeDuration = computed(() =>
  Math.max(1, Math.floor(props.duration || props.track?.durationSeconds || 0)),
);
const progressPercent = computed(() =>
  Math.min(100, (props.currentTime / safeDuration.value) * 100),
);

// Measure whether the track title overflows its container → trigger marquee.
function checkTitleOverflow() {
  const el = titleRef.value;
  if (!el) {
    titleOverflows.value = false;
    return;
  }
  const parent = el.parentElement;
  if (!parent) return;
  titleOverflows.value = el.scrollWidth > parent.clientWidth + 2;
}

let resizeObs = null;

// Load dislikes — read-only, stored in local ref, never mutates prop
const trackDislikes = ref(null);

async function loadDislikes(videoId) {
  if (!videoId) return;
  trackDislikes.value = null;
  try {
    const songData = await fetchJson(`/api/ytmusic/song/${videoId}`);
    if (Number.isFinite(songData?.dislikes)) {
      trackDislikes.value = songData.dislikes;
    }
  } catch {
    // dislikes are optional — ignore errors
  }
}

watch(
  () => props.track?.videoId,
  (id) => { if (id) loadDislikes(id); },
  { immediate: true },
);

watch(
  () => props.track?.title,
  async () => {
    await nextTick();
    checkTitleOverflow();
  },
  { immediate: true },
);

watch(titleRef, (el) => {
  if (resizeObs) {
    resizeObs.disconnect();
    resizeObs = null;
  }
  if (el && typeof ResizeObserver !== "undefined") {
    resizeObs = new ResizeObserver(() => checkTitleOverflow());
    resizeObs.observe(el);
    if (el.parentElement) resizeObs.observe(el.parentElement);
  }
});

onBeforeUnmount(() => {
  if (resizeObs) resizeObs.disconnect();
});

function extractDominantColor(imageUrl) {
  if (!imageUrl || !canvasRef.value) {
    dominantColor.value = "rgba(20, 20, 24, 1)";
    accentColor.value = "rgba(80, 80, 90, 1)";
    return;
  }

  const canvas = canvasRef.value;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageUrl;

  img.onload = () => {
    try {
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 16) {
        // Skip fully transparent pixels
        if (data[i + 3] < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count === 0) return;
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      // Accent = brighter version of the average
      accentColor.value = `rgba(${r}, ${g}, ${b}, 1)`;
      // Dominant = darkened for background contrast
      const dark = 0.45;
      dominantColor.value = `rgba(${Math.round(r * dark)}, ${Math.round(g * dark)}, ${Math.round(b * dark)}, 1)`;
    } catch {
      /* CORS or drawing error — keep defaults */
    }
  };

  img.onerror = () => {
    dominantColor.value = "rgba(20, 20, 24, 1)";
    accentColor.value = "rgba(80, 80, 90, 1)";
  };
}

watch(
  cover,
  (newCover) => {
    extractDominantColor(newCover);
  },
  { immediate: true },
);

const playerBackgroundStyle = computed(() => ({
  background: `radial-gradient(circle at 20% 0%, ${accentColor.value} 0%, ${dominantColor.value} 55%, #000 100%)`,
  transition: "background 0.8s ease-in-out",
}));

// Upgrade thumbnail URL to the highest available resolution.
function getHighResCover(url) {
  return upgradeThumbUrl(url);
}

// Effective lyrics offset: per-track > global. Reaktywne na zmianę.
const lyricsOffset = computed(() => {
  void lyricsOffsetState.global;
  void lyricsOffsetState.perTrack;
  return getEffectiveOffset(props.track?.videoId);
});

// Compute active lyric line based on current time + offset.
const activeLyricIndex = computed(() => {
  if (!timedLyrics.value.length) return -1;
  const visibleTime = props.currentTime + lyricsOffset.value;
  let index = 0;
  for (let i = 0; i < timedLyrics.value.length; i += 1) {
    if (timedLyrics.value[i].time <= visibleTime + 0.2) index = i;
  }
  return index;
});

const lyricsFollowMode = computed(() => app?.lyricsFollowMode?.value ?? true);

function toggleLyricsFollow() {
  if (app?.lyricsFollowMode) {
    app.lyricsFollowMode.value = !app.lyricsFollowMode.value;
  }
}

// Fetch lyrics when track changes or lyrics section is opened
watch(
  () => [showLyrics.value, props.track?.videoId, props.track?.title],
  async ([isVisible]) => {
    if (!isVisible || !props.track) return;
    lyricsLoading.value = true;
    plainLyrics.value = "";
    timedLyrics.value = [];
    try {
      const params = new URLSearchParams();
      if (props.track.videoId) params.set("videoId", props.track.videoId);
      if (props.track.title) params.set("title", props.track.title);
      if (props.track.artist) params.set("artist", props.track.artist);
      const data = await fetchJson(`/api/lyrics?${params.toString()}`, { timeout: 12000 });
      const text = data.syncedLyrics || data.lyrics || data.plainLyrics || "";
      timedLyrics.value = parseTimedLyrics(text);
      plainLyrics.value = timedLyrics.value.length ? "" : text;
      if (lyricsContainerRef.value) lyricsContainerRef.value.scrollTop = 0;
    } catch (error) {
      plainLyrics.value = error.message;
    } finally {
      lyricsLoading.value = false;
    }
  },
);

// Auto-scroll to active lyric line
watch(
  () => [showLyrics.value, props.currentTime, timedLyrics.value.length, lyricsFollowMode.value],
  () => {
    if (!showLyrics.value || !lyricsFollowMode.value || !timedLyrics.value.length) return;
    scrollToActiveLyric(activeLyricIndex.value);
  },
  { flush: "post" },
);

function scrollToActiveLyric(index) {
  if (!lyricsContainerRef.value || index < 0) return;
  const el = lyricsContainerRef.value.querySelector(`[data-index="${index}"]`);
  if (!el) return;
  const containerHeight = lyricsContainerRef.value.clientHeight;
  const targetTop = el.offsetTop - containerHeight / 2 + el.offsetHeight / 2;
  lyricsContainerRef.value.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}

function parseTimedLyrics(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
      if (!match) return null;
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const millis = Number((match[3] || "0").padEnd(3, "0"));
      return { time: minutes * 60 + seconds + millis / 1000, text: match[4] || "…" };
    })
    .filter(Boolean);
}
</script>

<style scoped>
.full-player {
  position: fixed;
  inset: 0;
  z-index: 270;
  display: flex;
  flex-direction: column;
  color: #fff;
  background: #000;
  overflow: hidden;
}

.dynamic-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-image {
  position: absolute;
  inset: -10%;
  width: 120%;
  height: 120%;
  object-fit: cover;
  filter: blur(80px) saturate(160%) brightness(0.55);
  transform: scale(1.1);
  transition: opacity 1s ease-in-out;
  opacity: 0.85;
  pointer-events: none;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.55) 100%),
    radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.35) 100%);
}

.bg-art,
.bg-tint {
  display: none;
}

.full-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 4px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.full-header .icon-btn {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}

.full-header .icon-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.hdr-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: 0 12px;
}

.hdr-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
}

.hdr-title {
  font-size: 13px;
  font-weight: 600;
  margin: 1px 0 0;
  text-align: center;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.full-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 32px 32px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}

.player-main {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  flex: 1;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}

.right-panel {
  flex: 0 0 380px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  align-self: stretch;
}

.lyrics-panel {
  flex: 1;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  overflow: hidden;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.album-frame {
  display: flex;
  justify-content: center;
}

.album-cover {
  width: 100%;
  max-width: 360px;
  aspect-ratio: 1 / 1;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.6),
    0 8px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  transform: scale(0.92);
  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 400ms ease;
  will-change: transform;
}

.album-cover.is-playing {
  transform: scale(1);
  box-shadow:
    0 40px 100px rgba(0, 0, 0, 0.65),
    0 12px 32px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  animation: cover-fade-in 400ms ease both;
  image-rendering: auto;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

@keyframes cover-fade-in {
  from {
    opacity: 0;
    transform: scale(1.04);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.track-text {
  text-align: left;
  min-width: 0;
  animation: text-fade-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes text-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.track-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: #fff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.track-title.marquee {
  display: block;
  -webkit-line-clamp: unset;
  line-clamp: unset;
  overflow: hidden;
  white-space: nowrap;
  position: relative;
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}

.track-title-inner {
  display: inline-block;
  will-change: transform;
}

.track-title.marquee .track-title-inner {
  animation: title-marquee 14s linear infinite;
  padding-right: 48px;
}

@keyframes title-marquee {
  0% {
    transform: translateX(0);
  }
  10% {
    transform: translateX(0);
  }
  90% {
    transform: translateX(calc(-100% + 320px));
  }
  100% {
    transform: translateX(calc(-100% + 320px));
  }
}

.track-artist {
  margin: 6px 0 0;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.78);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-progress .am-slider {
  height: 18px;
}

.track-progress .am-slider::-webkit-slider-runnable-track {
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.85) 0%,
    rgba(255, 255, 255, 0.85) var(--progress, 0%),
    rgba(255, 255, 255, 0.18) var(--progress, 0%),
    rgba(255, 255, 255, 0.18) 100%
  );
}

.track-progress .am-slider::-moz-range-track {
  background: rgba(255, 255, 255, 0.18);
}

.track-progress .am-slider::-moz-range-progress {
  background: rgba(255, 255, 255, 0.85);
}

.time-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.55);
  margin-top: -4px;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.ctrl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.85);
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.ctrl:hover {
  color: #fff;
}

.ctrl:active {
  transform: scale(0.92);
}

.big-play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff;
  color: #000;
  transition: transform var(--transition-fast);
}

.big-play:hover {
  transform: scale(1.05);
}

.big-play:active {
  transform: scale(0.95);
}

.bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.volume {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 200px;
}

.volume input {
  flex: 1;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.ctrl-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.ctrl-sm:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.visualizer-section {
  margin-top: 16px;
  width: 100%;
}

.comments-section {
  margin-top: 16px;
  width: 100%;
}

/* Lyrics Panel */
.lyrics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
  gap: 8px;
}

.lyrics-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.lyrics-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.lyrics-follow-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background var(--transition-fast), color var(--transition-fast);
  white-space: nowrap;
}

.lyrics-follow-btn.active {
  color: var(--primary);
  background: rgba(var(--primary-rgb), 0.15);
  border-color: rgba(var(--primary-rgb), 0.3);
}

.follow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.lyrics-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.4);
  transition: background var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}

.lyrics-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.lyrics-body-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.lyrics-content {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 48px 20px 64px;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.lyrics-content::-webkit-scrollbar {
  display: none;
}

.lyrics-fade-top,
.lyrics-fade-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 64px;
  pointer-events: none;
  z-index: 2;
}

.lyrics-fade-top {
  top: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
}

.lyrics-fade-bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
}

.lyrics-loading,
.lyrics-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  font-weight: 500;
}

.loading-dots {
  display: flex;
  gap: 7px;
}

.loading-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  animation: dot-bounce 1.2s ease-in-out infinite;
}

.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30% { transform: translateY(-7px); opacity: 1; }
}

.lyrics-lines {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
}

/* No font-size transition — causes layout reflow every beat.
   Use only opacity + transform (GPU-composited, zero reflow). */
.lyric-line {
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.55;
  padding: 10px 12px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.18);
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  transform-origin: center;
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1),
    background 0.2s ease;
  will-change: transform, opacity;
}

.lyric-line:hover {
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
}

.lyric-line.is-past {
  opacity: 0.45;
  transform: scale(0.97);
}

.lyric-line.is-future {
  opacity: 0.22;
  transform: scale(0.97);
}

.lyric-line.is-active {
  color: #fff;
  font-weight: 800;
  opacity: 1;
  transform: scale(1.04);
  text-shadow: 0 0 28px rgba(var(--primary-rgb, 255,255,255), 0.55);
  background: rgba(255, 255, 255, 0.05);
}

.lyrics-plain {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.01em;
  text-align: center;
}

/* Responsive layout */
@media (max-width: 900px) {
  .player-main {
    flex-direction: column;
    align-items: stretch;
  }

  .right-panel {
    flex: none;
    width: 100%;
    align-self: auto;
  }

  .lyrics-panel {
    min-height: 320px;
    max-height: 420px;
  }

  .full-body {
    max-width: 600px;
    padding: 16px 20px 24px;
  }

  .album-cover { max-width: 280px; }
  .track-title { font-size: 20px; }
  .track-artist { font-size: 14px; }
  .controls { gap: 16px; }
  .big-play { width: 56px; height: 56px; }
  .ctrl { width: 40px; height: 40px; }
}

@media (max-width: 480px) {
  .full-body {
    padding: 12px 16px 20px;
    gap: 16px;
  }

  .album-cover { max-width: 240px; }
  .track-title { font-size: 18px; }
  .track-artist { font-size: 13px; }

  .bottom-row {
    flex-direction: column;
    gap: 12px;
  }

  .volume { max-width: 100%; }
  .row-actions { justify-content: center; flex-wrap: wrap; }
  .ctrl-sm { width: 36px; height: 36px; }
  .full-header { padding: 12px 16px 4px; }

  .lyrics-panel {
    min-height: 280px;
    max-height: 360px;
  }

  .lyric-line { font-size: 16px; }
}

.sponsor-segments {
  position: relative;
  height: 4px;
  margin-top: 4px;
}

.segment-marker {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(255, 0, 0, 0.6);
  border-radius: 2px;
  cursor: pointer;
}

/* ────────────────────────────────────────────────────────────────────────
   Minimalistyczny tryb — duże przyciski, ukryta sidebar, więcej oddechu
   ──────────────────────────────────────────────────────────────────────── */
.full-player.is-minimal .hdr-eyebrow,
.full-player.is-minimal .hdr-title,
.full-player.is-minimal .row-actions,
.full-player.is-minimal .visualizer-section,
.full-player.is-minimal .comments-section,
.full-player.is-minimal .right-panel,
.full-player.is-minimal .dislikes,
.full-player.is-minimal .sponsor-segments,
.full-player.is-minimal .volume {
  display: none !important;
}

.full-player.is-minimal .hdr-meta {
  visibility: hidden; /* zachowaj zarezerwowaną przestrzeń aby header miał wyśrodkowany przycisk */
}

.full-player.is-minimal .left-panel {
  max-width: 580px;
  margin: 0 auto;
  padding: 0 24px;
}

.full-player.is-minimal .album-frame {
  margin-top: 4vh;
}

.full-player.is-minimal .album-cover img {
  border-radius: 16px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
}

.full-player.is-minimal .track-text {
  text-align: center;
  margin-top: 32px;
}

.full-player.is-minimal .track-title {
  font-size: clamp(22px, 4.5vw, 36px);
  text-align: center;
}

.full-player.is-minimal .track-artist {
  font-size: 16px;
  text-align: center;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.78);
}

.full-player.is-minimal .controls {
  margin-top: 36px;
  gap: clamp(20px, 5vw, 56px);
}

.full-player.is-minimal .ctrl {
  width: 56px;
  height: 56px;
  font-size: 22px;
}

.full-player.is-minimal .big-play {
  width: 88px;
  height: 88px;
  font-size: 28px;
}

.full-player.is-minimal .bottom-row {
  margin-top: 40px;
  justify-content: center;
}

@media (max-width: 720px) {
  .full-player.is-minimal .controls {
    gap: 28px;
  }
  .full-player.is-minimal .ctrl { width: 48px; height: 48px; }
  .full-player.is-minimal .big-play { width: 76px; height: 76px; }
}
</style>
