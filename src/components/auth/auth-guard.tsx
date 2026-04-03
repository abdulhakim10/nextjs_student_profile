/**
 * ============================================================================
 * AuthGuard — Client-side route protection for dashboard pages
 * ============================================================================
 *
 * Wraps the dashboard layout to prevent unauthenticated access.
 *
 * Hydration Flow:
 *   1. Page loads → Zustand persist middleware restores state from localStorage
 *   2. onRehydrateStorage fires → _hasHydrated = true
 *   3. AuthGuard checks auth flags and decides:
 *      - No appcode  → redirect to /auth/appcode
 *      - No login     → redirect to /auth/login
 *      - Authenticated → render dashboard children
 *
 * Why _hasHydrated matters:
 *   Without it, Zustand starts with default state (isAuthenticated = false)
 *   before localStorage is read. This would flash a redirect to the login page
 *   even for authenticated users. The hydration guard prevents this.
 *
 * 401 Force Logout:
 *   When forceLogout() (lib/auth.ts) clears localStorage and the Zustand
 *   persist key, the hard redirect reloads the page. On reload, Zustand
 *   hydrates from the now-empty storage → isAuthenticated = false → redirect.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isAppCodeVerified, _hasHydrated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAppCodeVerified) {
      router.replace('/auth/appcode');
    } else if (!isAuthenticated) {
      router.replace('/auth/login');
    } else {
      setReady(true);
    }
  }, [_hasHydrated, isAuthenticated, isAppCodeVerified, router]);

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
