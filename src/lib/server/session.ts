/**
 * ============================================================================
 * Server session — SERVER ONLY. Never import from client components.
 * ============================================================================
 *
 * The backend credentials never reach the browser. They live in two httpOnly
 * cookies, each sealed (AES-256-GCM, key derived from SESSION_SECRET), so the
 * browser only ever holds ciphertext it cannot read or forge:
 *
 *   sp_ak  appcode key (`x-encrypted-key`) — selects the tenant (school DB).
 *          Set when /auth/appcode or /auth/sso/verify succeeds.
 *   sp_us  viewer credentials (bearer token + `x-encrypted-user`).
 *          Set on login / SSO, cleared on logout.
 *
 * They are separate because logging out keeps the school (appcode) but drops
 * the user, and to keep each cookie well under the 4 KB browser limit.
 *
 * The cookie name is bound into the seal (AAD), so a value sealed for one
 * cookie can't be replayed as the other.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';

if (typeof window !== 'undefined') {
  throw new Error('lib/server/session must not be imported in the browser');
}

export const APP_KEY_COOKIE = 'sp_ak';
export const USER_COOKIE = 'sp_us';

const DEFAULT_APP_KEY_TTL = 30 * 24 * 3600; // seconds — used if the JWT has no exp
const DEFAULT_USER_TTL = 7 * 24 * 3600;

export class SessionConfigError extends Error {}

let cachedKey: Buffer | null = null;
function secretKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new SessionConfigError('SESSION_SECRET is missing or shorter than 32 characters');
  }
  cachedKey = createHash('sha256').update(secret).digest();
  return cachedKey;
}

function seal(name: string, payload: object): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  cipher.setAAD(Buffer.from(name));
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64url');
}

function unseal<T extends { exp: number }>(name: string, raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, 'base64url');
    if (buf.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', secretKey(), buf.subarray(0, 12));
    decipher.setAAD(Buffer.from(name));
    decipher.setAuthTag(buf.subarray(12, 28));
    const json = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
    const data = JSON.parse(json) as T;
    if (!data.exp || data.exp * 1000 < Date.now()) return null;
    return data;
  } catch (err) {
    if (err instanceof SessionConfigError) throw err;
    return null; // tampered, wrong secret, or malformed
  }
}

/** Reads a claim from a JWT payload without verifying it (we only use exp / app_code). */
export function jwtClaim(token: string | undefined, claim: string): unknown {
  if (!token) return undefined;
  const part = token.split('.')[1];
  if (!part) return undefined;
  try {
    return (JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>)[claim];
  } catch {
    return undefined;
  }
}

function ttlFor(token: string, fallback: number): number {
  const exp = Number(jwtClaim(token, 'exp'));
  if (Number.isFinite(exp) && exp > 0) {
    const remaining = Math.floor(exp - Date.now() / 1000);
    if (remaining > 0) return Math.min(remaining, fallback);
  }
  return fallback;
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

export interface ServerSession {
  appKey: string | null;
  token: string | null;
  encryptedUser: string | null;
}

export function readSession(request: NextRequest): ServerSession {
  const ak = unseal<{ k: string; exp: number }>(APP_KEY_COOKIE, request.cookies.get(APP_KEY_COOKIE)?.value);
  const us = unseal<{ t?: string; u?: string; exp: number }>(USER_COOKIE, request.cookies.get(USER_COOKIE)?.value);
  return { appKey: ak?.k ?? null, token: us?.t ?? null, encryptedUser: us?.u ?? null };
}

/** Headers for a backend call made on behalf of the session's viewer. */
export function backendHeaders(session: ServerSession): Record<string, string> {
  const h: Record<string, string> = {};
  if (session.appKey) h['x-encrypted-key'] = session.appKey;
  if (session.encryptedUser) h['x-encrypted-user'] = session.encryptedUser;
  if (session.token) h['Authorization'] = `Bearer ${session.token}`;
  return h;
}

export function setAppKeyCookie(res: NextResponse, appKey: string) {
  const maxAge = ttlFor(appKey, DEFAULT_APP_KEY_TTL);
  res.cookies.set(APP_KEY_COOKIE, seal(APP_KEY_COOKIE, { k: appKey, exp: Math.floor(Date.now() / 1000) + maxAge }), cookieOptions(maxAge));
}

export function setUserCookie(res: NextResponse, token: string | undefined, encryptedUser: string | undefined) {
  const maxAge = token ? ttlFor(token, DEFAULT_USER_TTL) : DEFAULT_USER_TTL;
  res.cookies.set(
    USER_COOKIE,
    seal(USER_COOKIE, { t: token, u: encryptedUser, exp: Math.floor(Date.now() / 1000) + maxAge }),
    cookieOptions(maxAge)
  );
}

export function clearUserCookie(res: NextResponse) {
  res.cookies.set(USER_COOKIE, '', cookieOptions(0));
}

export function clearAllCookies(res: NextResponse) {
  res.cookies.set(APP_KEY_COOKIE, '', cookieOptions(0));
  clearUserCookie(res);
}

/**
 * CSRF guard for cookie-authenticated, state-changing requests. Credentials
 * now ride on cookies, so a request must come from our own pages:
 * Sec-Fetch-Site (all modern browsers) or, failing that, Origin vs Host.
 * Safe methods (GET/HEAD) are allowed — they must not change state.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return true;
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
