'use client';

/**
 * useSignedUrls — signs every INTERNAL file a page shows, in one request.
 *
 *   const signed = useSignedUrls(records);      // records: FileRecord[]
 *   <img src={fileUrlFor(record, { signed })} />
 *
 * - One POST /api/files/sign per page with all ids that need signing (the
 *   server splits by fsApp/fsUser pair and chunks at 100).
 * - Shared module cache, so the list, overview and detail dialog don't
 *   re-sign the same photo.
 * - Entries are dropped a minute before the server-reported expiry (45 min)
 *   and re-signed while the page stays open.
 * - Failures back off per id (30 s doubling to 10 min). A failed sign never
 *   triggers an immediate retry, and the hook only re-renders when an id
 *   actually became signed — so a failing endpoint cannot loop.
 * - Public / confidential records are ignored here — fileUrlFor() handles them.
 */
import { useEffect, useMemo, useState } from 'react';
import { fsPair, resolveAccess, type FileRecord } from '@/lib/files';
import { forceLogout, getAuthHeaders } from '@/lib/auth';

const REFRESH_MARGIN_MS = 60_000;
const MAX_PER_REQUEST = 200;
const BACKOFF_START_MS = 30_000;
const BACKOFF_MAX_MS = 10 * 60_000;

interface Entry {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<void>>();
const backoff = new Map<string, { until: number; delay: number }>();

function fresh(id: string): Entry | undefined {
  const e = cache.get(id);
  return e && e.expiresAt - REFRESH_MARGIN_MS > Date.now() ? e : undefined;
}

function coolingDown(id: string): boolean {
  const b = backoff.get(id);
  return !!b && b.until > Date.now();
}

function markFailed(ids: string[]) {
  const now = Date.now();
  for (const id of ids) {
    const prev = backoff.get(id);
    const delay = prev ? Math.min(prev.delay * 2, BACKOFF_MAX_MS) : BACKOFF_START_MS;
    backoff.set(id, { until: now + delay, delay });
  }
}

/** Signs what's missing. Resolves true only if one of `records` became signed. */
async function signMissing(records: FileRecord[]): Promise<boolean> {
  const before = records.filter((r) => fresh(r.fileId)).length;
  const todo = records.filter((r) => !fresh(r.fileId) && !inflight.has(r.fileId) && !coolingDown(r.fileId));
  const waits = records.map((r) => inflight.get(r.fileId)).filter(Boolean) as Promise<void>[];

  for (let i = 0; i < todo.length; i += MAX_PER_REQUEST) {
    const chunk = todo.slice(i, i + MAX_PER_REQUEST);
    const ids = chunk.map((r) => r.fileId);
    const p = (async () => {
      const res = await fetch('/api/files/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        // records here were normalised when the key was built, so the pair is valid
        body: JSON.stringify({ files: chunk.map((r) => ({ fileId: r.fileId, fsApp: r.fsApp, fsUser: r.fsUser })) }),
      });
      if (res.status === 401) {
        forceLogout();
        return;
      }
      const json = (await res.json().catch(() => ({}))) as {
        data?: Record<string, string>;
        expiresAt?: number;
        failed?: string[];
        missing?: string[];
      };
      // partial results are usable even on a non-200
      const expiresAt = Number(json.expiresAt) || Date.now() + 45 * 60_000;
      for (const [id, url] of Object.entries(json.data ?? {})) {
        cache.set(id, { url, expiresAt });
        backoff.delete(id);
      }
      const notSigned = ids.filter((id) => !json.data?.[id]);
      if (notSigned.length) {
        markFailed(notSigned);
        if (!res.ok) console.warn('[photos] signing failed', res.status, json);
      }
    })()
      .catch(() => markFailed(ids))
      .finally(() => ids.forEach((id) => inflight.delete(id)));
    ids.forEach((id) => inflight.set(id, p));
    waits.push(p);
  }

  if (!waits.length) return false;
  await Promise.all(waits);
  return records.filter((r) => fresh(r.fileId)).length > before;
}

export function useSignedUrls(records: Array<FileRecord | null | undefined>): Record<string, string> {
  // Stable identity: sorted "id:access:pair" key, so a new array with the same
  // files (every render) doesn't re-run the effect.
  const key = useMemo(() => {
    const parts = new Set<string>();
    for (const r of records) {
      if (!r || resolveAccess(r) !== 'internal') continue;
      const pair = fsPair(r);
      if (!pair) {
        console.warn('[photos] skipping file with an app/user the file server does not accept', r.fileId, r.fsApp, r.fsUser);
        continue;
      }
      parts.add(`${r.fileId}|${pair.fsApp}|${pair.fsUser}`);
    }
    return [...parts].sort().join(',');
  }, [records]);

  const internal = useMemo<FileRecord[]>(
    () =>
      key
        ? key.split(',').map((p) => {
            const [fileId, fsApp, fsUser] = p.split('|');
            return { fileId, fsApp, fsUser, access: 'internal' };
          })
        : [],
    [key]
  );

  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!internal.length) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // wake for the next re-sign or the end of a backoff, whichever is sooner
    const schedule = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      const wakeAt = Math.min(
        ...internal.map((r) => {
          const e = cache.get(r.fileId);
          const resign = e ? e.expiresAt - REFRESH_MARGIN_MS : Infinity;
          const retry = backoff.get(r.fileId)?.until ?? Infinity;
          return Math.min(resign, retry);
        })
      );
      if (Number.isFinite(wakeAt)) {
        timer = setTimeout(() => setVersion((v) => v + 1), Math.max(5_000, wakeAt - Date.now()));
      }
    };

    schedule();
    signMissing(internal).then((changed) => {
      if (cancelled) return;
      if (changed) setVersion((v) => v + 1); // effect re-runs and reschedules
      else schedule(); // e.g. failed → wake when the backoff ends
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [internal, version]);

  return useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of internal) {
      const e = fresh(r.fileId);
      if (e) out[r.fileId] = e.url;
    }
    return out;
    // `version` is the cache-changed signal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internal, version]);
}
