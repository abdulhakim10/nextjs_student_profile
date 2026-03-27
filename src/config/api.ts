export const API_CONFIG = {
  // Auth endpoints (appcode, login, logout) use this domain
  AUTH_BASE_URL: process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || 'https://aws01.awfatech.com',
  // Utilities service endpoints
  UTILITIES_BASE_URL: process.env.NEXT_PUBLIC_UTILITIES_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://devapi02.awfatech.com',
  // All other APIs use this domain
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://devapi02.awfatech.com',
  // Client-side: use proxy to avoid CORS
  BASE_URL: '/api/proxy',
  VERSION: process.env.NEXT_PUBLIC_API_VERSION || 'v2',
  DEFAULT_APP: process.env.NEXT_PUBLIC_DEFAULT_APP || 'eboss',
  DEFAULT_USER_TYPE: process.env.NEXT_PUBLIC_DEFAULT_USER_TYPE || 'staff',
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
