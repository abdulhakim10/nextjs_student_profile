/**
 * Base-URL cascade
 * ----------------
 * `API_BASE_URL` is the single root. Every per-service URL is optional —
 * when its env var is empty, it falls back to `API_BASE_URL`.
 *
 * - Production: set only `NEXT_PUBLIC_API_BASE_URL` (one domain serves
 *   every service path). All per-service vars stay empty.
 * - Development: set each per-service var in `.env.development` to point
 *   at the matching local backend (different host/port per service).
 *
 * Code shouldn't read these env vars directly — import the exported
 * constants below so the cascade stays in one place.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://aws01.awfatech.com';

function resolveServiceUrl(serviceVar: string | undefined): string {
  return serviceVar || API_BASE_URL;
}

export const AUTH_BASE_URL = resolveServiceUrl(process.env.NEXT_PUBLIC_AUTH_API_BASE_URL);
export const UTILITIES_BASE_URL = resolveServiceUrl(process.env.NEXT_PUBLIC_UTILITIES_API_BASE_URL);

export const API_CONFIG = {
  AUTH_BASE_URL,
  UTILITIES_BASE_URL,
  API_BASE_URL,
  // Client-side: use proxy to avoid CORS
  BASE_URL: '/api/proxy',
  VERSION: process.env.NEXT_PUBLIC_API_VERSION || 'v2',
  DEFAULT_APP: process.env.NEXT_PUBLIC_DEFAULT_APP || 'eboss',
  DEFAULT_USER_TYPE: process.env.NEXT_PUBLIC_DEFAULT_USER_TYPE || 'staff',
  /** App segment for the student APIs (`/api/v2/user/{app}/student/...`). */
  STUDENT_APP: process.env.NEXT_PUBLIC_STUDENT_APP || 'asis',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const buildApiUrl = (path: string): string => {
  return `${API_CONFIG.BASE_URL}${path}`;
};

export const buildVersionedApiUrl = (path: string): string => {
  return `${API_CONFIG.BASE_URL}/api/${API_CONFIG.VERSION}${path}`;
};
