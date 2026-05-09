<template>
  <div class="full-player animate-fade" @click.self="$emit('close')">
    <!-- Blurred album-art background -->
    <div class="bg-art" aria-hidden="true">
      <img v-if="cover" :src="cover" alt="" />
      <div class="bg-tint" />
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
      <div class="album-frame">
        <div class="album-cover" :class="{ 'is-playing': isPlaying }">
          <img v-if="cover" :src="cover" alt="" />
          <Music v-else :size="80" :style="{ color: 'var(--text-tertiary)' }" />
        </div>
      </div>

      <div class="track-text">
        <h2 class="track-title">{{ track?.title }}</h2>
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
          <button class="ctrl-sm" type="button" :title="t('lyrics')" @click="$emit('lyrics')">
            <Captions :size="22" />
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
  </div>
</template>

<script setup>
import { computed, inject } from "vue";
import {
  Captions,
  ChevronDown,
  Heart,
  ListMusic,
  Music,
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
</script>

<style scoped>
.full-player {
  position: fixed;
  inset: 0;
  z-index: 270;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
}

.bg-art {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.bg-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(70px) saturate(140%);
  transform: scale(1.2);
  opacity: 0.55;
}

.bg-tint {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 80% at 50% 0%, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.85) 100%);
  backdrop-filter: brightness(0.7);
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
}

.full-header .icon-btn:hover {
  background: rgba(255, 255, 255, 0.18);
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
}

.full-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 24px;
  padding: 20px 28px 32px;
  max-width: 460px;
  margin: 0 auto;
  width: 100%;
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
}

.track-text {
  text-align: left;
}

.track-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.track-artist {
  margin: 4px 0 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--primary);
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
</style>
