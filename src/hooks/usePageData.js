import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";

export default function usePageData(pageKey) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPageData() {
      if (!pageKey) return;
      
      try {
        setLoading(true);
        const pageData = await fetchJson(`/api/page/${pageKey}`);
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
  }, [pageKey]);

  return {
    data,
    loading,
    error,
  };
}
