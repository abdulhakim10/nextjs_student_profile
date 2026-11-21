/**
 * ============================================================================
 * Auth Utilities — Single source of truth for client-side authentication
 * ============================================================================
 *
 * This module centralizes all auth-related operations that touch localStorage
 * and browser state. Every part of the app that needs to read/write/clear
 * auth data should go through these functions.
 *
 * Architecture Overview:
 * ─────────────────────
 *   1. User logs in → setAppcodeData / setUserData (auth.store.ts)
 *      → stores tokens in localStorage via these utils
 *
 *   2. API calls attach headers automatically:
 *      - Axios services  → api-client.ts request interceptor calls getAuthHeaders()
 *      - AI service       → ai.service.ts calls getAuthHeaders() directly (uses fetch)
 *
 *   3. On 401 Unauthorized from any API:
 *      - Axios services  → api-client.ts response interceptor calls forceLogout()
 *      - AI service       → ai.service.ts authFetch wrapper calls forceLogout()
 *      - AI chat route    → propagates UnauthorizedError → client gets 401 → forceLogout()
 *
 *   4. User clicks "Log out":
 *      - Sidebar calls authService.logout() (backend) then auth.store logout()
 *      - auth.store logout() calls clearSessionStorage() — keeps appcode data
 *      - Router navigates to /auth/login (soft redirect, user can re-login)
 *
 * Storage Keys (by auth step):
 * ────────────────────────────
 *   Appcode step (kept on manual logout, cleared on forceLogout):
 *     - encrypted_key   : Encryption key (from appcode validation)
 *     - server_id       : Backend server identifier (from appcode)
 *
 *   Login step (cleared on both manual logout and forceLogout):
 *     - access_token    : Bearer token (from login)
 *     - encrypted_user  : Encrypted user payload (from login)
 *     - firebase_id     : Firebase registration ID (from login)
 *
 *   Zustand persist (cleared only on forceLogout):
 *     - auth-storage    : Zustand persisted store (appcode + login state)
 */

import { STORAGE_KEYS, SESSION_KEYS } from '@/config/constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Zustand persist key — must match the `name` in auth.store.ts persist config */
export const AUTH_STORAGE_KEY = 'auth-storage';

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------
//
// The backend credentials (appcode key, bearer token, encrypted user) are NOT
// stored in the browser. They live in sealed httpOnly cookies that only the
// Next.js server can read (lib/server/session.ts); /api/proxy and the other
// API routes attach them server-side. Same-origin fetch/axios send the cookies
// automatically, so client code attaches nothing.

/** Keys older builds stored credentials under — purged on load and on logout. */
const LEGACY_CREDENTIAL_KEYS = [
  STORAGE_KEYS.ENCRYPTED_KEY,
  STORAGE_KEYS.ACCESS_TOKEN,
  STORAGE_KEYS.ENCRYPTED_USER,
] as const;

export function purgeLegacyCredentials() {
  if (typeof window === 'undefined') return;
  LEGACY_CREDENTIAL_KEYS.forEach((k) => localStorage.removeItem(k));
}

/** Drops the server session cookies (httpOnly — only the server can clear them). */
function clearServerSession(scope: 'user' | 'all') {
  if (typeof window === 'undefined') return;
  // keepalive lets the request finish even if a redirect follows immediately
  fetch(`/api/session${scope === 'all' ? '?scope=all' : ''}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    keepalive: true,
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// SSO return URL
// ---------------------------------------------------------------------------

/**
 * Validate an SSO `from` URL before storing it as the idle-logout redirect
 * target. Accept only http(s) — blocks `javascript:`, `data:`, and other
 * dangerous schemes so a crafted URL can't redirect the user to attacker code.
 */
export function isSafeReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Where to send the user after they log out — back to the SSO launcher's
 * login page if they entered via SSO, otherwise the module's own /auth/login.
 *
 * IMPORTANT: call BEFORE invoking logout/clearSessionStorage — those flows
 * remove SSO_RETURN_URL from localStorage.
 */
export function getLogoutRedirectTarget(): string {
  if (typeof window === 'undefined') return '/auth/login';
  return localStorage.getItem(STORAGE_KEYS.SSO_RETURN_URL) || '/auth/login';
}

// ---------------------------------------------------------------------------
// Storage Cleanup
// ---------------------------------------------------------------------------

/**
 * Clears the login session (server cookie + local keys). Keeps the school
 * (appcode key cookie, server_id)
 * so the user can re-login without re-entering the organization code.
 *
 * Used by: manual logout (auth.store logout action)
 */
export function clearSessionStorage() {
  if (typeof window === 'undefined') return;

  clearServerSession('user');
  purgeLegacyCredentials();
  localStorage.removeItem(STORAGE_KEYS.FIREBASE_ID);
  localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
  localStorage.removeItem(STORAGE_KEYS.SSO_RETURN_URL);

  // Clear branch selector so next login doesn't inherit stale branch
  sessionStorage.removeItem(SESSION_KEYS.BRANCH_SID);
}

/**
 * Clears ALL auth-related keys from localStorage, including appcode data.
 * After this, the user must start fresh from the appcode screen.
 *
 * Used by: forceLogout (401 handler)
 */
export function clearAllAuthStorage() {
  if (typeof window === 'undefined') return;

  clearServerSession('all');
  purgeLegacyCredentials();

  // Login keys
  localStorage.removeItem(STORAGE_KEYS.FIREBASE_ID);
  localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
  localStorage.removeItem(STORAGE_KEYS.SSO_RETURN_URL);

  // Appcode keys
  localStorage.removeItem(STORAGE_KEYS.SERVER_ID);

  // Session state
  sessionStorage.removeItem(SESSION_KEYS.BRANCH_SID);
}

// ---------------------------------------------------------------------------
// Force Logout (401 handler)
// ---------------------------------------------------------------------------

/** Prevents multiple simultaneous logout redirects */
let isLoggingOut = false;

/**
 * Emergency logout triggered by a 401 Unauthorized response.
 *
 * Unlike a normal logout (which preserves appcode and soft-redirects to /auth/login),
 * forceLogout clears EVERYTHING including the Zustand persisted store, then does a
 * hard redirect to /auth/appcode. This ensures:
 *   1. No stale tokens remain in localStorage
 *   2. Zustand hydration picks up a clean state (no ghost "authenticated" flag)
 *   3. The user must re-enter their organization code
 *
 * The `isLoggingOut` guard prevents multiple 401 responses from triggering
 * concurrent redirects (e.g. parallel API calls all failing at once).
 */
export function forceLogout() {
  if (typeof window === 'undefined') return;
  if (isLoggingOut) return;
  isLoggingOut = true;

  // Clear all auth tokens (login + appcode)
  clearAllAuthStorage();

  // Clear Zustand persisted store so hydration starts from scratch
  localStorage.removeItem(AUTH_STORAGE_KEY);

  // Hard redirect — full page reload to reset all React state
  window.location.href = '/auth/appcode';
}
