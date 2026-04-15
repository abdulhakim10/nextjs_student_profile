/**
 * ============================================================================
 * State Fetcher — Server-side system state loader for AI context
 * ============================================================================
 *
 * Runs inside the Next.js API route (/api/ai/chat) — NOT in the browser.
 * Fetches system entities in parallel to build a snapshot injected into
 * the AI system prompt.
 *
 * 401 Handling:
 *   If any backend call returns 401 (token expired), throws UnauthorizedError.
 *   The chat route catches this and returns 401 to the client, which triggers
 *   forceLogout() on the frontend.
 */

import { UTILITIES_BASE_URL, API_VERSION, DEFAULT_APP } from './constants';

// ---------------------------------------------------------------------------
// Error — Thrown on 401 to signal the chat route to return 401 to client
// ---------------------------------------------------------------------------

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntityInfo {
  name: string;
  code: string;
}

export interface SystemState {
  // Add your module-specific state fields here
  // Example:
  // items: number;
  // itemEntities: EntityInfo[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (res.status === 401) throw new UnauthorizedError();
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cache — 30s TTL to avoid redundant fetches during agentic loops
// ---------------------------------------------------------------------------

interface StateCacheEntry {
  state: SystemState;
  timestamp: number;
}

interface BranchCacheEntry {
  branches: Array<{ sid: string; name: string }>;
  timestamp: number;
}

const stateCache = new Map<string, StateCacheEntry>();
const branchCache = new Map<string, BranchCacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Invalidate the cached state for a given SID.
 * Call this after a write tool executes so the next request gets fresh state.
 */
export function invalidateStateCache(sid?: string): void {
  if (sid) {
    stateCache.delete(sid);
  } else {
    stateCache.clear();
  }
}

// ---------------------------------------------------------------------------
// Main Fetcher — System State
// ---------------------------------------------------------------------------

/**
 * Fetches system state. Returns cached state if within 30s TTL.
 * Customize this to fetch your module-specific entities.
 */
export async function fetchSystemState(
  sid: string,
  _authHeaders: Record<string, string>
): Promise<SystemState> {
  // Check cache first
  const cached = stateCache.get(sid);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.state;
  }

  // Add your backend fetch calls here.
  // Example:
  // const [items] = await Promise.all([
  //   fetchJson<NamedEntity[]>(apiUrl(API_BASE_URL, `/admin/items?sid=${sid}`), headers),
  // ]);

  const state: SystemState = {
    // Populate with fetched data
  };

  // Store in cache
  stateCache.set(sid, { state, timestamp: Date.now() });

  return state;
}

// ---------------------------------------------------------------------------
// Branch Fetcher — Shared utility for branch list
// ---------------------------------------------------------------------------

/**
 * Fetches the branch list from the utilities API. Cached with 30s TTL.
 */
export async function fetchBranches(
  authHeaders: Record<string, string>,
): Promise<Array<{ sid: string; name: string }>> {
  const cacheKey = 'branches';
  const cached = branchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.branches;
  }

  const headers = { 'Content-Type': 'application/json', ...authHeaders };
  const url = `${UTILITIES_BASE_URL}/api/${API_VERSION}/utilities/${DEFAULT_APP}/list/branch`;

  const branches = await fetchJson<Array<{ sid: string; name: string }>>(url, headers);
  const result = branches ?? [];

  branchCache.set(cacheKey, { branches: result, timestamp: Date.now() });
  return result;
}
