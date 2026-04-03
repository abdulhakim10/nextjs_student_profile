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
// Cache — 30s TTL to avoid redundant fetches during agentic loops
// ---------------------------------------------------------------------------

interface CacheEntry {
  state: SystemState;
  timestamp: number;
}

const stateCache = new Map<string, CacheEntry>();
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
// Main Fetcher
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
  //   fetchJson<NamedEntity[]>(apiUrl(`/admin/items?sid=${sid}`), headers),
  // ]);

  const state: SystemState = {
    // Populate with fetched data
  };

  // Store in cache
  stateCache.set(sid, { state, timestamp: Date.now() });

  return state;
}
