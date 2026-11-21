/**
 * ============================================================================
 * File records → how the browser may load them. Safe for client and server.
 * ============================================================================
 *
 *   access "public"       → record.url as-is
 *   access "internal"     → short-lived signed URL from POST /api/files/sign
 *   access "confidential" → /api/files/<fileId> (server proxy, authorised per viewer)
 *   access missing        → treated as "internal" (records older than access tiers)
 *
 * The stored `url` is the canonical UNSIGNED path. It is only used directly
 * for public files.
 */

export type FileAccess = 'public' | 'internal' | 'confidential';

export interface FileRecord {
  fileId: string;
  filename?: string;
  originalName?: string;
  storageType?: string;
  access?: FileAccess | string | null;
  url?: string | null;
  fsApp?: string;
  fsUser?: string;
  size?: number;
  mimeType?: string;
  /** Attachment extras */
  type?: string;
  label?: string;
  verificationStatus?: string;
  applicationId?: string;
}

const FILE_ID_RE = /^FILE-[A-Za-z0-9_-]{6,64}$/;
const FILE_ID_IN_TEXT_RE = /FILE-[A-Za-z0-9_-]{6,64}/;

/**
 * {app}/{user} values the file server's READ endpoints accept (signed-url/batch,
 * token-url, update, delete) — the `App` and `User` enums in
 * https://api02.awfatech.com/fs/openapi.json. Anything else is a 422 there.
 * Note `supplier` is accepted by create (POST /file uses `UserType`) but NOT
 * here, so supplier files can't be read back — a file-server inconsistency.
 */
export const FS_APPS = ['eboss', 'asis', 'sbd', 'pos', 'lms', 'careline', 'alumni', 'mais', 'splk', 'mystrata'] as const;
export const FS_USERS = ['staff', 'client', 'parent', 'student', 'alumni', 'asnaf', 'centre', 'vendor', 'user', 'admin'] as const;
const FS_APP_SET = new Set<string>(FS_APPS);
const FS_USER_SET = new Set<string>(FS_USERS);

/** The endpoint's limit (BatchSignedUrlRequest.fileIds maxItems). */
export const SIGN_BATCH_LIMIT = 100;

/** Every photo in the registration DB uses this pair; ASIS only gives us the id. */
export const DEFAULT_FS_PAIR = { fsApp: 'asis', fsUser: 'student' } as const;

export const isFileId = (v: unknown): v is string => typeof v === 'string' && FILE_ID_RE.test(v);
export const isFsApp = (v: unknown): v is string => typeof v === 'string' && FS_APP_SET.has(v);
export const isFsUser = (v: unknown): v is string => typeof v === 'string' && FS_USER_SET.has(v);

export function resolveAccess(record: Pick<FileRecord, 'access'>): FileAccess {
  const a = String(record.access ?? '').trim().toLowerCase();
  return a === 'public' || a === 'confidential' ? a : 'internal';
}

/**
 * The file's own {app}/{user}. Missing on the record → the registration
 * default (asis/student). Present but not accepted by the file server →
 * null: we never silently re-home a file under another pair.
 */
export function fsPair(record: Pick<FileRecord, 'fsApp' | 'fsUser'>): { fsApp: string; fsUser: string } | null {
  const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === '';
  if (blank(record.fsApp) && blank(record.fsUser)) return { ...DEFAULT_FS_PAIR };
  const fsApp = String(record.fsApp ?? '').trim().toLowerCase();
  const fsUser = String(record.fsUser ?? '').trim().toLowerCase();
  return isFsApp(fsApp) && isFsUser(fsUser) ? { fsApp, fsUser } : null;
}

/** Tier named in a content URL (…/content/<tier>/FILE-…), if any. */
export function accessFromUrl(url: string | null | undefined): FileAccess | null {
  const m = String(url ?? '').match(/\/content\/(public|internal|confidential)\//i);
  return m ? (m[1].toLowerCase() as FileAccess) : null;
}

/** Same-origin proxy path for a confidential file, scoped to the student it belongs to. */
export function confidentialFileUrl(fileId: string, studentUid: string): string {
  return `/api/files/${encodeURIComponent(fileId)}?student=${encodeURIComponent(studentUid)}`;
}

/**
 * Picks the URL the UI should use for a record.
 * `signed` is the fileId → signed URL map from useSignedUrls(); returns
 * undefined while an internal file is still being signed.
 */
export function fileUrlFor(
  record: FileRecord,
  opts: { signed?: Record<string, string>; studentUid?: string }
): string | undefined {
  switch (resolveAccess(record)) {
    case 'public':
      return record.url && /^https:\/\//i.test(record.url) ? record.url : undefined;
    case 'confidential':
      return opts.studentUid ? confidentialFileUrl(record.fileId, opts.studentUid) : undefined;
    default:
      return opts.signed?.[record.fileId];
  }
}

/**
 * ASIS stores the profile photo as a plain URL string built from the fileId
 * (e.g. https://fs01.awfatech.com/content/internal/FILE-…). It carries no
 * access / fsApp / fsUser, so we assume what every registration photo uses:
 * internal, asis/student. Returns null for legacy photo URLs without a fileId.
 */
export function photoRecordFromProfile(fileProfile: string | null | undefined): FileRecord | null {
  const id = String(fileProfile ?? '').match(FILE_ID_IN_TEXT_RE)?.[0];
  if (!id) return null;
  return { fileId: id, access: 'internal', ...DEFAULT_FS_PAIR, url: fileProfile ?? null };
}
