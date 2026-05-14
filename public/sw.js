// AetherPulse Service Worker — v2
// Strategie cache:
// - /assets/*       : cache-first (immutable, hashed by Vite)
// - /api/page/*     : stale-while-revalidate (charts, moods, home)
// - /api/recommendations/* : stale-while-revalidate (60s TTL)
// - /api/lyrics/*   : stale-while-revalidate (długa świeżość)
// - /api/ytmusic/song/* : stale-while-revalidate
// - /api/ytmusic/*  : network-first z fallbackiem
// - /api/downloads/stream/* : NIGDY nie cache (strumień binarny)
// - obrazy/audio    : stale-while-revalidate
// - reszta          : network-first z fallback do cache i index.html dla nawigacji

const CACHE_VERSION = "v2";
const STATIC_CACHE = `aetherpulse-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `aetherpulse-runtime-${CACHE_VERSION}`;
const API_CACHE = `aetherpulse-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icon.svg",
];

// Czas życia cache dla różnych typów
const TTL = {
  api: 5 * 60 * 1000,       // 5 minut
  recommendations: 60 * 1000, // 1 minuta
  lyrics: 60 * 60 * 1000,   // 1 godzina
  image: 7 * 24 * 60 * 60 * 1000, // 7 dni
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(name))
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function isExpired(cachedResponse, ttl) {
  if (!cachedResponse) return true;
  const dateHeader = cachedResponse.headers.get("sw-cached-at");
  if (!dateHeader) return false;
  return Date.now() - Number(dateHeader) > ttl;
}

async function withTimestamp(response) {
  // Dodaj nagłówek `sw-cached-at` przed zapisaniem do cache
  const cloned = response.clone();
  const headers = new Headers(cloned.headers);
  headers.set("sw-cached-at", String(Date.now()));
  const body = await cloned.blob();
  return new Response(body, {
    status: cloned.status,
    statusText: cloned.statusText,
    headers,
  });
}

async function staleWhileRevalidate(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        const stamped = await withTimestamp(response);
        cache.put(request, stamped.clone());
        return stamped;
      }
      return response;
    })
    .catch(() => null);

  // Jeśli mamy świeży cache, zwróć go natychmiast i odśwież w tle
  if (cached && !isExpired(cached, ttl)) {
    network.catch(() => {}); // run in background
    return cached;
  }
  // Inaczej czekaj na sieć i fallback do cache (nawet starego)
  const fresh = await network;
  if (fresh) return fresh;
  if (cached) return cached;
  throw new Error("network and cache miss");
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

function fallbackResponse(request) {
  if (request.mode === "navigate") {
    return caches.match("/index.html");
  }
  return caches.match(request);
}

// ----------------------------------------------------------------------
// Fetch routing
// ----------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Tylko cache same-origin (poza /api YouTube proxies, które są na localhost)
  if (url.origin !== location.origin) return;

  // 1. /api/downloads/stream — nigdy nie cache
  if (url.pathname.startsWith("/api/downloads/")) {
    return; // domyślny fetch przez przeglądarkę
  }

  // 2. /api/recommendations — SWR krótki TTL
  if (url.pathname.startsWith("/api/recommendations/")) {
    event.respondWith(
      staleWhileRevalidate(request, API_CACHE, TTL.recommendations).catch(() => fallbackResponse(request)),
    );
    return;
  }

  // 3. /api/lyrics — SWR długi TTL
  if (url.pathname.startsWith("/api/lyrics/")) {
    event.respondWith(
      staleWhileRevalidate(request, API_CACHE, TTL.lyrics).catch(() => fallbackResponse(request)),
    );
    return;
  }

  // 4. /api/page i /api/ytmusic/song — SWR z TTL.api
  if (
    url.pathname.startsWith("/api/page/") ||
    url.pathname.startsWith("/api/ytmusic/song/") ||
    url.pathname.startsWith("/api/ytmusic/charts")
  ) {
    event.respondWith(
      staleWhileRevalidate(request, API_CACHE, TTL.api).catch(() => fallbackResponse(request)),
    );
    return;
  }

  // 5. /api/* — network-first (mutacje, sesyjne dane)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      networkFirst(request, API_CACHE).catch(() => fallbackResponse(request)),
    );
    return;
  }

  // 6. /assets/* (Vite hashed) — cache-first immutable
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 7. obrazy/audio — SWR
  if (request.destination === "image" || request.destination === "audio") {
    event.respondWith(
      staleWhileRevalidate(request, RUNTIME_CACHE, TTL.image).catch(() => fallbackResponse(request)),
    );
    return;
  }

  // 8. nawigacja / reszta — network-first z fallback do index.html
  event.respondWith(
    networkFirst(request, RUNTIME_CACHE).catch(() => fallbackResponse(request)),
  );
});

// Komunikacja z klientem (np. force update)
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
