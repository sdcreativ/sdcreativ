"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

/** Cache léger client-side (alternative légère à SWR pour stats header). */
export function useCrmFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleMs = 30_000,
): { data: T | null; loading: boolean; refresh: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcherRef.current();
      cache.set(key, { data: result, fetchedAt: Date.now() });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    const hit = cache.get(key) as CacheEntry<T> | undefined;
    if (hit && Date.now() - hit.fetchedAt < staleMs) {
      setData(hit.data);
      setLoading(false);
      return;
    }
    void refresh();
  }, [key, staleMs, refresh]);

  return { data, loading, refresh };
}
