import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";

export default function usePageData(pageKey, queryParams = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
