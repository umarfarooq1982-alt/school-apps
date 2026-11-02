import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './client';
import { clearSharedPrefix, setShared, useShared } from '../store';
import { toast } from '../components/ui';

export type Query<T> = {
  data: T | undefined;
  loading: boolean; // first load, nothing to show yet
  refreshing: boolean; // reloading while old data is shown
  error: string | null;
  refresh: () => Promise<void>;
  setData: (next: T | ((prev: T | undefined) => T)) => void;
};

// Loads data for a screen. Results are cached under `key`, so going back to a
// screen shows the last data at once and refreshes it in the background.
export function useApi<T>(key: string | null, fetcher: () => Promise<T>): Query<T> {
  const cacheKey = `api:${key ?? '-'}`;
  const [data, setData] = useShared<T | undefined>(cacheKey, undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!key) {
      return;
    }
    const mine = ++seq.current;
    setBusy(true);
    setError(null);
    try {
      const out = await fetchRef.current();
      if (mine === seq.current) {
        setShared(cacheKey, out);
      }
    } catch (e) {
      if (mine === seq.current) {
        setError(errorMessage(e));
      }
    } finally {
      if (mine === seq.current) {
        setBusy(false);
      }
    }
  }, [key, cacheKey]);

  useEffect(() => {
    load();
  }, [load]);

  const set = useCallback(
    (next: T | ((prev: T | undefined) => T)) =>
      setData(prev =>
        typeof next === 'function' ? (next as (p: T | undefined) => T)(prev) : next,
      ),
    [setData],
  );

  return {
    data,
    loading: busy && data === undefined,
    refreshing: busy && data !== undefined,
    error,
    refresh: load,
    setData: set,
  };
}

// Runs a save/submit call: shows a toast on error and returns the result
// (or undefined when it failed).
export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>, okMessage?: string) {
  const [busy, setBusy] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setBusy(true);
      try {
        const out = await fnRef.current(...args);
        if (okMessage) {
          toast(okMessage);
        }
        return out;
      } catch (e) {
        toast(errorMessage(e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [okMessage],
  );
  return { run, busy };
}

// Drops cached API data, e.g. after switching child or campus.
export function invalidate(prefix = '') {
  clearSharedPrefix(`api:${prefix}`);
}
