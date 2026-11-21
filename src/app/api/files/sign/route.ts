/**
 * POST /api/files/sign — batch-signs INTERNAL files (profile photos).
 *
 * body:     { files: [{ fileId, fsApp?, fsUser? }, …] }   (max 200)
 * 200:      { success: true,  data: { [fileId]: signedUrl }, missing: [ids], expiresAt }
 * 4xx/5xx:  { success: false, message, data: {partial}, failed: [ids], upstreamStatus }
 *
 * Call once per page with every photo on it. Files are grouped by their own
 * {fsApp, fsUser} pair (a property of the file, not the viewer) and each group
 * is sent in chunks of 100 (the endpoint's maxItems). Pairs outside the file
 * server's App / User enums are rejected here rather than sent (they'd 422). The file server says
 * ~1 h; we report 45 min so clients re-sign well inside the window.
 *
 * Any upstream failure makes this a non-200 — never an empty map with 200.
 * The full upstream status + body is logged server-side; in development it is
 * also returned as `upstream` so it can be read from the browser's Network tab.
 *
 * The viewer's credentials come from the request headers (lib/server/request-auth).
 */
import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest, readRequestAuth } from '@/lib/server/request-auth';
import { FileServerError, SIGN_BATCH_LIMIT, signBatch } from '@/lib/server/file-server';
import { fsPair, isFileId } from '@/lib/files';

const MAX_FILES = 200;
const VALIDITY_MS = 45 * 60 * 1000;
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };
const EXPOSE_UPSTREAM = process.env.NODE_ENV !== 'production';

interface UpstreamFailure {
  pair: string;
  fileIds: string[];
  status: number;
  body?: string;
  requestBody?: unknown;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403, headers: NO_STORE });
  }
  try {
    const session = readRequestAuth(request);
    // Must be a signed-in viewer of a tenant, not just a selected school.
    if (!session.appKey || !(session.token || session.encryptedUser)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401, headers: NO_STORE });
    }

    const body = (await request.json().catch(() => null)) as { files?: unknown } | null;
    const files = Array.isArray(body?.files) ? body.files : null;
    if (!files || files.length === 0 || files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, message: `files must be an array of 1–${MAX_FILES} items` },
        { status: 400, headers: NO_STORE }
      );
    }

    // group by {fsApp, fsUser}, then chunk each group to the endpoint's limit
    const groups = new Map<string, { fsApp: string; fsUser: string; ids: Set<string> }>();
    const rejected: Array<{ fileId: string; reason: string }> = [];
    for (const f of files as Array<Record<string, unknown>>) {
      if (!f || !isFileId(f.fileId)) continue;
      const pair = fsPair({ fsApp: f.fsApp as string, fsUser: f.fsUser as string });
      if (!pair) {
        // would be a 422 upstream (App / User enums) — refuse locally, clearly
        rejected.push({ fileId: f.fileId, reason: `app/user not accepted by the file server: ${String(f.fsApp)}/${String(f.fsUser)}` });
        continue;
      }
      const key = `${pair.fsApp}/${pair.fsUser}`;
      if (!groups.has(key)) groups.set(key, { ...pair, ids: new Set() });
      groups.get(key)!.ids.add(f.fileId);
    }
    if (groups.size === 0) {
      return NextResponse.json(
        { success: false, message: rejected.length ? 'No file has an accepted app/user pair' : 'No valid fileIds', rejected },
        { status: 400, headers: NO_STORE }
      );
    }

    const calls: Array<{ pair: string; fsApp: string; fsUser: string; ids: string[] }> = [];
    for (const [pair, g] of groups) {
      const ids = [...g.ids].sort();
      for (let i = 0; i < ids.length; i += SIGN_BATCH_LIMIT) {
        calls.push({ pair, fsApp: g.fsApp, fsUser: g.fsUser, ids: ids.slice(i, i + SIGN_BATCH_LIMIT) });
      }
    }

    const expiresAt = Date.now() + VALIDITY_MS;
    const results = await Promise.allSettled(calls.map((c) => signBatch(session.appKey!, c.fsApp, c.fsUser, c.ids)));

    const data: Record<string, string> = {};
    const failures: UpstreamFailure[] = [];
    results.forEach((r, i) => {
      const c = calls[i];
      if (r.status === 'fulfilled') {
        Object.assign(data, r.value);
        return;
      }
      const err = r.reason;
      const up = err instanceof FileServerError ? err.upstream : undefined;
      if (!up) console.error(`[files/sign] ${c.pair} failed`, err);
      failures.push({ pair: c.pair, fileIds: c.ids, status: up?.status ?? 0, body: up?.body, requestBody: up?.requestBody });
    });

    if (failures.length || rejected.length) {
      const upstreamStatus = failures[0]?.status;
      return NextResponse.json(
        {
          success: false,
          message: failures.length
            ? `File server refused ${failures.length} of ${calls.length} sign request(s)`
            : `${rejected.length} file(s) have an app/user the file server does not accept`,
          upstreamStatus,
          data, // whatever did sign — the client still uses it
          failed: [...failures.flatMap((f) => f.fileIds), ...rejected.map((r) => r.fileId)],
          rejected,
          ...(EXPOSE_UPSTREAM ? { upstream: failures } : {}),
          expiresAt,
        },
        // upstream refusal → 502 (gateway), timeout/network → 504, only local rejections → 400
        { status: !failures.length ? 400 : upstreamStatus === 0 ? 504 : 502, headers: NO_STORE }
      );
    }

    // upstream said OK but left some ids out (not found / not internal)
    const missing = calls.flatMap((c) => c.ids).filter((id) => !data[id]);
    return NextResponse.json({ success: true, data, missing, expiresAt }, { headers: NO_STORE });
  } catch (err) {
    console.error('[files/sign]', err);
    return NextResponse.json({ success: false, message: 'Could not sign files' }, { status: 500, headers: NO_STORE });
  }
}
