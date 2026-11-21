/**
 * POST /api/handoff { h } — sign in from an SPS portal handoff
 * (see lib/server/handoff.ts). Sets the sealed session cookies exactly like
 * /auth/sso/verify does and returns only non-secret display data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { HandoffConfigError, openHandoff } from '@/lib/server/handoff';
import { isSameOriginRequest, jwtClaim, setAppKeyCookie, setUserCookie } from '@/lib/server/session';

/** Never let a credential slip into the JSON sent to the browser */
function strip(o: Record<string, unknown> | null, keys: string[]) {
  if (!o) return null;
  const copy = { ...o };
  for (const k of keys) delete copy[k];
  return copy;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { h?: unknown } | null;
  if (typeof body?.h !== 'string' || !body.h) return NextResponse.json({ success: false, message: 'Missing handoff' }, { status: 400 });

  let data;
  try {
    data = openHandoff(body.h);
  } catch (err) {
    if (err instanceof HandoffConfigError) return NextResponse.json({ success: false, message: err.message }, { status: 503 });
    throw err;
  }
  if (!data) return NextResponse.json({ success: false, message: 'Sign-in link expired or invalid — open Student Profile from the portal again.' }, { status: 401 });

  const appCode = jwtClaim(data.k, 'app_code');
  const appcode = strip(data.appcode, ['encrypted_key']);
  const res = NextResponse.json(
    {
      success: true,
      data: {
        appcode: appcode ? { ...appcode, ...(typeof appCode === 'string' ? { app_code: appCode } : {}) } : null,
        profile: strip(data.profile, ['token', 'encrypted_user']),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  setAppKeyCookie(res, data.k);
  setUserCookie(res, data.t, data.u);
  return res;
}
