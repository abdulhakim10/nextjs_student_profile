'use client';

import { useRef, useMemo } from 'react';

/**
 * Guards async fetches against stale responses when filters change rapidly.
 *
 *   const guard = useFetchGuard();
 *   useEffect(() => {
 *     const id = guard.begin();
 *     api.get(...).then((res) => {
 *       if (guard.isStale(id)) return;
 *       setData(res);
 *     });
 *   }, [...]);
 *
 * The returned object is stable across renders, so it's safe to include in
 * useEffect / useCallback dependency arrays.
 */
export function useFetchGuard() {
  const ref = useRef(0);
  return useMemo(() => ({
    begin: () => ++ref.current,
    isStale: (id: number) => id !== ref.current,
  }), []);
}
