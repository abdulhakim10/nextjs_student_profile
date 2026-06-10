/**
 * Role split — the module renders two views from one codebase:
 *
 *   admin    — `system_level` contains "admin" (backend sends "Admin"/"ADMIN").
 *              Full admin chrome, but the My Page tab is hidden.
 *   employee — everyone else. ONLY their own My Page: no admin tabs,
 *              no AI assistant, no command-palette search.
 *
 * This is UX, not security — the backend services still enforce access
 * server-side and 403 unauthorized calls regardless of what the UI shows.
 * Consumers: app-sidebar (tab filter + home link), app-header (AI/search
 * buttons), app-shell (panel mounting), RoleRouteGuard (admin routes),
 * and the entry redirects (/, /auth/login, /auth/layout, /auth/sso).
 *
 * TEMPLATE NOTE: when forking, rename the employee home to the module's
 * own-data page (attendance `/profile`, leave `/leave`, salary
 * `/my-payroll`, claim `/claim`) and replace the placeholder
 * `(dashboard)/my-page` route.
 */

import { STORAGE_KEYS } from '@/config/constants';

export type Role = 'admin' | 'employee';

/** Derive the view role from the login/SSO `system_level`. Case-insensitive
 *  substring so "Admin", "ADMIN" and "SuperAdmin" all count; missing or
 *  unknown levels default to the least-privileged employee view. */
export function deriveRole(
  user: { system_level?: string } | null | undefined,
): Role {
  const level = (user?.system_level || '').toLowerCase();
  return level.includes('admin') ? 'admin' : 'employee';
}

/** Default landing per role — admin quick-access vs the user's own page. */
export function roleHome(role: Role): string {
  return role === 'admin' ? '/overview' : '/my-page';
}

/** Per-tab view-role override — set by /auth/sso from the hub's SSO `role`
 *  query param (employee-view cards send 'employee'; tiles and admin-view
 *  cards send 'admin'). DOWNGRADE-ONLY: 'employee' forces the employee view
 *  for everyone; 'admin' never escalates a real employee past deriveRole. */
export function resolveViewRole(
  user: { system_level?: string } | null | undefined,
): Role {
  if (
    typeof window !== 'undefined' &&
    sessionStorage.getItem(STORAGE_KEYS.ROLE_OVERRIDE) === 'employee'
  ) {
    return 'employee';
  }
  return deriveRole(user);
}

/** In-module view switch (header ViewSwitchChip, REAL admins only) — writes
 *  the per-tab override so the next load renders the chosen view. Mirrors
 *  main_view's hero chip. Still downgrade-only in effect: resolveViewRole
 *  ignores an 'admin' override for real employees (deriveRole caps it). */
export function setViewRole(role: Role): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEYS.ROLE_OVERRIDE, role);
}
