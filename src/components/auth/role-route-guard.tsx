/**
 * RoleRouteGuard — Route-level gate for the admin half of the module.
 *
 * Sits inside `AuthGuard` so the user is already authenticated and the auth
 * store is hydrated by the time this runs. Checks the current pathname
 * against `ADMIN_ROUTE_PREFIXES`; if it matches and the user's view role
 * (derived from `system_level`, see lib/role.ts) is employee, redirects to
 * My Page — the only surface the employee view exposes.
 *
 * Admins are NOT blocked from /my-page (the tab is hidden for them, but
 * the hub's "My …" role-aware launch may land anyone there).
 *
 * This is UX, not security — the backend services enforce the same gate
 * server-side and return 403 regardless. Pattern mirrors salary_view's
 * RoleRouteGuard.
 *
 * TEMPLATE NOTE: when forking, keep this list in sync with the module's
 * admin routes (and exclude its own-data page).
 */

'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { resolveViewRole, roleHome } from '@/lib/role';

/** Path prefixes that belong to the admin view. */
const ADMIN_ROUTE_PREFIXES = [
  '/overview',
  '/dashboard',
  '/users',
  '/tutorial',
];

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

export function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useAuthStore();

  const blocked =
    isAdminRoute(pathname) && resolveViewRole(userData) === 'employee';

  useEffect(() => {
    if (blocked) {
      router.replace(roleHome('employee'));
    }
  }, [blocked, router]);

  if (blocked) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
