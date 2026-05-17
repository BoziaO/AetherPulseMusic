<template>
  <div class="downloads-page animate-fade">
    <header class="page-head">
      <h1 class="page-title">{{ t('downloadsTitle') }}</h1>
      <p class="page-sub">{{ t('downloadsSubtitle') }}</p>
    </header>

    <!-- Storage / mode controls -->
    <section class="card-block">
      <header class="card-head">
        <HardDrive :size="18" />
        <h2 class="card-title">{{ t('storageUsed') }}</h2>
      </header>

      <div class="storage-row">
        <div class="storage-numbers">
          <span class="big">{{ formatBytes(storage.used) }}</span>
          <span class="quota">/ {{ formatBytes(storage.quota || 0) || "∞" }}</span>
        </div>
        <div class="bar">
          <div class="bar-fill" :style="{ width: `${storagePercent}%` }" />
        </div>
        <p v-if="lowStorage" class="storage-warn">
          <AlertTriangle :size="14" /> {{ t('storageWarning') }}
        </p>
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('offlineMode') }}</p>
          <p class="row-sub">{{ t('offlineModeDesc') }}</p>
        </div>
        <button
          class="toggle"
          :class="settings.offlineMode ? 'toggle-on' : ''"
          type="button"
          @click="onToggleOffline"
        >
          <span class="toggle-thumb" />
        </button>
      </div>

      <div class="row row-column">
        <div class="row-text">
          <p class="row-title">{{ t('downloadFormat') }}</p>
        </div>
        <div class="seg-control">
          <button
            v-for="format in formatOptions"
            :key="format.id"
            class="seg"
            :class="settings.format === format.id ? 'seg-active' : ''"
            type="button"
            @click="setFormat(format.id)"
          >
            {{ t(format.labelKey) }}
          </button>
        </div>
      </div>

      <div class="row">
        <div class="row-text">
          <p class="row-title">{{ t('downloadAuto') }}</p>
          <p class="row-sub">{{ t('downloadAutoDesc') }}</p>
        </div>
        <button
          class="toggle"
          :class="settings.autoDownloadFavorites ? 'toggle-on' : ''"
          type="button"
          @click="setAutoDownload(!settings.autoDownloadFavorites)"
        >
          <span class="toggle-thumb" />
        </button>
      </div>
    </section>

    <!-- Active queue -->
    <section v-if="downloadQueue.length" class="card-block">
      <header class="card-head">
        <DownloadCloud :size="18" />
        <h2 class="card-title">{{ t('downloadQueue') }}</h2>
        <button class="link-btn ml-auto" type="button" @click="clearQueue">
          {{ t('clear') }}
        </button>
      </header>
      <ul class="queue-list">
        <li v-for="item in downloadQueue" :key="item.videoId" class="queue-item">
          <span class="queue-thumb">
            <img v-if="item.thumbnail" :src="item.thumbnail" alt="" loading="lazy" />
            <Music2 v-else :size="16" />
          </span>
          <div class="queue-meta">
            <p class="queue-title">{{ item.title }}</p>
            <p class="queue-sub">{{ item.artist }}</p>
            <p v-if="item.error" class="queue-error">{{ item.error }}</p>
            <div v-else class="queue-progress">
              <div class="bar small">
                <div class="bar-fill" :style="{ width: `${item.progress || 0}%` }" />
              </div>
              <span class="progress-text">
                {{ statusLabel(item) }} · {{ item.progress || 0 }}%
              </span>
            </div>
          </div>
          <button
            class="icon-btn"
            type="button"
            :title="t('cancelDownload')"
            @click="cancel(item.videoId)"
          >
            <X :size="14" />
          </button>
        </li>
      </ul>
    </section>

    <!-- Downloaded list -->
    <section class="card-block">
      <header class="card-head">
        <BadgeCheck :size="18" />
        <h2 class="card-title">{{ t('downloaded') }} ({{ downloads.length }})</h2>
      </header>
      <div v-if="!downloads.length" class="empty">
        <CloudOff :size="28" />
        <p>{{ t('downloadsEmpty') }}</p>
      </div>
      <ul v-else class="dl-list">
        <li
          v-for="track in downloads"
          :key="track.videoId"
          class="dl-item"
          :class="{ 'is-current': appState.nowPlaying.value?.videoId === track.videoId }"
        >
          <button class="dl-play" type="button" @click="appState.play(track, downloads)">
            <span class="dl-thumb">
              <img v-if="track.thumbnail" :src="track.thumbnail" alt="" loading="lazy" />
              <Music2 v-else :size="16" />
            </span>
            <span class="dl-meta">
              <span class="dl-title">{{ track.title }}</span>
              <span class="dl-sub">{{ track.artist }} · {{ track.format?.toUpperCase() }} · {{ formatBytes(track.size) }}</span>
            </span>
          </button>
          <button
            class="icon-btn danger-btn"
            type="button"
            :title="t('removeDownload')"
            @click="onRemove(track.videoId)"
          >
            <Trash2 :size="14" />
          </button>
        </li>
      </ul>

      <div v-if="downloads.length" class="card-actions">
        <button class="btn-secondary danger" type="button" @click="clearAll">
          <Trash2 :size="14" /> {{ t('clear') }} ({{ downloads.length }})
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, inject } from "vue";
import {
  AlertTriangle,
  BadgeCheck,
  CloudOff,
  DownloadCloud,
  HardDrive,
  Music2,
  Trash2,
  X,
} from "lucide-vue-next";
import {
  cancelDownload,
  clearAllDownloads,
  clearDownloadQueue,
  downloadQueue,
  listDownloads,
  offlineIndex,
  removeDownload,
  setOfflineMode,
  settings,
  storage,
  updateSettings,
} from "../lib/offlineStore";

const appState = inject("appState");

function t(key, vars) {
  return appState?.t?.(key, vars) ?? key;
}

const formatOptions = [
  { id: "m4a", labelKey: "downloadFormatM4a" },
  { id: "mp3", labelKey: "downloadFormatMp3" },
];

const downloads = computed(() => {
  void offlineIndex.size;
  return listDownloads().map((track) => ({
    ...track,
    // Repair missing thumbnails for tracks downloaded before the fix
    thumbnail: track.thumbnail || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`,
  }));
});

const storagePercent = computed(() => {
  if (!storage.quota) return 0;
  return Math.min(100, (storage.used / storage.quota) * 100);
});

const lowStorage = computed(() => {
  if (!storage.quota) return false;
  const free = storage.quota - storage.used;
  return free > 0 && free < 100 * 1024 * 1024; // <100 MB
});

function formatBytes(bytes) {
  if (!bytes || !Number.isFinite(bytes)) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let idx = 0;
  while (n >= 1024 && idx < units.length - 1) {
    n /= 1024;
    idx += 1;
  }
  return `${n.toFixed(idx >= 2 ? 1 : 0)} ${units[idx]}`;
}

function statusLabel(item) {
  if (item.status === "downloading") return t("downloading");
  if (item.status === "queued") return t("download");
  if (item.status === "error") return t("downloadFailed");
  return item.status;
}

function setFormat(id) {
  updateSettings({ format: id });
}

function setAutoDownload(value) {
  updateSettings({ autoDownloadFavorites: Boolean(value) });
}

function onToggleOffline() {
  const next = !settings.offlineMode;
  setOfflineMode(next);
  appState?.showToast?.(t(next ? "offlineModeOn" : "offlineModeOff"), "info");
}

function cancel(videoId) {
  cancelDownload(videoId);
}

function clearQueue() {
  clearDownloadQueue();
}

async function clearAll() {
  if (!window.confirm(t("confirmClear"))) return;
  await clearAllDownloads();
  appState?.showToast?.(t("downloadRemoved"), "info");
}

async function onRemove(videoId) {
  await removeDownload(videoId);
  appState?.showToast?.(t("downloadRemoved"), "info");
}
</script>

<style scoped>
.downloads-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 900px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.page-sub {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.card-block {
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.ml-auto {
  margin-left: auto;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row-column {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.row-text {
  flex: 1;
  min-width: 0;
}

.row-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.row-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.storage-row {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--line);
}

.storage-numbers {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.storage-numbers .big {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.storage-numbers .quota {
  font-size: 13px;
  color: var(--text-tertiary);
}

.bar {
  height: 6px;
  background: var(--bg-input);
  border-radius: 999px;
  overflow: hidden;
}

.bar.small {
  height: 4px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(var(--primary-rgb), 0.6), var(--primary));
  border-radius: 999px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.storage-warn {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--warning);
}

.queue-list {
  list-style: none;
  margin: 0;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: var(--bg-hover);
}

.queue-thumb {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--bg-input);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.queue-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.queue-meta {
  min-width: 0;
}

.queue-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-sub {
  margin: 1px 0 0;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-error {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--danger);
}

.queue-progress {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-text {
  font-size: 11px;
  color: var(--text-tertiary);
}

.empty {
  padding: 36px 20px;
  text-align: center;
  color: var(--text-tertiary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.empty p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.card-actions {
  padding: 12px 20px 16px;
  display: flex;
  justify-content: flex-end;
}

.toggle {
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: var(--bg-input);
  position: relative;
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.toggle-on {
  background: var(--success);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-on .toggle-thumb {
  transform: translateX(18px);
}

.seg-control {
  display: inline-flex;
  background: var(--bg-input);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
  flex-wrap: wrap;
}

.seg {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: 6px;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.seg-active {
  background: var(--bg-base);
  color: var(--text-primary);
}

.btn-secondary.danger {
  color: var(--danger);
}

.link-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.dl-list {
  list-style: none;
  margin: 0;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.dl-item:hover {
  background: var(--bg-hover);
}

.dl-item.is-current .dl-title {
  color: var(--primary);
}

.dl-play {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  text-align: left;
  border-radius: var(--radius-md);
  padding: 2px;
}

.dl-thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: var(--bg-input);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.dl-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dl-meta {
  min-width: 0;
}

.dl-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dl-sub {
  display: block;
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.danger-btn {
  color: var(--text-tertiary);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}

.dl-item:hover .danger-btn {
  opacity: 1;
}

.danger-btn:hover {
  color: var(--danger);
}
</style>
