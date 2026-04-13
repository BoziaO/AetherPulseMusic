const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

function buildApiUrl(pathname) {
  if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
    return pathname;
  }

  return `${API_BASE_URL}${pathname}`;
}

async function fetchJson(pathname, options = {}) {
  const response = await fetch(buildApiUrl(pathname), {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload;
}

export { API_BASE_URL, buildApiUrl, fetchJson };
