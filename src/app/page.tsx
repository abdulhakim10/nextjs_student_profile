'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { resolveViewRole, roleHome } from '@/lib/role';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isAppCodeVerified, _hasHydrated, userData } =
    useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;

    if (isAuthenticated) {
      // Admin → /overview; employee → /my-page (see lib/role.ts).
      router.replace(roleHome(resolveViewRole(userData)));
    } else if (isAppCodeVerified) {
      router.replace('/auth/login');
    } else {
      router.replace('/auth/appcode');
    }
  }, [_hasHydrated, isAuthenticated, isAppCodeVerified, userData, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg animate-pulse" />
          <Loader2 className="relative h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
