import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSessionStorage } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointermove'] as const;

/**
 * Auto-logout after inactivity. Returns `expired` state and a `confirmLogout`
 * callback so the UI can show a dialog before redirecting.
 */
export function useIdleTimeout(timeoutMs = IDLE_TIMEOUT_MS) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expired, setExpired] = useState(false);

  const handleTimeout = useCallback(() => {
    setExpired(true);
  }, []);

  const confirmLogout = useCallback(() => {
    clearSessionStorage();
    logout();
    router.replace('/auth/login');
  }, [logout, router]);

  const resetTimer = useCallback(() => {
    if (expired) return; // Don't reset once expired
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleTimeout, timeoutMs);
  }, [handleTimeout, timeoutMs, expired]);

  useEffect(() => {
    if (expired) return; // Stop listening once expired

    resetTimer();

    const onActivity = () => resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [resetTimer, expired]);

  return { expired, confirmLogout };
}
