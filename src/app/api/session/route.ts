/**
 * DELETE /api/session          — clears the user credentials (manual / idle logout;
 *                                 the school stays selected)
 * DELETE /api/session?scope=all — clears the school key too (force logout)
 *
 * The cookies are httpOnly, so the browser can only drop them through here.
 */
import { NextRequest, NextResponse } from 'next/server';
import { clearAllCookies, clearUserCookie, isSameOriginRequest } from '@/lib/server/session';

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 403 });
  const res = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  if (request.nextUrl.searchParams.get('scope') === 'all') clearAllCookies(res);
  else clearUserCookie(res);
  return res;
}
