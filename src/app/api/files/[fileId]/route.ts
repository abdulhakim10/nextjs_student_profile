/**
 * GET /api/files/<fileId>?student=<uid> — server proxy for CONFIDENTIAL files.
 * (token-url only mints tokens for confidential files; internal files use
 * signed URLs and public files their own url — this route refuses those.)
 *
 *   a) AUTHORISE FIRST. The file server hands any fileId to anyone holding a
 *      tenant key, so the "may this viewer see it" decision is ours: we load
 *      the student record with the VIEWER'S OWN credentials and require the
 *      fileId to appear in what comes back. If the viewer can't load the
 *      record, they can't load the file. Tenant scoping comes from the
 *      viewer's appcode key — a fileId from another school isn't found.
 *   b) Mint a fresh single-use token (token-url) under the FILE's own
 *      {fsApp, fsUser}.
 *   c) Fetch the bytes server-side once with `x-file-token`. Never retried —
 *      the token is consumed by the first successful fetch.
 *   d) Stream them back, never cacheable by a CDN / shared cache.
 *
 * The viewer's credentials come from the request headers (lib/server/request-auth),
 * so call it with fetch() + getAuthHeaders() — a plain <img src> / <a href>
 * can't send them. The file token never reaches the browser.
 */
import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_CONFIG } from '@/config/api';
import { backendHeaders, readRequestAuth } from '@/lib/server/request-auth';
import { FileServerError, FS_BASE, mintFileToken } from '@/lib/server/file-server';
import { accessFromUrl, fsPair, isFileId, resolveAccess, type FileRecord } from '@/lib/files';

const UID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MIME_RE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
/** Types safe to render inline from our origin; everything else downloads. */
const INLINE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']);

const NO_STORE: Record<string, string> = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  Vary: 'Authorization, x-encrypted-key, x-encrypted-user',
};

function fail(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status, headers: NO_STORE });
}

/** Hosts we will send a file token to. */
function isTrustedFileHost(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    const fsHost = new URL(FS_BASE).hostname;
    return u.hostname === fsHost || u.hostname === 'awfatech.com' || u.hostname.endsWith('.awfatech.com');
  } catch {
    return false;
  }
}

/** True if a string is the fileId or a URL with the fileId as a whole path segment. */
function stringRefersTo(value: string, fileId: string): boolean {
  if (value === fileId) return true;
  if (!value.includes(fileId)) return false;
  return value.split(/[/?#]/).includes(fileId);
}

/**
 * Searches the record the viewer was allowed to load for this fileId.
 * Returns the file record when one is embedded ({ fileId, … }), or a bare
 * match when only a URL string refers to it (ASIS stores photos that way).
 */
function findFile(
  node: unknown,
  fileId: string,
  depth = 0
): { record: Partial<FileRecord>; matchedUrl?: string } | null {
  if (depth > 12 || node === null || node === undefined) return null;
  if (typeof node === 'string') return stringRefersTo(node, fileId) ? { record: {}, matchedUrl: node } : null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findFile(item, fileId, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (obj.fileId === fileId) return { record: obj as Partial<FileRecord> };
    for (const v of Object.values(obj)) {
      const hit = findFile(v, fileId, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

function contentDisposition(name: string, inline: boolean): string {
  const clean = name.replace(/[\r\n"\\]/g, '').replace(/[/]/g, '_').slice(0, 180) || 'file';
  const ascii = clean.replace(/[^\x20-\x7e]/g, '_');
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const studentUid = request.nextUrl.searchParams.get('student') ?? '';
  if (!isFileId(fileId) || !UID_RE.test(studentUid)) return fail(400, 'Bad request');

  try {
    const session = readRequestAuth(request);
    if (!session.appKey || !(session.token || session.encryptedUser)) return fail(401, 'Unauthorized');

    // a) authorise: load the record as the viewer
    const recordRes = await fetch(
      `${API_BASE_URL}/api/${API_CONFIG.VERSION}/user/${API_CONFIG.STUDENT_APP}/student/profile/${encodeURIComponent(studentUid)}`,
      { headers: backendHeaders(session), cache: 'no-store', signal: AbortSignal.timeout(20_000) }
    );
    if (recordRes.status === 401) return fail(401, 'Unauthorized');
    const recordJson = (await recordRes.json().catch(() => null)) as { success?: boolean; data?: unknown } | null;
    if (!recordRes.ok || !recordJson?.success || !recordJson.data) return fail(404, 'Not found');

    const hit = findFile(recordJson.data, fileId);
    // same response as "no such file" — don't confirm existence to an unauthorised viewer
    if (!hit) return fail(404, 'Not found');
    const record = hit.record;

    // Tier: the record's own field; else the tier in the URL it was found by;
    // else (no access at all) the documented default, internal.
    const access = resolveAccess({ access: record.access ?? accessFromUrl(record.url ?? hit.matchedUrl) });
    if (access !== 'confidential') return fail(400, `Not a confidential file (${access})`);

    const pair = fsPair(record);
    if (!pair) {
      console.error('[files] record has an app/user the file server does not accept', fileId, record.fsApp, record.fsUser);
      return fail(502, 'File unavailable');
    }
    const { fsApp, fsUser } = pair;

    // b) fresh single-use token for this request only
    const { token, url: tokenUrl } = await mintFileToken(session.appKey, fsApp, fsUser, fileId);
    // docs: GET the file's url with x-file-token (token-url may also return one)
    const target = tokenUrl ?? (typeof record.url === 'string' ? record.url : hit.matchedUrl ?? null);
    if (!target || !isTrustedFileHost(target)) {
      console.error('[files] no trusted URL to fetch', fileId);
      return fail(502, 'File unavailable');
    }

    // c) one fetch, no retry; redirects refused so the token can't be forwarded elsewhere
    const upstream = await fetch(target, {
      headers: { 'x-file-token': token },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(60_000),
    });
    if (!upstream.ok || !upstream.body) {
      console.error(`[files] upstream ${upstream.status} for ${fileId}`);
      return fail(upstream.status === 404 ? 404 : 502, 'File unavailable');
    }

    // d) stream back
    const recordMime = typeof record.mimeType === 'string' && MIME_RE.test(record.mimeType) ? record.mimeType : null;
    const upstreamMime = upstream.headers.get('content-type')?.split(';')[0].trim() ?? '';
    const mime = (recordMime ?? (MIME_RE.test(upstreamMime) ? upstreamMime : 'application/octet-stream')).toLowerCase();
    const inline = INLINE_TYPES.has(mime);
    const name =
      (typeof record.originalName === 'string' && record.originalName) ||
      (typeof record.filename === 'string' && record.filename) ||
      fileId;

    const headers: Record<string, string> = {
      ...NO_STORE,
      'Content-Type': mime,
      'Content-Disposition': contentDisposition(name, inline),
    };
    // PDFs need the browser viewer; everything else is locked down
    if (mime !== 'application/pdf') {
      headers['Content-Security-Policy'] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox";
    }
    const len = upstream.headers.get('content-length');
    if (len && /^\d+$/.test(len)) headers['Content-Length'] = len;

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (err) {
    if (err instanceof FileServerError) return fail(err.status === 404 ? 404 : 502, 'File unavailable');
    console.error('[files]', err);
    return fail(502, 'File unavailable');
  }
}
