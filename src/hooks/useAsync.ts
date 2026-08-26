import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiState } from '../types';

/**
 * Runs an async fetcher on mount (and whenever `deps` change), exposing
 * standard loading/error/data state plus a `refetch` function.
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): ApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Something went wrong.';
          setState({ data: null, loading: false, error: message });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { ...state, refetch };
}
