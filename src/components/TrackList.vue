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
        <button
          v-if="track.videoId"
          class="icon-btn"
          type="button"
          :title="t('saveToDevice')"
          @click.stop="onSaveToDevice(track)"
        >
          <HardDriveDownload :size="15" />
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
  HardDriveDownload,
  Heart,
  ListPlus,
  Music2,
  Play,
  Plus,
} from "lucide-vue-next";
import { trackKey } from "../lib/format";
import {
  enqueueDownload,
  isDownloaded,
  offlineIndex,
  removeDownload,
  saveToDevice,
  settings as offlineSettings,
} from "../lib/offlineStore";

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

const filteredTracks = computed(() => {
  if (!offlineSettings.offlineMode) return props.tracks;
  return props.tracks.filter((track) => track?.videoId && offlineIndex.has(track.videoId));
});

function itemKey(track, index) {
  return trackKey(track) || index;
}

function isCurrent(track) {
  return props.nowPlaying?.videoId && track?.videoId === props.nowPlaying.videoId;
}

function isFavorite(track) {
  return props.favoriteKeys?.has?.(trackKey(track));
}

function hasOffline(track) {
  // dependency on offlineIndex.size triggers reactivity
  void offlineIndex.size;
  return Boolean(track?.videoId && isDownloaded(track.videoId));
}

function onDownloadClick(track) {
  if (!track?.videoId) return;
  if (hasOffline(track)) {
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

async function onSaveToDevice(track) {
  if (!track?.videoId) return;
  await saveToDevice(track.videoId, track.title || track.name, track.artist || track.author || '');
  app?.showToast?.(t("saveToDevice"), "success");
}
</script>

<style scoped>
.track-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.track-row {
  display: grid;
  grid-template-columns: 32px 44px minmax(0, 1fr) 60px auto;
  align-items: center;
  gap: 12px;
  padding: 7px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
  border: 1px solid transparent;
}

.track-row:hover {
  background: var(--bg-hover);
  border-color: var(--line);
}

.track-row:active {
  transform: scale(0.995);
}

.track-row.is-current {
  background: rgba(var(--primary-rgb), 0.07);
  border-color: rgba(var(--primary-rgb), 0.15);
}

.track-row.is-current .title {
  color: var(--primary);
}

.track-row:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
  background: rgba(var(--primary-rgb), 0.06);
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
  border-radius: 8px;
  background: var(--bg-elevated);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-base);
}

.track-row:hover .cover img {
  transform: scale(1.04);
}

.cover {
  position: relative;
}

.offline-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-base);
  color: var(--success);
  padding: 2px;
  box-shadow: 0 0 0 2px var(--bg-base);
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
  gap: 0;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.track-row:hover .actions,
.track-row:focus-within .actions {
  opacity: 1;
}

.actions .icon-btn {
  width: 30px;
  height: 30px;
}

.empty {
  padding: 48px 32px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.empty-icon {
  opacity: 0.3;
  color: var(--text-tertiary);
}

@media (max-width: 720px) {
  .track-row {
    grid-template-columns: 44px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 7px 8px;
  }
  .num,
  .duration {
    display: none;
  }
  .actions {
    opacity: 1;
  }
  .actions .icon-btn {
    width: 34px;
    height: 34px;
  }
  .actions .icon-btn:nth-child(n+3):not(:last-child):not(:nth-last-child(-n+2)) {
    display: none;
  }
}
</style>
