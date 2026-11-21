/**
 * ============================================================================
 * Awfatech file server client — SERVER ONLY.
 * ============================================================================
 *
 * Every call here sends the tenant's appcode key (`x-encrypted-key`), which
 * opens every file of that school. It is read from the server session and
 * must never be returned to the browser.
 *
 * The version is pinned to /api/v2 on purpose — it does NOT follow
 * NEXT_PUBLIC_API_VERSION.
 *
 * `{app}/{user}` is a property of the FILE (fsApp / fsUser on the record),
 * not of the viewer.
 */
import { isFileId, isFsApp, isFsUser, SIGN_BATCH_LIMIT } from '@/lib/files';

export { SIGN_BATCH_LIMIT };

if (typeof window !== 'undefined') {
  throw new Error('lib/server/file-server must not be imported in the browser');
}

export const FS_BASE = (process.env.FS_BASE || 'https://api02.awfatech.com').replace(/\/+$/, '');
const FS_VERSION = 'v2';
const TIMEOUT_MS = 20_000;

export class FileServerError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Upstream HTTP status and raw body — for server logs / dev diagnostics only. */
    readonly upstream?: { status: number; body: string; url: string; requestBody: unknown }
  ) {
    super(message);
  }
}

function fsUrl(app: string, user: string, path: string): string {
  // checked here so an off-list pair fails clearly instead of as an upstream 422
  if (!isFsApp(app) || !isFsUser(user)) throw new FileServerError(`app/user not accepted by the file server: ${app}/${user}`, 400);
  return `${FS_BASE}/api/${FS_VERSION}/fs/${encodeURIComponent(app)}/${encodeURIComponent(user)}/file/${path}`;
}

async function post(url: string, appKey: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-encrypted-key': appKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* non-JSON body — handled below */
  }
  // a 2xx carrying { success: false } is a failure too
  if (!res.ok || !json || json.success === false) {
    // Full status + body + what we sent, server log only. The request body
    // holds only file ids — never the key, which is a header.
    console.error(
      `[FileServer] POST ${url} → HTTP ${res.status}\n  request: ${JSON.stringify(body)}\n  response: ${text}`
    );
    throw new FileServerError('File server request failed', res.status === 404 ? 404 : 502, {
      status: res.status,
      body: text,
      url,
      requestBody: body,
    });
  }
  return json;
}

/**
 * POST …/file/generate/signed-url/batch — callers chunk to SIGN_BATCH_LIMIT
 * per {app,user} pair. Returns fileId → signed URL (browser-safe, ~1 h).
 *
 * The body is always a non-empty JSON *list* of strings: no nulls, no empty
 * list, never an object — each of those is a 422 from the file server.
 */
export async function signBatch(
  appKey: string,
  app: string,
  user: string,
  fileIds: string[]
): Promise<Record<string, string>> {
  const ids = [...new Set(fileIds.filter(isFileId))];
  if (!ids.length) return {};
  if (ids.length > SIGN_BATCH_LIMIT) throw new FileServerError(`At most ${SIGN_BATCH_LIMIT} ids per call`, 400);
  const json = await post(fsUrl(app, user, 'generate/signed-url/batch'), appKey, { fileIds: ids });
  // documented as a flat { fileId: url } map; our backends usually wrap it in `data`
  const data = (json.data && typeof json.data === 'object' ? json.data : json) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const id of ids) {
    const v = data[id];
    // tolerate { id: "url" } and { id: { url } }
    const url = typeof v === 'string' ? v : typeof v === 'object' && v ? (v as { url?: unknown }).url : undefined;
    if (typeof url === 'string' && /^https:\/\//i.test(url)) out[id] = url;
  }
  return out;
}

/**
 * POST …/file/generate/token-url — mints a SINGLE-USE token for one
 * CONFIDENTIAL file (the endpoint refuses other tiers). Valid ~15 min or until
 * first use. The fetch is `GET <file url>` with `x-file-token`. The server has
 * used several key names; all are read. Server-side only, once, never retried.
 */
export async function mintFileToken(
  appKey: string,
  app: string,
  user: string,
  fileId: string
): Promise<{ token: string; url: string | null }> {
  if (!isFileId(fileId)) throw new FileServerError('Invalid fileId', 400);
  const json = await post(fsUrl(app, user, 'generate/token-url'), appKey, { fileId });
  const d = (json.data ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) if (typeof d[k] === 'string' && d[k]) return d[k] as string;
    return null;
  };
  const token = pick('token', 'fileToken');
  if (!token) throw new FileServerError('File server returned no token', 502);
  return { token, url: pick('url', 'tokenUrl', 'token_url') };
}
