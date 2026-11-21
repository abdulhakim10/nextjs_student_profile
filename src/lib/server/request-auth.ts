/**
 * Request credentials — SERVER ONLY.
 *
 * Same model as the other Awfatech modules (attendance, SPS, main): the
 * browser keeps the login in localStorage and sends it on every request as
 * `Authorization`, `x-encrypted-key` and `x-encrypted-user` (lib/auth.ts
 * getAuthHeaders). API routes that call the backend for the viewer read them
 * from the incoming request here.
 */
import type { NextRequest } from 'next/server';

if (typeof window !== 'undefined') {
  throw new Error('lib/server/request-auth must not be imported in the browser');
}

export interface RequestAuth {
  appKey: string | null;
  token: string | null;
  encryptedUser: string | null;
}

export function readRequestAuth(request: NextRequest): RequestAuth {
  const bearer = request.headers.get('authorization');
  return {
    appKey: request.headers.get('x-encrypted-key'),
    token: bearer?.replace(/^Bearer\s+/i, '') || null,
    encryptedUser: request.headers.get('x-encrypted-user'),
  };
}

/** Headers for a backend call made on behalf of the viewer. */
export function backendHeaders(auth: RequestAuth): Record<string, string> {
  const h: Record<string, string> = {};
  if (auth.appKey) h['x-encrypted-key'] = auth.appKey;
  if (auth.encryptedUser) h['x-encrypted-user'] = auth.encryptedUser;
  if (auth.token) h['Authorization'] = `Bearer ${auth.token}`;
  return h;
}

/** Only our own pages may call (defence in depth for state-changing requests). */
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
