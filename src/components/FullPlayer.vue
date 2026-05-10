<template>
  <div class="full-player" @click.self="$emit('close')">
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
      <div class="w-9" />
    </header>

    <div class="full-body">
      <div class="player-main">
        <div class="left-panel">
          <div class="album-frame">
            <div class="album-cover" :class="{ 'is-playing': isPlaying }">
              <img v-if="cover" :src="getHighResCover(cover)" alt="" :key="cover" />
              <Music v-else :size="80" :style="{ color: 'var(--text-tertiary)' }" />
            </div>
          </div>

          <div class="track-text" :key="track?.videoId || track?.title">
            <h2 class="track-title" :class="{ 'marquee': titleOverflows }">
              <span class="track-title-inner" ref="titleRef">{{ track?.title }}</span>
            </h2>
            <p class="track-artist">{{ artist }}</p>
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
              <button class="ctrl-sm" type="button" :title="t('timestampComments')" @click="showComments = !showComments">
                <MessageSquare :size="22" />
              </button>
              <button class="ctrl-sm" type="button" :title="t('audioVisualizer')" @click="showVisualizer = !showVisualizer">
                ≈
              </button>
              <button class="ctrl-sm" type="button" :title="t('lyrics')" @click="showLyrics = !showLyrics">
                <Captions :size="22" :style="showLyrics ? 'color: var(--primary)' : ''" />
              </button>
              <button class="ctrl-sm" type="button" :title="t('queue')" @click="$emit('queue')">
                <ListMusic :size="22" />
              </button>
              <button class="ctrl-sm" type="button" :title="t('favorites')" @click="$emit('toggle-favorite')">
                <Heart :size="22" :fill="favorite ? 'var(--primary)' : 'none'" :style="favorite ? 'color: var(--primary)' : ''" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="showLyrics" class="right-panel lyrics-panel">
          <div class="lyrics-header">
            <h3 class="lyrics-title">{{ t('lyrics') }}</h3>
            <button class="lyrics-toggle" type="button" @click="showLyrics = false">
              <X :size="18" />
            </button>
          </div>
          <div ref="lyricsContainerRef" class="lyrics-content custom-scroll">
            <div v-if="lyricsLoading" class="lyrics-loading">{{ t('searching') }}</div>
            <div v-else-if="timedLyrics.length" class="lyrics-lines">
              <button
                v-for="(line, index) in timedLyrics"
                :key="`${line.time}-${index}`"
                class="lyric-line"
                :class="{ 'is-active': activeLyricIndex === index }"
                type="button"
                @click="$emit('seek', line.time)"
              >
                {{ line.text }}
              </button>
            </div>
            <pre v-else-if="plainLyrics" class="lyrics-plain">{{ plainLyrics }}</pre>
            <div v-else class="lyrics-empty">{{ t('emptyData') }}</div>
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
  Heart,
  ListMusic,
  MessageSquare,
  Music,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-vue-next";
import AudioVisualizer from "./AudioVisualizer.vue";
import TrackComments from "./TrackComments.vue";
import { formatClock } from "../lib/format";
import { fetchJson } from "../lib/api";

const props = defineProps({
  track: { type: Object, required: true },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  volume: { type: Number, default: 80 },
  shuffle: { type: Boolean, default: false },
  repeatMode: { type: String, default: "none" },
  favorite: { type: Boolean, default: false },
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
// Default: neutral deep bg — overridden by extracted dominant color
const dominantColor = ref("rgba(20, 20, 24, 1)");
const accentColor = ref("rgba(80, 80, 90, 1)");

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

// Get high-resolution cover art URL
function getHighResCover(url) {
  if (!url) return url;
  
  const upgrades = [
    ['default.jpg', 'maxresdefault.jpg'],
    ['mqdefault.jpg', 'maxresdefault.jpg'],
    ['hqdefault.jpg', 'maxresdefault.jpg'],
    ['sddefault.jpg', 'maxresdefault.jpg'],
    ['w120', 'w544-h544'],
    ['w226', 'w544-h544'],
    ['s192', 's544'],
  ];
  
  let upgraded = url;
  for (const [from, to] of upgrades) {
    if (upgraded.includes(from)) {
      upgraded = upgraded.replace(from, to);
      break;
    }
  }
  
  return upgraded;
}

// Compute active lyric line based on current time
const activeLyricIndex = computed(() => {
  if (!timedLyrics.value.length) return -1;
  let index = 0;
  for (let i = 0; i < timedLyrics.value.length; i += 1) {
    if (timedLyrics.value[i].time <= props.currentTime + 0.2) index = i;
  }
  return index;
});

const lyricsFollowMode = computed(() => app?.lyricsFollowMode?.value ?? true);

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
  const el = lyricsContainerRef.value.querySelector(`.lyric-line:nth-child(${index + 1})`);
  if (!el) return;
  const top = el.offsetTop;
  const bottom = top + el.offsetHeight;
  const viewTop = lyricsContainerRef.value.scrollTop;
  const viewBottom = viewTop + lyricsContainerRef.value.clientHeight;
  if (top < viewTop + 24) {
    lyricsContainerRef.value.scrollTop = Math.max(0, top - 24);
  } else if (bottom > viewBottom - 24) {
    lyricsContainerRef.value.scrollTop = Math.max(0, bottom - lyricsContainerRef.value.clientHeight + 24);
  }
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
  overflow-y: auto;
  overflow-x: hidden;
  background: #000;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

.dynamic-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
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
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 20px;
  padding: 20px 32px 32px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.player-main {
  display: flex;
  gap: 32px;
  align-items: stretch;
  min-height: 0;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 22px;
  min-width: 0;
}

.right-panel {
  flex: 0 0 420px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.lyrics-panel {
  max-height: 600px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.album-frame {
  display: flex;
  justify-content: center;
}

.album-cover {
  width: 100%;
  max-width: 360px;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.55);
  transform: scale(0.92);
  transition: transform 350ms cubic-bezier(0.4, 0, 0.2, 1);
}

.album-cover.is-playing {
  transform: scale(1);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: cover-fade-in 500ms ease both;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  -ms-interpolation-mode: bicubic;
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

/* Inline Lyrics Styles */
.lyrics-section {
  margin-top: 20px;
  width: 100%;
  max-height: 320px;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.lyrics-panel .lyrics-header {
  padding: 16px 20px;
}

.lyrics-panel .lyrics-content {
  padding: 20px;
  max-height: 520px;
}

.lyrics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}

.lyrics-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #fff;
}

.lyrics-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.5);
  transition: all var(--transition-fast);
}

.lyrics-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: scale(1.05);
}

.lyrics-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px;
  scroll-behavior: smooth;
}

.lyrics-content::-webkit-scrollbar {
  width: 5px;
}

.lyrics-content::-webkit-scrollbar-track {
  background: transparent;
}

.lyrics-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

.lyrics-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

.lyrics-loading,
.lyrics-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  font-weight: 500;
}

.lyrics-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lyric-line {
  text-align: left;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.65;
  padding: 8px 12px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.35);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  position: relative;
  overflow: hidden;
}

.lyric-line::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(var(--primary-rgb, 255, 255, 255), 0.08) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.25s;
}

.lyric-line:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.65);
  transform: translateX(3px);
}

.lyric-line:hover::before {
  opacity: 1;
}

.lyric-line.is-active {
  color: #fff;
  background: rgba(var(--primary-rgb, 255, 255, 255), 0.15);
  font-weight: 700;
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(var(--primary-rgb, 255, 255, 255), 0.12);
}

.lyric-line.is-active::before {
  opacity: 1;
}

.lyrics-plain {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.01em;
}

/* Responsive layout */
@media (max-width: 900px) {
  .player-main {
    flex-direction: column;
  }

  .right-panel {
    flex: none;
    width: 100%;
  }

  .lyrics-panel {
    max-height: 400px;
  }

  .lyrics-panel .lyrics-content {
    max-height: 320px;
  }

  .full-body {
    max-width: 600px;
    padding: 16px 20px 24px;
  }

  .album-cover {
    max-width: 280px;
  }
  
  .track-title {
    font-size: 20px;
  }
  
  .track-artist {
    font-size: 14px;
  }
  
  .controls {
    gap: 16px;
  }
  
  .big-play {
    width: 56px;
    height: 56px;
  }
  
  .ctrl {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 480px) {
  .full-body {
    padding: 12px 16px 20px;
    gap: 16px;
  }
  
  .album-cover {
    max-width: 240px;
  }
  
  .track-title {
    font-size: 18px;
  }
  
  .track-artist {
    font-size: 13px;
  }
  
  .bottom-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .volume {
    max-width: 100%;
  }
  
  .row-actions {
    justify-content: center;
  }
  
  .ctrl-sm {
    width: 36px;
    height: 36px;
  }
  
  .full-header {
    padding: 12px 16px 4px;
  }
  
  .lyrics-panel {
    max-height: 350px;
  }
  
  .lyric-line {
    font-size: 15px;
  }
}
</style>
