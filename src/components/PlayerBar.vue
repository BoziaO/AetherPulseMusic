<template>
  <section
    class="player-bar fixed inset-x-0 bottom-0 z-[200] lg:left-[260px]"
    :class="{ 'is-minimized': minimized }"
  >
    <div class="player-inner">
      <!-- Progress strip on top edge -->
      <div class="progress-strip">
        <input
          type="range"
          min="0"
          :max="safeDuration"
          step="1"
          :value="props.currentTime"
          class="am-slider strip"
          :style="{ '--progress': `${progressPercent}%` }"
          :aria-label="t('expandPlayer')"
          @input="seekTo(Number($event.target.value))"
        />
      </div>

      <!-- Full player (shown when not minimized) -->
      <div v-show="!minimized" class="player-full">
         <!-- Track info -->
         <div class="track-info">
           <button
             class="track-trigger"
             type="button"
             :title="t('expandPlayer')"
             @click="$emit('expand')"
           >
             <span class="cover">
               <img v-if="cover" :src="cover" alt="" loading="lazy" />
               <Music2 v-else :size="20" :style="{ color: 'var(--text-tertiary)' }" />
             </span>
             <span class="meta">
               <span class="title" :class="{ 'title-marquee': titleNeedsMarquee }">
                 <span class="title-inner" ref="titleInnerRef">{{ track?.title }}</span>
               </span>
               <span class="artist">{{ artist }}</span>
             </span>
           </button>
           <button
             class="icon-btn fav-btn"
             type="button"
             :title="t('favorites')"
             @click.stop="$emit('toggle-favorite')"
           >
             <Heart
               :size="18"
               :fill="favorite ? 'var(--primary)' : 'none'"
               :style="{ color: favorite ? 'var(--primary)' : 'var(--text-secondary)' }"
             />
           </button>
         </div>

         <!-- Center controls + time -->
         <div class="center">
           <div class="flex items-center gap-2">
             <button class="icon-btn" type="button" :title="t('shuffle')" @click="$emit('shuffle')">
               <Shuffle :size="16" :style="shuffle ? 'color: var(--primary)' : ''" />
             </button>
             <button class="icon-btn" type="button" :title="t('previous')" @click="$emit('prev')">
               <SkipBack :size="20" fill="currentColor" />
             </button>
             <button
               class="play-btn"
               :class="{ 'is-playing': props.isPlaying }"
               type="button"
               :title="props.isPlaying ? t('pause') : t('play')"
               @click="togglePlay()"
             >
               <Pause v-if="props.isPlaying" :size="20" fill="currentColor" />
               <Play v-else :size="20" fill="currentColor" class="translate-x-[1px]" />
             </button>
             <button class="icon-btn" type="button" :title="t('next')" @click="$emit('next')">
               <SkipForward :size="20" fill="currentColor" />
             </button>
             <button class="icon-btn relative-btn" type="button" :title="t('repeat')" @click="$emit('repeat')">
               <Repeat :size="16" :style="repeatMode !== 'none' ? 'color: var(--primary)' : ''" />
               <span v-if="repeatMode === 'one'" class="repeat-one">1</span>
             </button>
           </div>
           <div class="time-row">
             <span>{{ formatClock(currentTime) }}</span>
             <span>-{{ formatClock(Math.max(0, safeDuration - currentTime)) }}</span>
           </div>
         </div>

         <!-- Right controls -->
         <div class="right">
           <button class="icon-btn hidden md:inline-flex" type="button" :title="t('download')" @click="handleDownload">
             <Download :size="18" :style="isDownloaded(track?.videoId) ? 'color: var(--success)' : ''" />
           </button>
           <button class="icon-btn hidden md:inline-flex" type="button" :title="t('lyrics')" @click="$emit('lyrics')">
             <Captions :size="18" />
           </button>
           <button class="icon-btn" type="button" :title="t('queue')" @click="$emit('queue')">
             <ListMusic :size="18" />
           </button>
           <div class="volume hidden md:flex">
             <Volume2 v-if="volume > 0" :size="16" :style="{ color: 'var(--text-secondary)' }" />
             <VolumeX v-else :size="16" :style="{ color: 'var(--text-secondary)' }" />
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
           <button class="icon-btn" type="button" :title="t('collapsePlayer')" @click="$emit('minimize')">
             <ChevronDown :size="18" />
           </button>
         </div>
       </div>

       <!-- Minimized mini-player: compact pill with cover, title and essentials -->
       <div v-show="minimized" class="player-mini">
         <button
           class="mini-trigger"
           type="button"
           :title="t('expandPlayer')"
           @click="$emit('expand')"
         >
           <span class="mini-cover" :class="{ 'is-playing': isPlaying }">
             <img v-if="cover" :src="cover" alt="" loading="lazy" />
             <Music2 v-else :size="14" :style="{ color: 'var(--text-tertiary)' }" />
           </span>
           <span class="mini-meta">
             <span class="mini-title">{{ track?.title }}</span>
             <span class="mini-artist">{{ artist }}</span>
           </span>
         </button>
         <div class="mini-controls">
           <button
             class="icon-btn"
             type="button"
             :title="t('previous')"
             @click.stop="$emit('prev')"
           >
             <SkipBack :size="16" fill="currentColor" />
           </button>
           <button
             class="play-btn mini-play"
             :class="{ 'is-playing': props.isPlaying }"
             type="button"
             :title="props.isPlaying ? t('pause') : t('play')"
             @click.stop="togglePlay()"
           >
             <Pause v-if="props.isPlaying" :size="16" fill="currentColor" />
             <Play v-else :size="16" fill="currentColor" class="translate-x-[1px]" />
           </button>
           <button
             class="icon-btn"
             type="button"
             :title="t('next')"
             @click.stop="$emit('next')"
           >
             <SkipForward :size="16" fill="currentColor" />
           </button>
           <button
             class="icon-btn"
             type="button"
             :title="t('expandPlayer')"
             @click.stop="$emit('minimize')"
           >
             <ChevronUp :size="16" />
           </button>
         </div>
       </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  Captions,
  ChevronDown,
  ChevronUp,
  Download,
  Heart,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-vue-next";
import { formatClock } from "../lib/format";
import { isDownloaded, enqueueDownload, removeDownload, settings as offlineSettings } from "../lib/offlineStore";

const titleInnerRef = ref(null);
const titleNeedsMarquee = ref(false);

let titleResizeObs = null;

function checkTitleMarquee() {
  const el = titleInnerRef.value;
  if (!el) { titleNeedsMarquee.value = false; return; }
  const parent = el.parentElement;
  if (!parent) return;
  titleNeedsMarquee.value = el.scrollWidth > parent.clientWidth + 2;
}

watch(titleInnerRef, (el) => {
  if (titleResizeObs) { titleResizeObs.disconnect(); titleResizeObs = null; }
  if (el && typeof ResizeObserver !== "undefined") {
    titleResizeObs = new ResizeObserver(() => checkTitleMarquee());
    titleResizeObs.observe(el);
    if (el.parentElement) titleResizeObs.observe(el.parentElement);
  }
});

onBeforeUnmount(() => { if (titleResizeObs) titleResizeObs.disconnect(); });

const props = defineProps({
  track: { type: Object, required: true },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  volume: { type: Number, default: 80 },
  shuffle: { type: Boolean, default: false },
  repeatMode: { type: String, default: "none" },
  favorite: { type: Boolean, default: false },
  minimized: { type: Boolean, default: false },
});

const emit = defineEmits([
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
  "expand",
  "minimize",
]);

const app = inject("appState");

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

function togglePlay() {
  emit('toggle-play');
}

function seekTo(position) {
  emit('seek', position);
}
</script>

<style scoped>
.player-bar {
  background: var(--bg-player);
  backdrop-filter: var(--glass);
  -webkit-backdrop-filter: var(--glass);
  border-top: 1px solid var(--line);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.25);
  animation: bar-rise 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes bar-rise {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.player-inner {
  position: relative;
  transition: padding var(--transition-base);
}

.progress-strip {
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  pointer-events: auto;
  z-index: 2;
}

.progress-strip .strip {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
  margin: 0;
}

.progress-strip .strip::-webkit-slider-runnable-track {
  height: 4px;
}

/* Full-bar layout (not minimized) */
.player-full {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  animation: fade-swap 260ms ease both;
}

@keyframes fade-swap {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.track-info {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.track-trigger {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
  padding: 4px;
  flex: 1;
  min-width: 0;
  transition: background var(--transition-fast);
}

.track-trigger:hover {
  background: var(--bg-hover);
}

.cover {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta {
  min-width: 0;
}

.title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.title.title-marquee {
  text-overflow: clip;
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 85%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 85%, transparent);
}

.title-inner {
  display: inline-block;
}

.title.title-marquee .title-inner {
  animation: bar-title-scroll 12s linear infinite;
  padding-right: 40px;
}

@keyframes bar-title-scroll {
  0%, 10%  { transform: translateX(0); }
  90%, 100% { transform: translateX(calc(-100% + 120px)); }
}

.artist {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-btn {
  width: 32px;
  height: 32px;
}

.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.time-row {
  display: flex;
  gap: 12px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
}

.play-btn {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--text-primary);
  color: var(--bg-base);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.play-btn:hover {
  transform: scale(1.06);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}

.play-btn:active {
  transform: scale(0.96);
}

.play-btn.is-playing {
  box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.35);
  animation: play-pulse 2.4s ease-in-out infinite;
}

@keyframes play-pulse {
  0%, 100% {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(var(--primary-rgb), 0.35);
  }
  50% {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2), 0 0 0 6px rgba(var(--primary-rgb), 0);
  }
}

.relative-btn {
  position: relative;
}

.repeat-one {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 9px;
  font-weight: 700;
  color: var(--primary);
  pointer-events: none;
}

.right {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.volume {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 130px;
}

.volume input {
  flex: 1;
}

@media (max-width: 700px) {
  .center .time-row {
    display: none;
  }
}

@media (max-width: 600px) {
  .player-full {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 6px;
    padding: 8px 12px 10px;
  }

  .track-info {
    grid-column: 1;
    grid-row: 1;
  }

  .right {
    grid-column: 2;
    grid-row: 1;
    align-self: center;
  }

  .center {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: center;
  }

  .volume {
    display: none !important;
  }
}

/* ============================================================
   Minimized / mini-player styling (compact pill)
   ============================================================ */
.player-bar.is-minimized {
  background: var(--bg-player);
  border-top: 1px solid var(--line);
}

.player-mini {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 8px 12px;
  min-height: 56px;
  animation: fade-swap 260ms ease both;
}

.mini-trigger {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  text-align: left;
  min-width: 0;
  padding: 4px 6px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.mini-trigger:hover {
  background: var(--bg-hover);
}

.mini-cover {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-card);
  flex-shrink: 0;
}

.mini-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.mini-cover.is-playing img {
  animation: mini-cover-breathe 4s ease-in-out infinite;
}

@keyframes mini-cover-breathe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.mini-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}

.mini-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.mini-artist {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.mini-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.mini-controls .icon-btn {
  width: 32px;
  height: 32px;
}

.play-btn.mini-play {
  width: 34px;
  height: 34px;
}

@media (max-width: 480px) {
  .mini-controls .icon-btn:not(.mini-play):nth-child(1),
  .mini-controls .icon-btn:not(.mini-play):nth-child(3) {
    display: none;
  }
}
</style>
