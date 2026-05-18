<template>
  <div v-if="filteredTracks.length" class="track-list">
    <div
      v-for="(track, index) in filteredTracks"
      :key="itemKey(track, index)"
      class="track-row"
      :class="isCurrent(track) ? 'is-current' : ''"
      role="button"
      tabindex="0"
      @click="$emit('play', track, filteredTracks)"
      @keydown.enter.prevent="$emit('play', track, filteredTracks)"
      @keydown.space.prevent="$emit('play', track, filteredTracks)"
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
        <BadgeCheck
          v-if="hasOffline(track)"
          :size="14"
          class="offline-badge"
          :title="t('downloaded')"
        />
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
        <button
          v-if="track.videoId"
          class="icon-btn"
          type="button"
          :title="hasOffline(track) ? t('removeDownload') : t('download')"
          @click.stop="onDownloadClick(track)"
        >
          <BadgeCheck v-if="hasOffline(track)" :size="15" :style="{ color: 'var(--success)' }" />
          <DownloadIcon v-else :size="15" />
        </button>
      </span>
    </div>
  </div>

  <div v-else class="empty">
    <Music2 :size="36" class="empty-icon" aria-hidden="true" />
    <span>{{ emptyLabel || t('emptyData') }}</span>
  </div>
</template>

<script setup>
import { computed, inject } from "vue";
import {
  BadgeCheck,
  Download as DownloadIcon,
  Heart,
  ListPlus,
  Music2,
  Play,
  Plus,
} from "lucide-vue-next";
import { trackKey } from "../lib/format";
import {
  enqueueDownload,
  offlineIndex,
} from "../lib/offlineStore";

const props = defineProps({
  tracks: { type: Array, default: () => [] },
  nowPlaying: { type: Object, default: null },
  favoriteKeys: { type: Set, default: () => new Set() },
  emptyLabel: { type: String, default: "" },
});

defineEmits(["play", "add-queue", "play-next", "toggle-favorite"]);

const appState = inject("appState");
function t(key) {
  return appState?.t?.(key) ?? key;
}

const filteredTracks = computed(() =>
  (props.tracks || []).filter((t) => t && (t.title || t.name)),
);

function itemKey(track, index) {
  return track.videoId ? `${track.videoId}-${index}` : `idx-${index}`;
}

function isCurrent(track) {
  return !!(track.videoId && props.nowPlaying?.videoId === track.videoId);
}

function isFavorite(track) {
  return props.favoriteKeys.has(trackKey(track));
}

function hasOffline(track) {
  void offlineIndex.size;
  return track.videoId ? offlineIndex.has(track.videoId) : false;
}

async function onDownloadClick(track) {
  if (hasOffline(track)) {
    const { removeDownload } = await import("../lib/offlineStore");
    await removeDownload(track.videoId);
    appState?.showToast?.(t("downloadRemoved"), "info");
  } else {
    enqueueDownload(track);
    appState?.showToast?.(t("downloadStarted"), "info");
  }
}
</script>

<style scoped>
.track-list {
  display: flex;
  flex-direction: column;
}

.track-row {
  display: grid;
  grid-template-columns: 36px 44px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  transition: background 0.15s ease;
  outline: none;
}

.track-row:hover,
.track-row:focus-visible {
  background: var(--bg-hover);
}

.track-row.is-current {
  background: rgba(var(--primary-rgb), 0.06);
}

.num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  position: relative;
}

.num-text {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
  transition: opacity 0.15s;
}

.is-playing-num {
  color: var(--primary);
}

.num-play {
  position: absolute;
  opacity: 0;
  color: var(--text-primary);
  transition: opacity 0.15s;
}

.track-row:hover .num-text { opacity: 0; }
.track-row:hover .num-play { opacity: 1; }

.eq-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  width: 14px;
}

.eq-bar {
  flex: 1;
  background: var(--primary);
  border-radius: 1px;
  animation: eq-bounce 0.9s ease-in-out infinite;
  transform-origin: bottom;
}
.eq-bar:nth-child(1) { animation-delay: -0.9s; }
.eq-bar:nth-child(2) { animation-delay: -0.6s; }
.eq-bar:nth-child(3) { animation-delay: -0.3s; }

@keyframes eq-bounce {
  0%, 100% { height: 18%; }
  50% { height: 100%; }
}

.cover {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.offline-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  color: var(--success);
  background: var(--bg-base);
  border-radius: 50%;
}

.text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.track-row.is-current .title {
  color: var(--primary);
}

.artist {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.duration {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.track-row:hover .actions,
.track-row:focus-within .actions,
.track-row.is-current .actions {
  opacity: 1;
}

.icon-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 500;
}

.empty-icon {
  color: var(--text-tertiary);
  opacity: 0.4;
}
</style>
