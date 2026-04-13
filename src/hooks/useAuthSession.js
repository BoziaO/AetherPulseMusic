import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";

export default function useAuthSession() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchSession() {
    try {
      setLoading(true);
      const sessionData = await fetchJson("/api/auth/session");
      setData(sessionData);
      setError(null);
    } catch (err) {
      console.error("Auth session error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSession();
  }, []);

  return {
    data,
    loading,
    error,
    refresh: fetchSession,
  };
}
