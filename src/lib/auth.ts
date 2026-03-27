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

import { STORAGE_KEYS } from '@/config/constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Zustand persist key — must match the `name` in auth.store.ts persist config */
export const AUTH_STORAGE_KEY = 'auth-storage';

// ---------------------------------------------------------------------------
// Auth Headers
// ---------------------------------------------------------------------------

/**
 * Reads auth tokens from localStorage and returns them as HTTP headers.
 * Used by both Axios interceptor (api-client.ts) and AI service (ai.service.ts).
 *
 * @param options.skipEncrypted - If true, omits x-encrypted-key/user headers
 *                                (used for appcode endpoint which doesn't need them)
 */
export function getAuthHeaders(options?: { skipEncrypted?: boolean }): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window === 'undefined') return headers;

  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const encryptedKey = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_KEY);
  const encryptedUser = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_USER);

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!options?.skipEncrypted) {
    if (encryptedKey) headers['x-encrypted-key'] = encryptedKey;
    if (encryptedUser) headers['x-encrypted-user'] = encryptedUser;
  }

  return headers;
}

// ---------------------------------------------------------------------------
// Storage Cleanup
// ---------------------------------------------------------------------------

/**
 * Clears login-session keys only. Keeps appcode data (encrypted_key, server_id)
 * so the user can re-login without re-entering the organization code.
 *
 * Used by: manual logout (auth.store logout action)
 */
export function clearSessionStorage() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_USER);
  localStorage.removeItem(STORAGE_KEYS.FIREBASE_ID);
}

/**
 * Clears ALL auth-related keys from localStorage, including appcode data.
 * After this, the user must start fresh from the appcode screen.
 *
 * Used by: forceLogout (401 handler)
 */
export function clearAllAuthStorage() {
  if (typeof window === 'undefined') return;

  // Login keys
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_USER);
  localStorage.removeItem(STORAGE_KEYS.FIREBASE_ID);

  // Appcode keys
  localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_KEY);
  localStorage.removeItem(STORAGE_KEYS.SERVER_ID);
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
