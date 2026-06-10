export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Admin Dashboard';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  ENCRYPTED_KEY: 'encrypted_key',
  ENCRYPTED_USER: 'encrypted_user',
  ACCESS_TOKEN: 'access_token',
  SERVER_ID: 'server_id',
  APPCODE_DATA: 'appcode_data',
  USER_DATA: 'user_data',
  FIREBASE_ID: 'firebase_id',
  /** UNIX ms of last user activity. Used to expire idle sessions across tab closes / sleep. */
  LAST_ACTIVITY: 'last_activity',
  /** When set, idle "Log in again" redirects here (the SSO launcher's login page) instead of the module's own /auth/login. */
  SSO_RETURN_URL: 'sso_return_url',
  /** sessionStorage (per-tab): view-role override ('admin' | 'employee') carried from the hub via the SSO `role` param — resolveViewRole() applies it downgrade-only. */
  ROLE_OVERRIDE: 'role_override',
} as const;

export const SESSION_KEYS = {
  BRANCH_SID: 'app_selected_sid',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const DATE_FORMATS = {
  API: 'yyyy-MM-dd',
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_DATETIME: 'dd MMM yyyy HH:mm',
} as const;
