/**
 * Module key registry + this-build's identity. Kept in sync with main_view's
 * `src/config/modules.ts` so the receiver-side App Launcher's `moduleKey`
 * values are type-checked against the canonical list.
 *
 * Receivers never read module URLs — every tile click routes through
 * `${main}/dashboard?launch=<key>` and main resolves the destination via
 * its own MODULE_URLS registry.
 */
export type ModuleKey = 'attendance' | 'leave' | 'recruitment' | 'salary' | 'claim' | 'cms';

/**
 * The module this build of the app represents. The App Launcher reads it to
 * highlight the matching tile as a "you are here" indicator.
 *
 * base_view is a generic template (not a deployed module), so this is `null`
 * here — the launcher renders without a current-module highlight. When you
 * fork base_view to build a real module, replace this with the matching
 * ModuleKey (e.g. `'claim'` for claim_view).
 */
export const CURRENT_MODULE: ModuleKey | null = null;

/**
 * Which `system_access` keys grant a module's App Launcher tile — mirror of
 * main_view's MODULE_ACCESS_KEYS (access-structure decision, 2026-06-06):
 *   hrms → attendance · leave → leave · salary → salary · claim → claim
 *   cms → cms · recruitment → recruitment
 * NOTE: the school-side `attendance` key is student attendance, NOT the HRM
 * staff-attendance module — staff attendance is `hrms`.
 */
export const MODULE_ACCESS_KEYS: Record<ModuleKey, string[]> = {
  attendance: ['hrms'],
  leave: ['leave'],
  salary: ['salary'],
  claim: ['claim'],
  cms: ['cms'],
  recruitment: ['recruitment'],
};

/** True when the user's `system_access` (pipe-delimited) unlocks the module.
 *  Exact key matching, same as main_view's hasAccess — stricter than the
 *  backend's substring checks, so launcher-visible ⊆ backend-authorized. */
export function canAccessModule(
  systemAccess: string | undefined,
  key: ModuleKey,
): boolean {
  if (!systemAccess) return false;
  const keys = systemAccess.split('|').map((k) => k.trim().toLowerCase());
  return MODULE_ACCESS_KEYS[key].some((rk) => keys.includes(rk.toLowerCase()));
}
