/**
 * Theme contract for cross-origin carryover via SSO URL param.
 *
 * `next-themes` stores the user's preference in `localStorage['theme']` with
 * one of three values: 'light' | 'dark' | 'system'. We carry the *preference*
 * (not `resolvedTheme`) across origins so 'system' stays 'system' on the
 * receiver — matches the lang carryover philosophy (pass what the user picked,
 * not the OS-derived current state).
 *
 * Cross-origin localStorage is sandboxed (see [[project_locale_carryover]] for
 * the same reasoning around locale), so the URL is the only channel.
 */
export type Theme = 'light' | 'dark' | 'system';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}
