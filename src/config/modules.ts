/**
 * Module key registry + this-build's identity. Kept in sync with main_view's
 * `src/config/modules.ts` so the receiver-side App Launcher's `moduleKey`
 * values are type-checked against the canonical list.
 *
 * Receivers never read module URLs — every tile click routes through
 * `${main}/dashboard?launch=<key>` and main resolves the destination via
 * its own MODULE_URLS registry.
 */
export type ModuleKey = 'attendance' | 'leave' | 'recruitment' | 'salary' | 'claim';

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
