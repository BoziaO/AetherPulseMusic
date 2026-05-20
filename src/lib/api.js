/**
 * Wykrywa czy aplikacja działa w środowisku mobilnym (Capacitor/Native).
 */
export const isCapacitor = () => {
  return typeof window !== 'undefined' && 
         ((window.Capacitor && window.Capacitor.isNativePlatform) || 
          /Android|iPhone|iPad/i.test(navigator.userAgent));
};

/**
 * Dynamicznie pobiera bazowy adres API. 
 * W Electronie używamy adresu wykrytego przez proces główny.
 */
export const getApiBaseUrl = () => {
  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('_manual_api_url') : null;
  if (savedUrl) return savedUrl;

  if (isCapacitor()) {
    return import.meta.env.VITE_API_BASE_URL || "";
  }
  const electronBackend = typeof window !== 'undefined' ? localStorage.getItem('_electron_backend_url') : null;
  return electronBackend || import.meta.env.VITE_API_BASE_URL || "";
};

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

/**
 * Sprawdza czy aplikacja działa w trybie Standalone (bez backendu).
 */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  
  const hasApiUrl = !!getApiBaseUrl();
  
  // Jeśli jesteśmy na mobile, ale mamy skonfigurowany adres serwera, NIE jesteśmy w trybie standalone
  if (isCapacitor()) {
    return !hasApiUrl;
  }
  return localStorage.getItem('_electron_is_standalone') === 'true';
}

export function buildApiUrl(path) {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${cleanPath}`;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldRetry(error, response, retryConfig) {
  if (response && retryConfig.retryStatuses.includes(response.status)) return true;
  if (!response && error?.name === "AbortError") return false;
  if (!response && error?.name === "TypeError") {
    // Only retry on genuine network failures ("Failed to fetch"), not on logic errors
    // e.g. invalid URLs, header violations — those have consistent messages
    const msg = error?.message || "";
    return msg.includes("fetch") || msg.includes("network") || msg.includes("Failed");
  }
  if (!response && error) return true;
  return false;
}

export async function fetchJson(path, options = {}) {
  const isStandaloneMode = isStandalone();
  const timeoutMs = options.timeout || 10000;
  const retryConfig = { ...DEFAULT_RETRY, ...(options.retry || {}) };
  const externalSignal = options.signal || null;

  // W trybie Standalone przechwytujemy zapytania wymagające serwera (YTMusic, rekomendacje, strony)
  if (isStandaloneMode) {
    const isRemoteRequest = 
      path.includes('/api/ytmusic/') || 
      path.includes('/api/recommendations/') || 
      path.includes('/api/page/') ||
      path.includes('/api/flows/');

    if (isRemoteRequest) {
      console.warn(`[API] Standalone Mode: Przechwycono zapytanie do ${path}. Zwracanie danych lokalnych.`);
      // Zwracamy puste tablice dla list, aby UI nie "wisiał" na ładowaniu i pokazał puste stany
      if (path.includes('search') || path.includes('charts') || path.includes('related')) return [];
      return null;
    }
  }

  const url = buildApiUrl(path);

  // Mutacje (POST/PUT/DELETE) nie powinny być automatycznie retry'owane,
  // chyba że użytkownik świadomie ustawi `retry`.
  const isMutating = options.method && options.method !== "GET";
  const maxAttempts = isMutating && !options.retry ? 1 : Math.max(1, retryConfig.attempts);

  let lastError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Sprawdź zewnętrzny sygnał przed każdą próbą
    if (externalSignal?.aborted) {
      const err = new DOMException("Aborted", "AbortError");
      throw err;
    }
    if (!networkStatus.online) {
      throw new Error("Brak połączenia z internetem.");
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    // Propaguj zewnętrzny AbortSignal do wewnętrznego controllera
    const externalAbortHandler = externalSignal
      ? () => controller.abort()
      : null;
    if (externalSignal && externalAbortHandler) {
      externalSignal.addEventListener("abort", externalAbortHandler, { once: true });
    }

    const requestOptions = {
      ...options,
      signal: controller.signal,
      credentials: options.credentials || "include",
    };
    // Nie przekazuj dalej naszych własnych opcji do fetch
    delete requestOptions.timeout;
    delete requestOptions.retry;

    let response = null;
    try {
      response = await fetch(url, requestOptions);
    } catch (err) {
      lastError = err;
      window.clearTimeout(timeoutId);
      if (externalSignal && externalAbortHandler) {
        externalSignal.removeEventListener("abort", externalAbortHandler);
      }
      if (err.name === "AbortError") {
        // Zewnętrzny abort (np. user zmienił query) — propaguj bez retries
        if (externalSignal?.aborted) throw err;
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
      if (externalSignal && externalAbortHandler) {
        externalSignal.removeEventListener("abort", externalAbortHandler);
      }
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
