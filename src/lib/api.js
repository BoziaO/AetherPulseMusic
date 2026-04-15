export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

export function buildApiUrl(path) {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function fetchJson(path, options = {}) {
  const url = buildApiUrl(path);
  
  // Include credentials for session handling and add a timeout
  const controller = new AbortController();
  const timeoutMs = options.timeout || 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  options.signal = controller.signal;
  options.credentials = options.credentials || "include";

  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Żądanie przerwane (timeout ${timeoutMs}ms)`);
    throw new Error(`Błąd połączenia z API (${url}): ${err.message}. Upewnij się, że serwer backendu działa (spróbuj 'npm run dev').`);
  } finally {
    clearTimeout(timeoutId);
  }
  
  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    if (response.status === 401) {
      // Potentially redirect or handle auth error
    }
    
    let errorBody = {};
    if (contentType && contentType.includes("application/json")) {
      errorBody = await response.json().catch(() => ({}));
    } else {
      const text = await response.text();
      errorBody = { error: `Błąd serwera (${response.status}): ${text.slice(0, 100)}...` };
    }
    throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
  }
  
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Serwer zwrócił HTML zamiast JSON (prawdopodobnie 404 lub przekierowanie). Sprawdź czy backend działa. Odpowiedź: ${text.slice(0, 100)}...`);
  }
  
  return response.json();
}
