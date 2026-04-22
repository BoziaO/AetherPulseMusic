import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";

// Pages that are handled entirely client-side — no backend /api/page/:key call needed
const CLIENT_ONLY_PAGES = new Set(["favorites", "recent", "artist", "album"]);

export default function usePageData(pageKey, queryParams = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!CLIENT_ONLY_PAGES.has(pageKey));
  const [error, setError] = useState(null);

  useEffect(() => {
    // Skip API call for pages driven purely by local state
    if (CLIENT_ONLY_PAGES.has(pageKey)) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    async function fetchPageData() {
      if (!pageKey) return;

      try {
        setLoading(true);
        const query = new URLSearchParams(queryParams).toString();
        const url = `/api/page/${pageKey}${query ? `?${query}` : ""}`;
        const pageData = await fetchJson(url);
        setData(pageData);
        setError(null);
      } catch (err) {
        console.error(`Page data error for ${pageKey}:`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, JSON.stringify(queryParams)]);

  return {
    data,
    loading,
    error,
  };
}