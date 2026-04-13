export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

export function buildApiUrl(path) {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function fetchJson(path, options = {}) {
  const url = buildApiUrl(path);
  
  // Inclue credentials for session handling
  options.credentials = options.credentials || 'include';
  
  const response = await fetch(url, options).catch(err => {
    throw new Error(`Błąd połączenia z API (${url}): ${err.message}. Upewnij się, że serwer backendu działa (spróbuj 'npm run dev').`);
  });
  
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
