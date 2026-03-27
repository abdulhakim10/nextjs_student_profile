/**
 * ============================================================================
 * State Fetcher — Server-side system state loader for AI context
 * ============================================================================
 *
 * Runs inside the Next.js API route (/api/ai/chat) — NOT in the browser.
 * Fetches all attendance system entities (groups, schedules, rulesets, etc.)
 * in parallel to build a snapshot that gets injected into the AI system prompt.
 *
 * This gives the AI assistant awareness of what's configured in the system,
 * so it can give relevant answers without the user needing to explain their setup.
 *
 * 401 Handling:
 *   If any backend call returns 401 (token expired), throws UnauthorizedError.
 *   The chat route catches this and returns 401 to the client, which triggers
 *   forceLogout() on the frontend.
 */

import { attendanceUrl } from './constants';

// ---------------------------------------------------------------------------
// Error — Thrown on 401 to signal the chat route to return 401 to client
// ---------------------------------------------------------------------------

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Fetches JSON from a URL with auth headers.
 * Returns null on non-401 errors (data not available is acceptable).
 * Throws UnauthorizedError on 401 to abort the entire state fetch.
 */
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
// Types
// ---------------------------------------------------------------------------

export interface EntityInfo {
  name: string;
  code: string;
}

export interface SystemState {
  groups: number;
  groupEntities: EntityInfo[];
  schedules: number;
  scheduleEntities: EntityInfo[];
  rulesets: number;
  rulesetEntities: EntityInfo[];
  workingPolicies: number;
  workingPolicyEntities: EntityInfo[];
  dayTypes: number;
  locations: number;
  locationNames: string[];
  devices: number;
  deviceNames: string[];
  mode: string | null;
  employeeProfiles: number;
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
 * Fetches all system entities in parallel and returns a summary snapshot.
 * Returns cached state if within 30s TTL.
 * Throws UnauthorizedError if any backend call returns 401.
 */
export async function fetchSystemState(
  sid: string,
  authHeaders: Record<string, string>
): Promise<SystemState> {
  // Check cache first
  const cached = stateCache.get(sid);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.state;
  }

  const headers = { 'Content-Type': 'application/json', ...authHeaders };

  type NamedEntity = { name: string; code: string };

  const [groups, schedules, rulesets, workingPolicies, dayTypes, locations, devices, setting, profiles] =
    await Promise.all([
      fetchJson<NamedEntity[]>(attendanceUrl(`/admin/group/list?sid=${sid}`), headers),
      fetchJson<NamedEntity[]>(attendanceUrl(`/admin/schedule/list?sid=${sid}`), headers),
      fetchJson<NamedEntity[]>(attendanceUrl(`/admin/settings/ruleset?sid=${sid}`), headers),
      fetchJson<NamedEntity[]>(attendanceUrl(`/admin/settings/working-policy?sid=${sid}`), headers),
      fetchJson<Array<{ name: string }>>(attendanceUrl(`/admin/settings/day-type?sid=${sid}`), headers),
      fetchJson<Array<{ name: string }>>(attendanceUrl(`/admin/location?sid=${sid}`), headers),
      fetchJson<Array<{ name: string }>>(attendanceUrl(`/admin/device?sid=${sid}`), headers),
      fetchJson<{ mode: string }>(attendanceUrl(`/admin/settings/attendance?sid=${sid}`), headers),
      fetchJson<Array<Record<string, unknown>>>(attendanceUrl(`/admin/settings/employee-attendance-profile/list?sid=${sid}`), headers),
    ]);

  const toEntities = (items: NamedEntity[] | null): EntityInfo[] =>
    items?.map((e) => ({ name: e.name, code: e.code })) ?? [];

  const state: SystemState = {
    groups: groups?.length ?? 0,
    groupEntities: toEntities(groups),
    schedules: schedules?.length ?? 0,
    scheduleEntities: toEntities(schedules),
    rulesets: rulesets?.length ?? 0,
    rulesetEntities: toEntities(rulesets),
    workingPolicies: workingPolicies?.length ?? 0,
    workingPolicyEntities: toEntities(workingPolicies),
    dayTypes: dayTypes?.length ?? 0,
    locations: locations?.length ?? 0,
    locationNames: locations?.map((l) => l.name) ?? [],
    devices: devices?.length ?? 0,
    deviceNames: devices?.map((d) => d.name) ?? [],
    mode: setting?.mode ?? null,
    employeeProfiles: profiles?.length ?? 0,
  };

  // Store in cache
  stateCache.set(sid, { state, timestamp: Date.now() });

  return state;
}
