export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Domyślne opcje retry — exponential backoff z jitter.
const DEFAULT_RETRY = {
  attempts: 3,
  baseDelayMs: 400,
  maxDelayMs: 4000,
  retryStatuses: [408, 429, 500, 502, 503, 504],
};

const networkStatus = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { networkStatus.online = true; });
  window.addEventListener("offline", () => { networkStatus.online = false; });
}

export function buildApiUrl(path) {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldRetry(error, response, retryConfig) {
  if (response && retryConfig.retryStatuses.includes(response.status)) return true;
  if (!response && error?.name !== "AbortError" && error?.name !== "TypeError") {
    // Network/connection errors are retry-able
    return true;
  }
  // TypeError ("Failed to fetch") = network-level — retry
  if (error?.name === "TypeError") return true;
  return false;
}

export async function fetchJson(path, options = {}) {
  const url = buildApiUrl(path);
  const timeoutMs = options.timeout || 10000;
  const retryConfig = { ...DEFAULT_RETRY, ...(options.retry || {}) };

  // Mutacje (POST/PUT/DELETE) nie powinny być automatycznie retry'owane,
  // chyba że użytkownik świadomie ustawi `retry`.
  const isMutating = options.method && options.method !== "GET";
  const maxAttempts = isMutating && !options.retry ? 1 : Math.max(1, retryConfig.attempts);

  let lastError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!networkStatus.online) {
      throw new Error("Brak połączenia z internetem.");
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    const requestOptions = {
      ...options,
      signal: controller.signal,
      credentials: options.credentials || "include",
    };
    let response = null;
    try {
      response = await fetch(url, requestOptions);
    } catch (err) {
      lastError = err;
      window.clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        // Timeout — można retry jeśli pozwolono
        if (attempt + 1 < maxAttempts && !isMutating) {
          await sleep(jitter(retryConfig.baseDelayMs, attempt, retryConfig.maxDelayMs));
          continue;
        }
        throw new Error(`Zadanie przerwane (timeout ${timeoutMs}ms)`);
      }
      if (shouldRetry(err, null, retryConfig) && attempt + 1 < maxAttempts) {
        await sleep(jitter(retryConfig.baseDelayMs, attempt, retryConfig.maxDelayMs));
        continue;
      }
      throw new Error(`Błąd połączenia z API (${url}): ${err.message}. Upewnij się, że backend działa.`);
    } finally {
      window.clearTimeout(timeoutId);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      // Retry dla wybranych statusów
      if (shouldRetry(null, response, retryConfig) && attempt + 1 < maxAttempts) {
        await sleep(jitter(retryConfig.baseDelayMs, attempt, retryConfig.maxDelayMs));
        continue;
      }
      let errorBody = {};
      if (contentType.includes("application/json")) {
        errorBody = await response.json().catch(() => ({}));
      } else {
        const text = await response.text();
        errorBody = { error: `Błąd serwera (${response.status}): ${text.slice(0, 120)}` };
      }
      throw new Error(errorBody.error || `HTTP error: ${response.status}`);
    }

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Serwer zwrócił odpowiedź inną niż JSON: ${text.slice(0, 120)}`);
    }

    return response.json();
  }

  throw lastError || new Error("Nieznany błąd zapytania API");
}

function jitter(base, attempt, max) {
  const exp = base * 2 ** attempt;
  const capped = Math.min(exp, max);
  return Math.floor(capped * (0.7 + Math.random() * 0.3));
}

export async function fetchSong(videoId) {
  return fetchJson(`/api/ytmusic/song/${videoId}`);
}

// Status sieci (dla komponentów chcących pokazać "offline" UI)
export function isOnline() {
  return networkStatus.online;
}

export function onNetworkChange(handler) {
  if (typeof window === "undefined") return () => {};
  const onlineHandler = () => handler({ online: true });
  const offlineHandler = () => handler({ online: false });
  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);
  return () => {
    window.removeEventListener("online", onlineHandler);
    window.removeEventListener("offline", offlineHandler);
  };
}
