import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { STORAGE_KEYS } from '@/config/constants';
import { getLogoutRedirectTarget } from '@/lib/auth';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;     // 15 min
const ACTIVITY_THROTTLE_MS = 30 * 1000;     // throttle storage writes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointermove'] as const;

function readLastActivity(): number {
  if (typeof window === 'undefined') return Date.now();
  const v = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
  if (!v) return Date.now();
  const n = Number(v);
  return Number.isFinite(n) ? n : Date.now();
}

function writeLastActivity() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
}

/**
 * Auto-logout after inactivity. The last-activity timestamp is persisted to
 * localStorage so the timer survives tab close, sleep, and laptop shutdown —
 * a session left idle overnight is detected on next page load.
 *
 * Returns `expired` state and a `confirmLogout` callback that triggers a hard
 * reload to /auth/login (clean React state, no stale store).
 */
export function useIdleTimeout(timeoutMs = IDLE_TIMEOUT_MS) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWriteRef = useRef<number>(0);
  const [expired, setExpired] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const confirmLogout = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Resolve the redirect target BEFORE logout — logout clears SSO_RETURN_URL.
    const target = getLogoutRedirectTarget();
    // Invalidate the session BEFORE redirect — `/auth/login` bounces
    // authenticated users back to /overview via auth/layout.tsx, so we must
    // first flip `isAuthenticated` to false (Zustand persist writes the new
    // state to localStorage synchronously). Then hard-reload to tear down any
    // stale React state / open dialogs / in-flight requests.
    useAuthStore.getState().logout();
    window.location.replace(target);
  }, []);

  const armTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const remaining = timeoutMs - (Date.now() - readLastActivity());
    if (remaining <= 0) {
      setExpired(true);
      return;
    }
    timerRef.current = setTimeout(() => setExpired(true), remaining);
  }, [timeoutMs]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window === 'undefined') return;
    // Once expired, stop tracking — the dialog is shown and we're awaiting
    // logout. Effect cleanup tears down all listeners.
    if (expired) return;

    // First check on mount: detect sessions resumed past the idle window
    // (e.g. laptop closed overnight, tab reopened next day). This is genuine
    // external→internal state sync, so the direct setState is intentional.
    if (Date.now() - readLastActivity() > timeoutMs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpired(true);
      return;
    }

    writeLastActivity();
    armTimer();

    const onActivity = () => {
      const now = Date.now();
      if (now - lastWriteRef.current >= ACTIVITY_THROTTLE_MS) {
        lastWriteRef.current = now;
        writeLastActivity();
      }
      armTimer();
    };

    // Activity in another tab keeps this one alive; expiry in another tab
    // propagates to this one.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.LAST_ACTIVITY) return;
      if (Date.now() - readLastActivity() > timeoutMs) setExpired(true);
      else armTimer();
    };

    // Re-check when tab becomes visible — covers laptop sleep / app backgrounding
    // where setTimeout is paused but wallclock keeps moving.
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - readLastActivity() > timeoutMs) setExpired(true);
      else armTimer();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, timeoutMs, armTimer, expired]);

  return { expired, confirmLogout };
}
