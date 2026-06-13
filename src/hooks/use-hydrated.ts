import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns `false` on the server and the first client render, then `true` once
 * hydrated — without a setState-in-effect (uses `useSyncExternalStore`).
 *
 * Use it to gate client-only reads (theme, localStorage) so the first render
 * matches the server and there's no hydration mismatch:
 *
 *   const hydrated = useHydrated();
 *   const activeTheme = hydrated ? theme : undefined;
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
