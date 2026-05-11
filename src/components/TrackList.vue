<template>
  <div v-if="tracks.length" class="track-list">
    <div
      v-for="(track, index) in tracks"
      :key="itemKey(track, index)"
      class="track-row"
      :class="isCurrent(track) ? 'is-current' : ''"
      role="button"
      tabindex="0"
      @click="$emit('play', track, tracks)"
      @keydown.enter.prevent="$emit('play', track, tracks)"
      @keydown.space.prevent="$emit('play', track, tracks)"
    >
      <span class="num">
        <span class="num-text" :class="isCurrent(track) ? 'is-playing-num' : ''">
          <span v-if="isCurrent(track)" class="eq-bars" aria-hidden="true">
            <span class="eq-bar" />
            <span class="eq-bar" />
            <span class="eq-bar" />
          </span>
          <span v-else>{{ String(index + 1).padStart(2, '0') }}</span>
        </span>
        <Play :size="14" fill="currentColor" class="num-play" />
      </span>

      <span class="cover">
        <img
          v-if="track.thumbnail || track.art || track.cover"
          :src="track.thumbnail || track.art || track.cover"
          alt=""
          loading="lazy"
        />
        <Music2 v-else :size="18" :style="{ color: 'var(--text-tertiary)' }" />
      </span>

      <span class="text">
        <span class="title">{{ track.title || track.name }}</span>
        <span class="artist">{{ track.artist || track.subtitle || track.author || "" }}</span>
      </span>

      <span class="duration">{{ track.duration || "" }}</span>

      <span class="actions">
        <button
          class="icon-btn"
          type="button"
          :title="isFavorite(track) ? t('removedFromFavorites') : t('addedToFavorites')"
          @click.stop="$emit('toggle-favorite', track)"
        >
          <Heart
            :size="15"
            :fill="isFavorite(track) ? 'var(--primary)' : 'none'"
            :style="{ color: isFavorite(track) ? 'var(--primary)' : 'var(--text-secondary)' }"
          />
        </button>
        <button
          class="icon-btn"
          type="button"
          :title="t('addToQueue')"
          @click.stop="$emit('add-queue', track)"
        >
          <Plus :size="15" />
        </button>
        <button
          class="icon-btn"
          type="button"
          :title="t('playNext')"
          @click.stop="$emit('play-next', track)"
        >
          <ListPlus :size="15" />
        </button>
      </span>
    </div>
  </div>

  <div v-else class="empty">{{ emptyLabel || t('emptyData') }}</div>
</template>

<script setup>
import { inject } from "vue";
import { Heart, ListPlus, Music2, Play, Plus } from "lucide-vue-next";
import { trackKey } from "../lib/format";

const props = defineProps({
  tracks: { type: Array, default: () => [] },
  nowPlaying: { type: Object, default: null },
  favoriteKeys: { type: Object, default: () => new Set() },
  emptyLabel: { type: String, default: "" },
});

defineEmits(["play", "play-next", "add-queue", "toggle-favorite"]);

const app = inject("appState");
function t(key) {
  return app?.t?.(key) ?? key;
}

function itemKey(track, index) {
  return trackKey(track) || index;
}

function isCurrent(track) {
  return props.nowPlaying?.videoId && track?.videoId === props.nowPlaying.videoId;
}

function isFavorite(track) {
  return props.favoriteKeys?.has?.(trackKey(track));
}
</script>

<style scoped>
.track-list {
  display: flex;
  flex-direction: column;
}

.track-row {
  display: grid;
  grid-template-columns: 32px 44px minmax(0, 1fr) 56px auto;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.track-row + .track-row {
  margin-top: 2px;
}

.track-row:hover {
  background: var(--bg-hover);
}

.track-row.is-current {
  background: var(--bg-hover);
}

.track-row.is-current .title {
  color: var(--primary);
}

.num {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
}

.num-text {
  transition: opacity var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.eq-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.eq-bar {
  display: block;
  width: 3px;
  border-radius: 2px;
  background: var(--primary);
  animation: eq-bounce 0.9s ease-in-out infinite alternate;
}

.eq-bar:nth-child(1) {
  height: 6px;
  animation-delay: 0s;
}
.eq-bar:nth-child(2) {
  height: 12px;
  animation-delay: 0.2s;
}
.eq-bar:nth-child(3) {
  height: 8px;
  animation-delay: 0.1s;
}

@keyframes eq-bounce {
  from { transform: scaleY(0.35); }
  to   { transform: scaleY(1); }
}

.num-play {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.track-row:hover .num-text {
  opacity: 0;
}

.track-row:hover .num-play {
  display: flex;
}

.track-row.is-current .num-text {
  color: var(--primary);
}

.cover {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: var(--bg-elevated);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.text {
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
  margin-top: 2px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.duration {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
  text-align: right;
}

.actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.track-row:hover .actions,
.track-row:focus-within .actions {
  opacity: 1;
}

.actions .icon-btn {
  width: 32px;
  height: 32px;
}

.empty {
  padding: 32px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
}

@media (max-width: 720px) {
  .track-row {
    grid-template-columns: 44px minmax(0, 1fr) auto;
  }
  .num,
  .duration,
  .actions {
    display: none;
  }
  .track-row::after {
    content: "›";
    color: var(--text-tertiary);
  }
}
</style>
