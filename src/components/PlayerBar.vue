<template>
  <section class="player-bar fixed inset-x-0 bottom-0 z-[200] lg:left-[260px]">
    <div class="player-inner">
      <!-- Progress strip on top edge -->
      <div class="progress-strip">
        <input
          type="range"
          min="0"
          :max="safeDuration"
          step="1"
          :value="currentTime"
          class="am-slider strip"
          :style="{ '--progress': `${progressPercent}%` }"
          :aria-label="t('expandPlayer')"
          @input="$emit('seek', Number($event.target.value))"
        />
      </div>

      <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 py-3">
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
              <span class="title">{{ track?.title }}</span>
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
            <button class="play-btn" type="button" :title="isPlaying ? t('pause') : t('play')" @click="$emit('toggle-play')">
              <Pause v-if="isPlaying" :size="20" fill="currentColor" />
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
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject } from "vue";
import {
  Captions,
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

const props = defineProps({
  track: { type: Object, required: true },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  volume: { type: Number, default: 80 },
  shuffle: { type: Boolean, default: false },
  repeatMode: { type: String, default: "none" },
  favorite: { type: Boolean, default: false },
});

defineEmits([
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
.player-bar {
  background: var(--bg-player);
  backdrop-filter: var(--glass);
  -webkit-backdrop-filter: var(--glass);
  border-top: 1px solid var(--line);
}

.player-inner {
  position: relative;
}

.progress-strip {
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  pointer-events: auto;
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
  transition: transform var(--transition-fast);
}

.play-btn:hover {
  transform: scale(1.06);
}

.play-btn:active {
  transform: scale(0.96);
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
</style>
