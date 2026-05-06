<template>
  <section class="fixed inset-x-0 bottom-4 z-[200] px-4">
    <div
      class="mx-auto flex max-w-[1200px] items-center justify-between rounded-2xl border px-4 py-3 shadow-2xl"
      style="background: var(--bg-player); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border-color: var(--surface-line)"
    >
      <div class="flex min-w-0 flex-1 items-center gap-4">
        <div class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl shadow-lg" style="background: var(--bg-card)">
          <img v-if="track?.art || track?.thumbnail || track?.cover" :src="track.art || track.thumbnail || track.cover" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-[15px] font-bold tracking-tight">{{ track?.title }}</p>
          <p class="truncate text-[13px] font-medium" style="color: var(--text-muted)">{{ track?.artist || track?.subtitle }}</p>
        </div>
        <button class="ml-2 flex h-8 w-8 items-center justify-center transition-transform active:scale-90" type="button" @click="$emit('toggle-favorite')">
          <Heart :size="18" :fill="favorite ? 'var(--primary)' : 'none'" :class="favorite ? 'text-[var(--primary)]' : 'text-[var(--text-soft)]'" />
        </button>
      </div>

      <div class="flex-[1.5] px-8">
        <div class="mb-2 flex items-center justify-center gap-6">
          <button class="flex h-8 w-8 items-center justify-center transition-colors hover:text-[var(--primary)]" type="button" :class="shuffle ? 'text-[var(--primary)]' : 'text-[var(--text-soft)]'" @click="$emit('shuffle')">
            <Shuffle :size="18" />
          </button>
          <button class="flex h-8 w-8 items-center justify-center transition-colors hover:text-[var(--primary)]" type="button" @click="$emit('prev')">
            <SkipBack :size="20" fill="currentColor" />
          </button>
          <button
            class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--text-main)] text-[var(--bg-main)] transition-transform hover:scale-105 active:scale-95"
            type="button"
            @click="$emit('toggle-play')"
          >
            <Pause v-if="isPlaying" :size="24" fill="currentColor" />
            <Play v-else :size="24" fill="currentColor" class="translate-x-0.5" />
          </button>
          <button class="flex h-8 w-8 items-center justify-center transition-colors hover:text-[var(--primary)]" type="button" @click="$emit('next')">
            <SkipForward :size="20" fill="currentColor" />
          </button>
          <button class="flex h-8 w-8 items-center justify-center transition-colors hover:text-[var(--primary)]" type="button" :class="repeatMode !== 'none' ? 'text-[var(--primary)]' : 'text-[var(--text-soft)]'" @click="$emit('repeat')">
            <Repeat :size="18" />
          </button>
        </div>

        <div class="flex items-center gap-3">
          <span class="w-10 text-right text-[11px] font-medium tabular-nums text-[var(--text-soft)]">{{ formatClock(currentTime) }}</span>
          <div class="relative flex-1">
            <input
              type="range"
              min="0"
              :max="safeDuration"
              step="1"
              :value="currentTime"
              class="player-slider"
              @input="$emit('seek', Number($event.target.value))"
            />
          </div>
          <span class="w-10 text-left text-[11px] font-medium tabular-nums text-[var(--text-soft)]">{{ formatClock(safeDuration) }}</span>
        </div>
      </div>

      <div class="flex flex-1 items-center justify-end gap-3">
        <button class="flex h-8 w-8 items-center justify-center text-[var(--text-soft)] hover:text-[var(--text-main)]" type="button" @click="$emit('queue')">
          <ListMusic :size="18" />
        </button>
        <button class="flex h-8 w-8 items-center justify-center text-[var(--text-soft)] hover:text-[var(--text-main)]" type="button" @click="$emit('lyrics')">
          <Captions :size="18" />
        </button>
        <div class="flex items-center gap-2">
          <Volume2 :size="18" class="text-[var(--text-soft)]" />
          <input class="w-24 player-slider" type="range" min="0" max="100" step="1" :value="volume" @input="$emit('volume', Number($event.target.value))" />
        </div>
        <button class="flex h-8 w-8 items-center justify-center text-[var(--text-soft)] hover:text-[var(--text-main)]" type="button" @click="$emit('hide')">
          <ChevronDown :size="20" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import {
  Captions,
  ChevronDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
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

defineEmits(["toggle-play", "seek", "volume", "prev", "next", "shuffle", "repeat", "toggle-favorite", "queue", "lyrics", "hide"]);

const safeDuration = computed(() => Math.max(1, Math.floor(props.duration || props.track?.durationSeconds || 0)));
const activeStyle = "color: #fff; border-color: color-mix(in srgb, var(--primary) 72%, transparent); background: color-mix(in srgb, var(--primary) 32%, transparent)";
</script>
