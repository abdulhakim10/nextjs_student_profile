/**
 * Support deep links into the help-desk.
 *
 *   • Contact support → the guest create page, pre-filled with the user's info:
 *       {HELPDESK_URL}?name=…&email=…&phone=…&uid=…&appcode=…&module=…
 *   • My tickets      → the public, email-filtered ticket list:
 *       {TICKETS_URL}?public=1&email=…
 *
 * Both are files/lists the user owns; the create page pre-fills the form and
 * the tickets page shows only tickets whose customerEmail matches (central
 * tenant — see the discussion notes).
 */

import type { UserData } from '@/types';
import { STORAGE_KEYS } from '@/config/constants';
import { API_CONFIG } from '@/config/api';

const HELPDESK_URL = process.env.NEXT_PUBLIC_SUPPORT_HELPDESK_URL;
const TICKETS_URL = process.env.NEXT_PUBLIC_SUPPORT_TICKETS_URL;
// This app's module tag — travels in the create deep link so the guest
// ticket is filed under the originating app's module (rather than the
// support system's own default). The id is the canonical link the support
// form uses to preselect the module (and scope its issue types); the name
// rides along as a human-readable fallback.
const MODULE_NAME = process.env.NEXT_PUBLIC_MODULE_NAME;
const MODULE_ID = process.env.NEXT_PUBLIC_MODULE_ID;

/**
 * Decode the `app_code` claim from the encrypted-key JWT in localStorage. The
 * key is a signed JWT whose payload is base64url — readable client-side without
 * the signing secret (we only read a claim, we don't verify). Returns null on
 * any fault so the caller can fall back.
 */
function decodeAppCode(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_KEY);
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { app_code?: unknown };
    return typeof payload.app_code === 'string' ? payload.app_code : null;
  } catch {
    return null;
  }
}

/**
 * Build the help-desk "Contact support" deep link pre-filled with the user's
 * info. Returns null when `NEXT_PUBLIC_SUPPORT_HELPDESK_URL` isn't configured.
 */
export function buildSupportPortalUrl(userData: UserData | null): string | null {
  if (!HELPDESK_URL) return null;

  const params = new URLSearchParams();
  const name = userData?.user_name?.trim();
  const email = userData?.user_email?.trim();
  const phone = userData?.user_phone_num?.trim();
  const uid = userData?.user_id?.trim();
  const appcode = decodeAppCode() ?? API_CONFIG.DEFAULT_APP;
  const moduleName = MODULE_NAME?.trim();
  const moduleId = MODULE_ID?.trim();

  if (name) params.set('name', name);
  if (email) params.set('email', email);
  if (phone) params.set('phone', phone);
  if (uid) params.set('uid', uid);
  if (appcode) params.set('appcode', appcode);
  if (moduleName) params.set('module', moduleName);
  // The support form matches on `moduleId` first, so send it whenever this
  // app has one configured.
  if (moduleId) params.set('moduleId', moduleId);

  return `${HELPDESK_URL}?${params.toString()}`;
}

/** Open the "Contact support" create page in a new tab (no-op if unconfigured). */
export function openSupportPortal(userData: UserData | null): void {
  const url = buildSupportPortalUrl(userData);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Build the "My tickets" deep link — the public, email-filtered ticket list.
 * Returns null when `NEXT_PUBLIC_SUPPORT_TICKETS_URL` isn't configured or the
 * user has no email (the list is scoped entirely by email).
 */
export function buildMyTicketsUrl(userData: UserData | null): string | null {
  if (!TICKETS_URL) return null;
  const email = userData?.user_email?.trim();
  if (!email) return null;
  const params = new URLSearchParams({ public: '1', email });
  return `${TICKETS_URL}?${params.toString()}`;
}

/** Open the "My tickets" list in a new tab (no-op if unconfigured / no email). */
export function openMyTickets(userData: UserData | null): void {
  const url = buildMyTicketsUrl(userData);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
