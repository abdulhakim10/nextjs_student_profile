/**
 * Module key registry — kept in sync with main_view's `src/config/modules.ts`
 * so the receiver-side App Launcher's `moduleKey` values are type-checked
 * against the canonical list.
 *
 * Receivers never read module URLs (every tile click routes through
 * `${main}/dashboard?launch=<key>` and main resolves the destination via
 * its own MODULE_URLS + LIVE_MODULES). So this file only exports the type.
 */
export type ModuleKey = 'attendance' | 'leave' | 'recruitment' | 'salary' | 'claim';
