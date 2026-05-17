// AetherPulse Offline Store
// Zarządza metadanymi i blobami pobranych utworów w IndexedDB.
// Reaktywny indeks (`offlineIndex`) jest dostępny dla komponentów,
// kolejka pobrań działa sekwencyjnie z aktualizacją postępu.

import { reactive, ref } from "vue";

const DB_NAME = "aetherpulse-offline";
const DB_VERSION = 2;
const STORE_META = "meta";
const STORE_BLOBS = "blobs";
const STORE_PREFS = "prefs";
const SETTINGS_KEY = "ap:offline-settings";

const DEFAULT_SETTINGS = {
  legalAccepted: false,
  format: "opus", // opus | m4a | mp3
  autoDownloadFavorites: false,
  offlineMode: false,
};

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
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "videoId" });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "videoId" });
      }
      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS);
      }
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

export const offlineIndex = reactive(new Map()); // videoId -> meta
export const downloadQueue = ref([]); // [{ videoId, title, status: 'queued'|'downloading'|'error', progress, error }]
export const settings = reactive({ ...DEFAULT_SETTINGS });
export const storage = reactive({ used: 0, quota: 0 });

let currentDownload = null;
let abortController = null;

// ----------------------------------------------------------------------
// Settings
// ----------------------------------------------------------------------

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) Object.assign(settings, DEFAULT_SETTINGS, JSON.parse(raw));
    else Object.assign(settings, DEFAULT_SETTINGS);
  } catch {
    Object.assign(settings, DEFAULT_SETTINGS);
  }
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
  Array.from(blobUrlCache.keys()).forEach(revokeBlob);
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
  downloadQueue.value.push({
    videoId: track.videoId,
    title: track.title || "",
    artist: track.artist || track.author || track.subtitle || "",
    thumbnail: track.thumbnail || track.cover || track.art || null,
    duration: track.duration || "",
    status: "queued",
    progress: 0,
    error: null,
  });
  processQueue();
  return true;
}

export function cancelDownload(videoId) {
  if (currentDownload?.videoId === videoId && abortController) {
    abortController.abort();
  }
  downloadQueue.value = downloadQueue.value.filter(
    (item) => item.videoId !== videoId,
  );
}

export function clearDownloadQueue() {
  if (abortController) abortController.abort();
  downloadQueue.value = [];
}

function updateQueueItem(videoId, patch) {
  downloadQueue.value = downloadQueue.value.map((item) =>
    item.videoId === videoId ? { ...item, ...patch } : item,
  );
}

async function processQueue() {
  if (currentDownload) return;
  const next = downloadQueue.value.find((item) => item.status === "queued");
  if (!next) return;
  currentDownload = next;
  updateQueueItem(next.videoId, { status: "downloading", progress: 0, error: null });
  try {
    await downloadOne(next);
    downloadQueue.value = downloadQueue.value.filter(
      (item) => item.videoId !== next.videoId,
    );
  } catch (err) {
    updateQueueItem(next.videoId, {
      status: "error",
      error: err?.message || "Download failed",
    });
  } finally {
    currentDownload = null;
    // continue with next item
    if (downloadQueue.value.some((item) => item.status === "queued")) {
      setTimeout(processQueue, 100);
    }
  }
}

async function downloadOne(item) {
  const controller = new AbortController();
  abortController = controller;

  try {
    // 1) Pobierz metadane + URL strumienia z backendu
    const metaResponse = await fetch(
      `/api/downloads/info/${encodeURIComponent(item.videoId)}?format=${encodeURIComponent(settings.format)}`,
      { signal: controller.signal, credentials: "include" },
    );

    if (!metaResponse.ok) {
      let error = `Metadata request failed (${metaResponse.status})`;
      const body = await metaResponse.json().catch(() => ({}));
      if (body?.error) error = body.error;
      throw new Error(error);
    }

    const info = await metaResponse.json();
    if (!info?.streamUrl) {
      throw new Error("Missing stream URL");
    }

    // 2) Pobierz blob przez backend playback endpoint.
    const proxyUrl =
      `/api/downloads/playback/${encodeURIComponent(item.videoId)}` +
      `?format=${encodeURIComponent(settings.format)}`;
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const total = Number(response.headers.get("content-length") || 0);

    if (response.body && total > 0) {
      const reader = response.body.getReader();
      let received = 0;

      const stream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            received += value.byteLength;
            updateQueueItem(item.videoId, {
              progress: Math.round((received / total) * 100),
            });
            controller.enqueue(value);
          }
        },
      });

      const blob = await new Response(stream).blob();
      await persistDownloaded(item, blob, info);
      return;
    }

    const blob = await response.blob();
    await persistDownloaded(item, blob, info);
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Download cancelled");
    }
    console.error("downloadOne failed:", err);
    throw err;
  } finally {
    if (abortController === controller) {
      abortController = null;
    }
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

  const meta = {
    videoId: String(item.videoId),
    title: item.title || info.title || "",
    artist: item.artist || info.artist || "",
    thumbnail: item.thumbnail || info.thumbnail || null,
    duration: item.duration || info.duration || "",
    format: settings.format,
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
  // Inicjalizuj automatycznie po stronie klienta
  initOfflineStore();
}
