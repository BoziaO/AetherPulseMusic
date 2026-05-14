// AetherPulse — YouTube stream URL extractor
//
// Wykorzystuje youtubei.js (Innertube) do uzyskania bezpośredniego adresu URL
// strumienia audio z YouTube, automatycznie deszyfrując parametr `nsig`/podpis.
// Klient `IOS` zwraca natywne URL bez signatureCipher; jeśli zawiedzie,
// próbujemy `ANDROID` jako fallback. Wynik jest cache'owany w pamięci by uniknąć
// nadmiernych wywołań Innertube API.
//
// UWAGA: youtubei.js to moduł ESM, więc importujemy przez dynamic import.

"use strict";

const CLIENT_ORDER = ["IOS", "ANDROID"];
const CACHE_TTL_MS = 60 * 1000; // 1 minuta — YouTube URL-y wygasają szybko, trzymamy świeże dane
const CACHE_MAX_ENTRIES = 200;

let innertubePromise = null;
let ClientType = null;

const cache = new Map(); // key: `${videoId}|${quality}|${format}` -> { value, expires }
const clientInstances = new Map();

async function loadYoutubei() {
  if (innertubePromise) return innertubePromise;
  innertubePromise = (async () => {
    const mod = await import("youtubei.js");
    ClientType = mod.ClientType;
    return mod;
  })();
  return innertubePromise;
}

function cacheKey(videoId, quality, format) {
  return `${videoId}|${quality || "best"}|${format || "auto"}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  // Move to end for LRU-ish behaviour
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function setCached(key, value, ttl = CACHE_TTL_MS) {
  cache.set(key, { value, expires: Date.now() + ttl });
  if (cache.size > CACHE_MAX_ENTRIES) {
    // Drop oldest entry
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expires < now) {
      cache.delete(key);
    }
  }
}, 60_000);

async function getClient(clientName) {
  const { Innertube } = await loadYoutubei();
  if (!ClientType?.[clientName]) {
    throw new Error(`youtubei.js missing client ${clientName}`);
  }
  if (clientInstances.has(clientName)) {
    return clientInstances.get(clientName);
  }
  const yt = await Innertube.create({
    client_type: ClientType[clientName],
    retrieve_player: true,
  });
  clientInstances.set(clientName, yt);
  return yt;
}

function pickFormat(info, format) {
  // youtubei.js powinno respektować `quality: 'best'`, ale chcemy preferowanego mime.
  // Najpierw spróbuj formatu zgodnego z preferencją, potem fallback na 'best'.
  const want = String(format || "").toLowerCase();
  const matchesMime = (mime) => {
    const m = String(mime || "").toLowerCase();
    if (want === "opus") return m.includes("opus") || m.includes("webm");
    if (want === "m4a" || want === "aac" || want === "mp4") return m.includes("mp4") || m.includes("m4a") || m.includes("aac");
    if (want === "mp3") return false;
    return true;
  };

  // Najpierw filtrowane formaty audio z preferowanego mime
  const adaptiveAudio = (info.streaming_data?.adaptive_formats || [])
    .filter((f) => f.has_audio && !f.has_video && matchesMime(f.mime_type))
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  if (adaptiveAudio.length) return adaptiveAudio[0];

  try {
    return info.chooseFormat({ type: "audio", quality: "best" });
  } catch {
    return null;
  }
}

function extractExpiry(url) {
  try {
    const match = String(url).match(/[?&]expire=(\d+)/);
    if (match) return Number(match[1]) * 1000;
  } catch {
    /* ignore */
  }
  return null;
}

function parseDuration(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  if (/^\d+$/.test(value)) return Number(value);
  const parts = value.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((seconds, part) => seconds * 60 + part, 0);
}

async function tryClient(clientName, videoId, format) {
  const yt = await getClient(clientName);
  const info = await yt.getBasicInfo(videoId);
  const fmt = pickFormat(info, format);
  if (!fmt) throw new Error("No audio format available");

  const url =
    fmt.url ||
    (typeof fmt.decipher === "function"
      ? await fmt.decipher(yt.session.player)
      : null);
  if (!url || typeof url !== "string") throw new Error("Decipher returned no URL");

  let contentLength = null;
  if (fmt.content_length) {
    contentLength = Number(fmt.content_length);
  }
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) {
      const hdr = Number(head.headers.get("content-length") || 0);
      if (hdr > 0) contentLength = hdr;
    }
  } catch {
    /* ignore HEAD failure */
  }

  const vd = info.basic_info || {};
  return {
    url,
    mimeType: fmt.mime_type || "audio/mpeg",
    bitrate: fmt.bitrate || fmt.average_bitrate || null,
    contentLength,
    durationMs: fmt.approx_duration_ms ? Number(fmt.approx_duration_ms) : null,
    audioQuality: fmt.audio_quality || null,
    itag: fmt.itag || null,
    title: vd.title || null,
    author: vd.author || null,
    thumbnail:
      Array.isArray(vd.thumbnail) && vd.thumbnail.length
        ? vd.thumbnail[vd.thumbnail.length - 1]?.url
        : null,
    durationSeconds: parseDuration(vd.duration),
    client: clientName,
    expiresAt: extractExpiry(url),
  };
}

async function getStreamUrl(videoId, { format = "auto", quality = "best" } = {}) {
  if (!videoId || typeof videoId !== "string") {
    return { error: "Invalid videoId" };
  }
  const key = cacheKey(videoId, quality, format);
  const cached = getCached(key);
  if (cached) return { ...cached, fromCache: true };

  const errors = [];
  for (const client of CLIENT_ORDER) {
    try {
      const result = await tryClient(client, videoId, format);
      setCached(key, result);
      return result;
    } catch (err) {
      errors.push(`${client}: ${err.message || err}`);
    }
  }
  return {
    error: `Could not extract stream URL. Tried clients: ${errors.join(" | ")}`,
  };
}

function clearCache(videoId) {
  if (!videoId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${videoId}|`)) cache.delete(key);
  }
}

module.exports = {
  getStreamUrl,
  clearCache,
};
