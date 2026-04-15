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
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { useTranslation } from '@/i18n';
import { Loader2, LogIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const { isAuthenticated, isAppCodeVerified, _hasHydrated } = useAuthStore();
  const [ready, setReady] = useState(false);

  // Auto-logout after inactivity — shows dialog instead of instant redirect
  const { expired, confirmLogout } = useIdleTimeout();

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

  return (
    <>
      {children}

      <Dialog open={expired}>
        <DialogContent
          className="sm:max-w-[380px] p-8"
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <span className="text-6xl" role="img" aria-label="sleeping">😴</span>
            <div className="space-y-2">
              <DialogHeader className="items-center">
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {t('sessionExpiredTitle')}
                </DialogTitle>
              </DialogHeader>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                {t('sessionExpiredDescription')}
              </DialogDescription>
            </div>
            <Button onClick={confirmLogout} size="lg" className="w-full gap-2 rounded-xl h-12 text-base font-semibold mt-1">
              <LogIn className="h-5 w-5" />
              {t('relogin')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
