export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function buildApiUrl(path) {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function fetchJson(path, options = {}) {
  const url = buildApiUrl(path);
  const controller = new AbortController();
  const timeoutMs = options.timeout || 10000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const requestOptions = {
    ...options,
    signal: controller.signal,
    credentials: options.credentials || "include",
  };

  let response;
  try {
    response = await fetch(url, requestOptions);
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Zadanie przerwane (timeout ${timeoutMs}ms)`);
    }
    throw new Error(`Blad polaczenia z API (${url}): ${err.message}. Upewnij sie, ze backend dziala (npm run dev).`);
  } finally {
    window.clearTimeout(timeoutId);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    let errorBody = {};
    if (contentType.includes("application/json")) {
      errorBody = await response.json().catch(() => ({}));
    } else {
      const text = await response.text();
      errorBody = { error: `Blad serwera (${response.status}): ${text.slice(0, 120)}` };
    }
    throw new Error(errorBody.error || `HTTP error: ${response.status}`);
  }

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Serwer zwrocil odpowiedz inna niz JSON: ${text.slice(0, 120)}`);
  }

  return response.json();
}
