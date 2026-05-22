<template>
  <section class="player-bar fixed inset-x-0 bottom-0 z-[200] lg:left-[260px]">
    <div class="player-inner">
      <div class="player-content">
        <!-- Track info (Left) -->
        <div class="track-section">
          <div class="track-art">
            <img v-if="cover" :src="cover" alt="" class="rounded-lg shadow-lg" />
            <div v-else class="placeholder rounded-lg"><Music2 :size="20" /></div>
          </div>
          <div class="track-meta min-w-0">
            <div class="track-title truncate">{{ track?.title }}</div>
            <div class="track-artist truncate">{{ artist }}</div>
          </div>
        </div>

        <!-- Controls & Progress (Center) -->
        <div class="playback-section">
          <div class="controls">
            <button class="control-btn" :class="{ active: shuffle }" @click="$emit('shuffle')"><Shuffle :size="16" /></button>
            <button class="control-btn" @click="$emit('prev')"><SkipBack :size="20" fill="currentColor" /></button>
            <button class="play-pause-btn" @click="$emit('toggle-play')">
              <Pause v-if="isPlaying" :size="24" fill="currentColor" />
              <Play v-else :size="24" fill="currentColor" class="ml-1" />
            </button>
            <button class="control-btn" @click="$emit('next')"><SkipForward :size="20" fill="currentColor" /></button>
            <button class="control-btn" :class="{ active: repeatMode !== 'none' }" @click="$emit('repeat')">
              <Repeat :size="16" />
              <span v-if="repeatMode === 'one'" class="repeat-one">1</span>
            </button>
          </div>
          <div class="progress-container">
            <span class="time">{{ formatClock(currentTime) }}</span>
            <div class="progress-track" @click="handleSeek">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              <div class="progress-handle" :style="{ left: progressPercent + '%' }"></div>
            </div>
            <span class="time">{{ formatClock(safeDuration) }}</span>
          </div>
        </div>

        <!-- Extra Controls (Right) -->
        <div class="extra-section">
          <button class="icon-btn" @click="$emit('lyrics')"><Mic2 :size="18" /></button>
          <button class="icon-btn" @click="$emit('queue')"><ListMusic :size="18" /></button>
          <div class="volume-container">
            <Volume2 :size="18" class="opacity-50" />
            <div class="volume-track">
              <input 
                type="range" 
                min="0" max="100" 
                :value="volume" 
                class="volume-slider" 
                @input="$emit('volume', Number($event.target.value))"
              />
            </div>
          </div>
          <button class="icon-btn" @click="$emit('expand')"><Maximize2 :size="18" /></button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { 
  Heart, 
  ListMusic, 
  Maximize2, 
  Mic2, 
  Music2, 
  Pause, 
  Play, 
  Repeat, 
  Shuffle, 
  SkipBack, 
  SkipForward, 
  Volume2 
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

const emit = defineEmits(["toggle-play", "seek", "volume", "prev", "next", "shuffle", "repeat", "toggle-favorite", "queue", "lyrics", "expand"]);

const cover = computed(() => props.track?.thumbnail || props.track?.cover);
const artist = computed(() => props.track?.artist || props.track?.subtitle);
const safeDuration = computed(() => Math.max(1, Math.floor(props.duration || props.track?.durationSeconds || 0)));
const progressPercent = computed(() => (props.currentTime / safeDuration.value) * 100);

function handleSeek(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percent = x / rect.width;
  emit("seek", percent * safeDuration.value);
}
</script>

<style scoped>
.player-bar {
  height: 96px;
  background: #0d0d12;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0 32px;
}

.player-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.track-section {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 300px;
}

.track-art {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.track-art img, .track-art .placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #1a1a20;
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.track-artist {
  font-size: 12px;
  opacity: 0.5;
  margin-top: 2px;
}

.playback-section {
  flex: 1;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 24px;
}

.control-btn {
  color: rgba(255, 255, 255, 0.4);
  transition: color 0.2s;
}

.control-btn:hover, .control-btn.active {
  color: #fff;
}

.control-btn.active {
  color: var(--primary);
}

.play-pause-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.play-pause-btn:hover {
  transform: scale(1.05);
}

.progress-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.time {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.3;
  width: 40px;
}

.progress-track {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.2s;
}

.progress-track:hover .progress-handle {
  transform: translate(-50%, -50%) scale(1);
}

.extra-section {
  width: 300px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.volume-container {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 120px;
}

.volume-track {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.volume-slider {
  width: 100%;
  height: 100%;
  appearance: none;
  background: transparent;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
}

.icon-btn {
  color: rgba(255, 255, 255, 0.4);
  transition: color 0.2s;
}

.icon-btn:hover {
  color: #fff;
}
</style>
