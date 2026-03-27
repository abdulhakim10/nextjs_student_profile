/**
 * Shared constants and helpers for the AI subsystem.
 * Used by route.ts, state-fetcher.ts, and system-prompt.ts.
 */

// ---------------------------------------------------------------------------
// Backend URLs
// ---------------------------------------------------------------------------

export const ATTENDANCE_BASE_URL =
  process.env.NEXT_PUBLIC_ATTENDANCE_API_BASE_URL || 'http://localhost:20019';
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://devapi02.awfatech.com';
export const UTILITIES_BASE_URL =
  process.env.NEXT_PUBLIC_UTILITIES_API_BASE_URL || API_BASE_URL;
export const NOTIFICATION_BASE_URL =
  process.env.NEXT_PUBLIC_NOTIFICATION_API_BASE_URL || 'https://devapi01.awfatech.com';
export const EMAIL_BASE_URL =
  process.env.NEXT_PUBLIC_EMAIL_API_BASE_URL || 'https://devapi01.awfatech.com';
export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v2';
export const DEFAULT_APP = process.env.NEXT_PUBLIC_DEFAULT_APP || 'eboss';
export const DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER_TYPE || 'staff';

// ---------------------------------------------------------------------------
// URL Builders
// ---------------------------------------------------------------------------

/** Build a full attendance API URL from a path segment. */
export function attendanceUrl(path: string): string {
  return `${ATTENDANCE_BASE_URL}/api/${API_VERSION}/attendance/${DEFAULT_APP}/${DEFAULT_USER}${path}`;
}

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export interface BranchInfo {
  sid: string;
  name: string;
}
