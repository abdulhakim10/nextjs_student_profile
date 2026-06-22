/**
 * Module key registry + this-build's identity. Kept in sync with main_view's
 * `src/config/modules.ts` so the receiver-side App Launcher's `moduleKey`
 * values are type-checked against the canonical list.
 *
 * Receivers never read module URLs — every tile click routes through
 * `${main}/dashboard?launch=<key>` and main resolves the destination via
 * its own MODULE_URLS registry.
 */
export type ModuleKey = 'attendance' | 'leave' | 'recruitment' | 'salary' | 'claim' | 'cms' | 'user' | 'client' | 'staff' | 'supplier';

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
 * main_view's MODULE_ACCESS_KEYS. A module lists the key(s) that unlock it;
 * one match is enough (OR) unless it's in MODULE_ACCESS_REQUIRE_ALL (AND).
 *   estaff → attendance · leave → leave · salary → salary · claim → claim
 *   cms → cms · hrms → recruitment · collection → client · payment → supplier
 *   estaff → staff · billing + collection + estaff → user (ALL three)
 */
export const MODULE_ACCESS_KEYS: Record<ModuleKey, string[]> = {
  attendance: ['estaff'],
  leave: ['leave'],
  salary: ['salary'],
  claim: ['claim'],
  cms: ['cms'],
  recruitment: ['hrms'],
  // User-admin app needs ALL of: billing + collection + estaff (see REQUIRE_ALL).
  user: ['billing', 'collection', 'estaff'],
  client: ['collection'],
  staff: ['estaff'],
  supplier: ['payment'],
};

/**
 * Modules that require ALL of their keys (AND). Every other module needs just
 * one of its keys (OR). `user` (the full user-admin app) needs billing +
 * collection + estaff together.
 */
export const MODULE_ACCESS_REQUIRE_ALL: ReadonlySet<ModuleKey> = new Set<ModuleKey>([
  'user',
]);

/** True when the user's `system_access` (pipe-delimited) unlocks the module.
 *  Exact key matching, same as main_view's hasAccess — stricter than the
 *  backend's substring checks, so launcher-visible ⊆ backend-authorized. */
export function canAccessModule(
  systemAccess: string | undefined,
  key: ModuleKey,
): boolean {
  if (!systemAccess) return false;
  const keys = systemAccess.split('|').map((k) => k.trim().toLowerCase());
  return MODULE_ACCESS_REQUIRE_ALL.has(key)
    ? MODULE_ACCESS_KEYS[key].every((rk) => keys.includes(rk.toLowerCase()))
    : MODULE_ACCESS_KEYS[key].some((rk) => keys.includes(rk.toLowerCase()));
}

/**
 * Modules whose tiles show for ANY admin regardless of system_access — their
 * real permission keys aren't wired yet (the user app + its quick-access deep
 * links). Mirrors main_view's UNGATED_MODULES.
 */
export const UNGATED_MODULES: ReadonlySet<ModuleKey> = new Set<ModuleKey>([]);

/** True when the module's tile bypasses the system_access gate. */
export function isUngatedModule(key: ModuleKey): boolean {
  return UNGATED_MODULES.has(key);
}
