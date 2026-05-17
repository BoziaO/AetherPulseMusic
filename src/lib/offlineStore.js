import { reactive, ref } from "vue";
import { upgradeThumbUrl } from "./format.js";

const DB_NAME = "aetherpulse-offline";
const DB_VERSION = 2;
const STORE_META = "meta";
const STORE_BLOBS = "blobs";
const STORE_PREFS = "prefs";
const SETTINGS_KEY = "ap:offline-settings";

const DEFAULT_SETTINGS = {
  legalAccepted: false,
  format: "m4a",
  autoDownloadFavorites: false,
  offlineMode: false,
};

const SUPPORTED_DOWNLOAD_FORMATS = new Set(["m4a", "mp3"]);

function normalizeDownloadFormat(format) {
  const normalized = String(format || "").toLowerCase().trim();
  if (SUPPORTED_DOWNLOAD_FORMATS.has(normalized)) return normalized;
  return DEFAULT_SETTINGS.format;
}

// ----------------------------------------------------------------------
// IndexedDB low-level
// ----------------------------------------------------------------------

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB not available"));
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      // Create stores that don't exist yet (handles both fresh install and v1->v2 migration)
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "videoId" });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "videoId" });
      }
      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS);
      }
      // v1 -> v2: no schema changes, stores are the same
      void oldVersion;
    };
    request.onblocked = () => {
      console.warn("IndexedDB upgrade blocked");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(storeName, mode = "readonly") {
  return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function asPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ----------------------------------------------------------------------
// Reactive state
// ----------------------------------------------------------------------

export const offlineIndex = reactive(new Map());
export const downloadQueue = ref([]);
export const settings = reactive({ ...DEFAULT_SETTINGS });
export const storage = reactive({ used: 0, quota: 0 });

// Per-download abort controllers keyed by videoId — fixes shared-controller race condition
const _activeControllers = new Map();
const MAX_CONCURRENT_DOWNLOADS = 2;
let _activeDownloadCount = 0;

// ----------------------------------------------------------------------
// Settings
// ----------------------------------------------------------------------

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(settings, DEFAULT_SETTINGS, parsed);
    } else {
      Object.assign(settings, DEFAULT_SETTINGS);
    }
  } catch {
    Object.assign(settings, DEFAULT_SETTINGS);
  }
  settings.format = normalizeDownloadFormat(settings.format);
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function updateSettings(patch = {}) {
  Object.assign(settings, patch);
  settings.format = normalizeDownloadFormat(settings.format);
  persistSettings();
}

export function setLegalAccepted(accepted = true) {
  settings.legalAccepted = Boolean(accepted);
  persistSettings();
}

export function setOfflineMode(enabled) {
  settings.offlineMode = Boolean(enabled);
  persistSettings();
}

// ----------------------------------------------------------------------
// Index management
// ----------------------------------------------------------------------

async function refreshIndex() {
  try {
    const store = await tx(STORE_META);
    const all = await asPromise(store.getAll());
    offlineIndex.clear();
    all.forEach((entry) => {
      offlineIndex.set(entry.videoId, entry);
    });
  } catch (err) {
    console.warn("offlineStore: failed to load index", err);
  }
}

export async function refreshStorageEstimate() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    storage.used = 0;
    storage.quota = 0;
    return storage;
  }
  try {
    const estimate = await navigator.storage.estimate();
    storage.used = Number(estimate.usage || 0);
    storage.quota = Number(estimate.quota || 0);
  } catch {
    /* ignore */
  }
  return storage;
}

export function isDownloaded(videoId) {
  return offlineIndex.has(videoId);
}

export function getMeta(videoId) {
  return offlineIndex.get(videoId) || null;
}

export function listDownloads() {
  return Array.from(offlineIndex.values()).sort(
    (a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0),
  );
}

// ----------------------------------------------------------------------
// Blob playback
// ----------------------------------------------------------------------

const blobUrlCache = new Map();

export async function getPlaybackUrl(videoId) {
  if (blobUrlCache.has(videoId)) return blobUrlCache.get(videoId);
  try {
    const store = await tx(STORE_BLOBS);
    const record = await asPromise(store.get(videoId));
    if (!record?.blob) return null;
    const url = URL.createObjectURL(record.blob);
    blobUrlCache.set(videoId, url);
    return url;
  } catch (err) {
    console.warn("offlineStore.getPlaybackUrl:", err);
    return null;
  }
}

function revokeBlob(videoId) {
  const url = blobUrlCache.get(videoId);
  if (url) {
    URL.revokeObjectURL(url);
    blobUrlCache.delete(videoId);
  }
}

/** Revoke all cached blob URLs — call on app unload to prevent memory leaks. */
export function revokeAllBlobUrls() {
  Array.from(blobUrlCache.keys()).forEach(revokeBlob);
}

// ----------------------------------------------------------------------
// Remove download
// ----------------------------------------------------------------------

export async function removeDownload(videoId) {
  if (!videoId) return;
  revokeBlob(videoId);
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_META, STORE_BLOBS], "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.objectStore(STORE_META).delete(videoId);
    transaction.objectStore(STORE_BLOBS).delete(videoId);
  });
  offlineIndex.delete(videoId);
  refreshStorageEstimate();
}

export async function clearAllDownloads() {
  revokeAllBlobUrls();
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_META, STORE_BLOBS], "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.objectStore(STORE_META).clear();
    transaction.objectStore(STORE_BLOBS).clear();
  });
  offlineIndex.clear();
  refreshStorageEstimate();
}

// ----------------------------------------------------------------------
// Download queue
// ----------------------------------------------------------------------

export function enqueueDownload(track) {
  if (!track?.videoId) return false;
  if (offlineIndex.has(track.videoId)) return false;
  if (downloadQueue.value.some((item) => item.videoId === track.videoId)) return false;
  const thumbnail = track.thumbnail || track.art || track.cover || track.image || null;
  downloadQueue.value.push({
    videoId: track.videoId,
    title: track.title || track.name || "",
    artist: track.artist || track.author || track.subtitle || "",
    thumbnail,
    duration: track.duration || "",
    status: "queued",
    progress: 0,
    error: null,
  });
  processQueue();
  return true;
}

export function cancelDownload(videoId) {
  // Abort the active controller for this specific download
  const ctrl = _activeControllers.get(videoId);
  if (ctrl) {
    ctrl.abort();
    _activeControllers.delete(videoId);
  }
  downloadQueue.value = downloadQueue.value.filter(
    (item) => item.videoId !== videoId,
  );
}

export function clearDownloadQueue() {
  _activeControllers.forEach((ctrl) => ctrl.abort());
  _activeControllers.clear();
  downloadQueue.value = [];
}

function updateQueueItem(videoId, patch) {
  downloadQueue.value = downloadQueue.value.map((item) =>
    item.videoId === videoId ? { ...item, ...patch } : item,
  );
}

async function processQueue() {
  // Drain up to MAX_CONCURRENT_DOWNLOADS slots
  while (_activeDownloadCount < MAX_CONCURRENT_DOWNLOADS) {
    const next = downloadQueue.value.find((item) => item.status === "queued");
    if (!next) break;
    _activeDownloadCount++;
    updateQueueItem(next.videoId, { status: "downloading", progress: 0, error: null });
    downloadOne(next)
      .then(() => {
        downloadQueue.value = downloadQueue.value.filter((i) => i.videoId !== next.videoId);
      })
      .catch((err) => {
        const isCancelled = err?.message === "Download cancelled";
        if (isCancelled) {
          downloadQueue.value = downloadQueue.value.filter((i) => i.videoId !== next.videoId);
        } else {
          updateQueueItem(next.videoId, { status: "error", error: err?.message || "Download failed" });
        }
      })
      .finally(() => {
        _activeDownloadCount = Math.max(0, _activeDownloadCount - 1);
        // Try to fill the freed slot
        if (downloadQueue.value.some((i) => i.status === "queued")) {
          setTimeout(processQueue, 50);
        }
      });
  }
}

async function downloadOne(item) {
  const MAX_RETRIES = 2;
  let lastErr = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Check if already cancelled before each attempt
    if (_activeControllers.get(item.videoId)?.signal.aborted) {
      throw new Error("Download cancelled");
    }
    if (attempt > 0) {
      updateQueueItem(item.videoId, { progress: 0, error: null, status: "downloading" });
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
    try {
      await _doDownload(item);
      return;
    } catch (err) {
      if (err?.message === "Download cancelled") throw err;
      lastErr = err;
      console.warn(`[offline] attempt ${attempt + 1} failed:`, err.message);
    }
  }
  throw lastErr || new Error("Download failed after retries");
}

async function _doDownload(item) {
  const controller = new AbortController();
  _activeControllers.set(item.videoId, controller);

  try {
    const downloadFormat = normalizeDownloadFormat(settings.format);
    const proxyUrl =
      `/api/downloads/playback/${encodeURIComponent(item.videoId)}` +
      `?format=${encodeURIComponent(downloadFormat)}`;

    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const total = Number(response.headers.get("content-length") || 0);
    let blob;

    if (response.body && total > 0) {
      const reader = response.body.getReader();
      let received = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        updateQueueItem(item.videoId, {
          progress: Math.min(99, Math.round((received / total) * 100)),
        });
      }
      blob = new Blob(chunks);
    } else {
      updateQueueItem(item.videoId, { progress: 50 });
      blob = await response.blob();
    }

    updateQueueItem(item.videoId, { progress: 100 });

    const mimeType = response.headers.get("content-type") || blob.type || "audio/mpeg";
    await persistDownloaded(item, blob, {
      mimeType,
      title: item.title,
      artist: item.artist,
      thumbnail: item.thumbnail,
      duration: item.duration,
    });
  } catch (err) {
    // Normalize AbortError to a consistent message for processQueue
    if (err?.name === "AbortError") throw new Error("Download cancelled");
    throw err;
  } finally {
    _activeControllers.delete(item.videoId);
  }
}

async function persistDownloaded(item, blob, info) {
  const mimeType = info.mimeType || blob.type || "audio/mpeg";
  let storedBlob = blob;

  try {
    const buffer = await blob.arrayBuffer();
    storedBlob = new Blob([buffer], { type: mimeType });
  } catch (err) {
    console.warn("offlineStore.persistDownloaded: blob clone fallback failed", err);
  }

  // Resolve thumbnail: item > info > YouTube maxres fallback
  const rawThumb = item.thumbnail || info.thumbnail || null;
  const thumbnail = rawThumb
    ? upgradeThumbUrl(rawThumb)
    : `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;

  const downloadFormat = normalizeDownloadFormat(settings.format);
  const meta = {
    videoId: String(item.videoId),
    title: item.title || info.title || "",
    artist: item.artist || info.artist || "",
    thumbnail,
    duration: item.duration || info.duration || "",
    format: downloadFormat,
    mimeType,
    size: storedBlob.size,
    downloadedAt: Date.now(),
    sourceVideoId: String(item.videoId),
  };

  const db = await openDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_META, STORE_BLOBS], "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.objectStore(STORE_META).put(JSON.parse(JSON.stringify(meta)));
    transaction.objectStore(STORE_BLOBS).put({ videoId: meta.videoId, blob: storedBlob });
  });
  offlineIndex.set(meta.videoId, meta);
  await refreshStorageEstimate();
}


// ----------------------------------------------------------------------
// Bulk operations
// ----------------------------------------------------------------------

export function enqueueBulk(tracks = []) {
  let added = 0;
  tracks.forEach((track) => {
    if (enqueueDownload(track)) added += 1;
  });
  return added;
}

// ----------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------

let initPromise = null;
export function initOfflineStore() {
  if (initPromise) return initPromise;
  loadSettings();
  initPromise = Promise.all([refreshIndex(), refreshStorageEstimate()]).catch(
    (err) => {
      console.warn("offlineStore init failed:", err);
    },
  );
  return initPromise;
}

if (typeof window !== "undefined") {
  initOfflineStore();
  // Revoke all blob URLs on page unload to prevent memory leaks
  window.addEventListener("beforeunload", revokeAllBlobUrls);
}
