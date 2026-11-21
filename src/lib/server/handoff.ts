/**
 * SPS → Student Profile login handoff — SERVER ONLY.
 *
 * The SPS portal seals its viewer's login (sps nextjs_sps src/app/api/handoff)
 * with STUDENT_PROFILE_HANDOFF_SECRET — the same value lives in both .env files.
 * We unseal it here and turn it into our normal httpOnly session cookies, so
 * the user lands signed in instead of on the login page.
 *
 * Format (keep in sync with SPS): base64url( iv[12] | tag[16] | ciphertext ),
 * AES-256-GCM, key = sha256(secret), AAD = "sps-handoff-v1".
 * A blob is valid for 60 s and can be used once (per server instance).
 */
import { createDecipheriv, createHash } from 'node:crypto';

if (typeof window !== 'undefined') {
  throw new Error('lib/server/handoff must not be imported in the browser');
}

const AAD = 'sps-handoff-v1';

export interface HandoffPayload {
  /** appcode key (x-encrypted-key) */
  k: string;
  /** bearer token */
  t: string;
  /** x-encrypted-user */
  u?: string;
  /** Non-secret display data from SPS */
  appcode: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  jti: string;
  exp: number;
}

export class HandoffConfigError extends Error {}

/** jti → expiry (ms); blocks replaying a blob within its 60 s life */
const used = new Map<string, number>();

export function openHandoff(raw: string): HandoffPayload | null {
  const secret = process.env.STUDENT_PROFILE_HANDOFF_SECRET;
  if (!secret || secret.length < 32) throw new HandoffConfigError('STUDENT_PROFILE_HANDOFF_SECRET is not set');

  let data: HandoffPayload;
  try {
    const buf = Buffer.from(raw, 'base64url');
    if (buf.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), buf.subarray(0, 12));
    decipher.setAAD(Buffer.from(AAD));
    decipher.setAuthTag(buf.subarray(12, 28));
    data = JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8'));
  } catch {
    return null; // tampered, wrong secret, or malformed
  }

  const now = Date.now();
  if (!data?.k || !data.t || !data.jti || !data.exp || data.exp * 1000 < now) return null;
  for (const [id, exp] of used) if (exp < now) used.delete(id);
  if (used.has(data.jti)) return null;
  used.set(data.jti, data.exp * 1000);
  return data;
}
