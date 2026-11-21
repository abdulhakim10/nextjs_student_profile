/**
 * Auth-response capture for /api/proxy — SERVER ONLY.
 * Moves credentials from appcode / SSO / login responses into the sealed
 * session cookies and strips them from the JSON sent to the browser.
 */
import type { NextResponse } from 'next/server';
import { clearUserCookie, jwtClaim, setAppKeyCookie, setUserCookie } from './session';

export type AuthAction = 'appcode' | 'sso-verify' | 'login' | 'logout' | null;

/** Which auth step a path is — drives cookie capture / clearing. */
export function authAction(path: string): AuthAction {
  const p = path.replace(/^\/+/, '');
  const m = p.match(/^api\/v\d+\/auth\/(.+)$/);
  if (!m) return null;
  const rest = m[1];
  if (rest === 'appcode') return 'appcode';
  if (rest === 'sso/verify') return 'sso-verify';
  if (/^[^/]+\/[^/]+\/login$/.test(rest)) return 'login';
  if (/^[^/]+\/[^/]+\/logout$/.test(rest)) return 'logout';
  return null;
}

/** Paths that legitimately run before the tenant key exists. */
export const PRE_SESSION: AuthAction[] = ['appcode', 'sso-verify'];

/**
 * Moves credentials from an auth response into the session cookies and
 * strips them from the JSON. Adds the non-secret `app_code` claim so the
 * client no longer needs to decode the key itself.
 */
export type CookieOp = (res: NextResponse) => void;

export function captureCredentials(action: AuthAction, bodyText: string, ops: CookieOp[]): string {
  let json: { success?: boolean; data?: Record<string, unknown> | null };
  try {
    json = JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
  const data = json?.data;
  if (!json?.success || !data || typeof data !== 'object') return bodyText;

  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const appKey = str(data.encrypted_key);
  if ((action === 'appcode' || action === 'sso-verify') && appKey) {
    ops.push((r) => setAppKeyCookie(r, appKey));
    const appCode = jwtClaim(appKey, 'app_code');
    if (typeof appCode === 'string') data.app_code = appCode;
    // a new tenant invalidates whichever user was signed in before
    if (action === 'appcode') ops.push(clearUserCookie);
  }
  if (action === 'login' || action === 'sso-verify') {
    const token = str(data.token);
    const encryptedUser = str(data.encrypted_user);
    if (token || encryptedUser) ops.push((r) => setUserCookie(r, token, encryptedUser));
  }
  delete data.encrypted_key;
  delete data.token;
  delete data.encrypted_user;
  return JSON.stringify(json);
}

