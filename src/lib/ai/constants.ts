/**
 * Shared constants and helpers for the AI subsystem.
 * Used by route.ts, state-fetcher.ts, and system-prompt.ts.
 */

// ---------------------------------------------------------------------------
// Backend URLs
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://devapi02.awfatech.com';
export const UTILITIES_BASE_URL =
  process.env.NEXT_PUBLIC_UTILITIES_API_BASE_URL || API_BASE_URL;
export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v2';
export const DEFAULT_APP = process.env.NEXT_PUBLIC_DEFAULT_APP || 'eboss';
export const DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER_TYPE || 'staff';

// ---------------------------------------------------------------------------
// URL Builders
// ---------------------------------------------------------------------------

/** Build a full API URL from a path segment. Customize per module. */
export function apiUrl(basePath: string, path: string): string {
  return `${basePath}/api/${API_VERSION}${path}`;
}

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export interface BranchInfo {
  sid: string;
  name: string;
}
