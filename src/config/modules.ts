/**
 * Module registry — kept in sync with main_view's `src/config/modules.ts`
 * so the App Launcher in this module knows the canonical list of HRM
 * modules to offer as "switch to" tiles.
 *
 * Receivers don't need module URLs (they route via main_view's
 * `/dashboard?launch=<key>` hop), so only keys + the convention port
 * comments are tracked here.
 */
export const MODULE_URLS = {
  attendance:    'http://localhost:40001',
  // leave:        'http://localhost:40002',
  // recruitment:  'http://localhost:40003',
  salary:        'http://localhost:40004',
  // claim:        'http://localhost:40005',
} as const;

export type ModuleKey = keyof typeof MODULE_URLS;
