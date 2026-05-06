<template>
  <div v-if="tracks.length" class="panel p-2">
    <div
      v-for="(track, index) in tracks"
      :key="itemKey(track, index)"
      class="track-row group grid grid-cols-[36px_44px_1fr_auto] items-center gap-3 p-2.5"
      :class="isCurrent(track) ? 'track-row-current' : ''"
      role="button"
      tabindex="0"
      @click="$emit('play', track, tracks)"
      @keydown.enter.prevent="$emit('play', track, tracks)"
      @keydown.space.prevent="$emit('play', track, tracks)"
    >
      <span class="text-center text-xs font-black tabular-nums" style="color: var(--text-soft)">
        {{ isCurrent(track) ? "ON" : String(index + 1).padStart(2, "0") }}
      </span>

      <span class="relative h-11 w-11 overflow-hidden rounded-lg" style="background: var(--bg-card)">
        <img v-if="track.thumbnail || track.art || track.cover" :src="track.thumbnail || track.art || track.cover" alt="" class="h-full w-full object-cover" loading="lazy" />
        <span v-else class="flex h-full w-full items-center justify-center" style="color: var(--text-soft)">
          <Music2 :size="20" />
        </span>
      </span>

      <span class="min-w-0">
        <span class="block truncate text-sm font-black" :style="{ color: isCurrent(track) ? 'var(--primary)' : 'var(--text-main)' }">
          {{ track.title || track.name }}
        </span>
        <span class="block truncate text-xs font-semibold" style="color: var(--text-muted)">
          {{ track.artist || track.subtitle || track.author || "YouTube Music" }}
        </span>
      </span>

      <span class="flex items-center gap-1">
        <span class="hidden items-center gap-2 pr-2 md:flex">
          <span class="h-1.5 w-12 overflow-hidden rounded-full" style="background: var(--bg-card-hover)">
            <span class="block h-full rounded-full" :style="{ width: `${energy(track)}%`, backgroundColor: energyColor(track) }" />
          </span>
          <span class="w-8 text-right text-[11px] font-bold tabular-nums" style="color: var(--text-soft)">
            {{ track.duration || "" }}
          </span>
        </span>

        <button class="icon-button h-9 w-9" type="button" title="Odtworz" @click.stop="$emit('play', track, tracks)">
          <Play :size="15" fill="currentColor" />
        </button>
        <button class="icon-button hidden h-9 w-9 sm:inline-flex" type="button" title="Nastepny" @click.stop="$emit('play-next', track)">
          <ListPlus :size="15" />
        </button>
        <button class="icon-button hidden h-9 w-9 sm:inline-flex" type="button" title="Dodaj do kolejki" @click.stop="$emit('add-queue', track)">
          <Plus :size="15" />
        </button>
        <button class="icon-button h-9 w-9" type="button" title="Ulubione" @click.stop="$emit('toggle-favorite', track)">
          <Heart :size="15" :fill="isFavorite(track) ? 'currentColor' : 'none'" :style="{ color: isFavorite(track) ? 'var(--primary)' : 'var(--text-muted)' }" />
        </button>
      </span>
    </div>
  </div>

  <div v-else class="panel flex min-h-40 items-center justify-center p-6 text-center text-sm font-semibold" style="color: var(--text-muted)">
    {{ emptyLabel }}
  </div>
</template>

<script setup>
import { Heart, ListPlus, Music2, Play, Plus } from "lucide-vue-next";
import { estimateEnergy } from "../lib/energy";
import { trackKey } from "../lib/format";

const props = defineProps({
  tracks: { type: Array, default: () => [] },
  nowPlaying: { type: Object, default: null },
  favoriteKeys: { type: Object, default: () => new Set() },
  emptyLabel: { type: String, default: "Brak utworow" },
});

defineEmits(["play", "play-next", "add-queue", "toggle-favorite"]);

function itemKey(track, index) {
  return trackKey(track) || index;
}

function isCurrent(track) {
  return props.nowPlaying?.videoId && track?.videoId === props.nowPlaying.videoId;
}

function isFavorite(track) {
  return props.favoriteKeys?.has?.(trackKey(track));
}

function energy(track) {
  return estimateEnergy(track);
}

function energyColor(track) {
  const value = energy(track);
  if (value < 38) return "var(--accent)";
  if (value < 68) return "var(--warning)";
  return "var(--primary)";
}
</script>
