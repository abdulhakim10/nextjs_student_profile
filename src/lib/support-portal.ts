/**
 * "Need support" deep link.
 *
 * Sends the logged-in user to the support help-desk's guest create page,
 * pre-filled with their info, via query params:
 *   {HELPDESK_URL}?name=…&email=…&phone=…&uid=…&appcode=…
 * where HELPDESK_URL is the /help-desk/create route. The create page reads
 * these on load and pre-fills the form; the user files a guest ticket there
 * (central tenant — see the discussion notes).
 */

import type { UserData } from '@/types';
import { STORAGE_KEYS } from '@/config/constants';
import { API_CONFIG } from '@/config/api';

const HELPDESK_URL = process.env.NEXT_PUBLIC_SUPPORT_HELPDESK_URL;

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
 * Build the help-desk "Need support" deep link pre-filled with the user's info.
 * Returns null when `NEXT_PUBLIC_SUPPORT_HELPDESK_URL` isn't configured.
 */
export function buildSupportPortalUrl(userData: UserData | null): string | null {
  if (!HELPDESK_URL) return null;

  const params = new URLSearchParams();
  const name = userData?.user_name?.trim();
  const email = userData?.user_email?.trim();
  const phone = userData?.user_phone_num?.trim();
  const uid = userData?.user_id?.trim();
  const appcode = decodeAppCode() ?? API_CONFIG.DEFAULT_APP;

  if (name) params.set('name', name);
  if (email) params.set('email', email);
  if (phone) params.set('phone', phone);
  if (uid) params.set('uid', uid);
  if (appcode) params.set('appcode', appcode);

  return `${HELPDESK_URL}?${params.toString()}`;
}

/** Open the support portal in a new tab (no-op if the URL isn't configured). */
export function openSupportPortal(userData: UserData | null): void {
  const url = buildSupportPortalUrl(userData);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
