import { API_CONFIG } from './api';

const v = API_CONFIG.VERSION;

export const API_ENDPOINTS = {
  AUTH: {
    APPCODE: `/api/${v}/auth/appcode`,
    LOGIN: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/auth/${app}/${user}/login`,
    LOGOUT: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/auth/${app}/${user}/logout`,
    REFRESH_TOKEN: `/api/${v}/auth/refresh-token`,
    SSO_VERIFY: `/api/${v}/auth/sso/verify`,
  },
  STAFF: {
    LIST: `/api/${v}/staff/list`,
    DETAIL: (id: string) => `/api/${v}/staff/${id}`,
    CREATE: `/api/${v}/staff`,
    UPDATE: (id: string) => `/api/${v}/staff/${id}`,
    DELETE: (id: string) => `/api/${v}/staff/${id}`,
  },
  USER: {
    STAFF_FETCH: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/user/${app}/staff/fetch`,
  },
  UTILITIES: {
    CALENDAR_EVENTS: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/calendar/events`,
    BRANCH_LIST: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/list/branch`,
    DIVISION_LIST: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/list/user/job/division`,
    POSITION_LIST: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/list/user/job/position`,
    STATUS_LIST: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/list/user/job/status`,
  },
  DASHBOARD: {
    SUMMARY: `/api/${v}/dashboard/summary`,
    CHART: `/api/${v}/dashboard/chart`,
    RECENT: `/api/${v}/dashboard/recent`,
  },
  SETTINGS: {
    GET: `/api/${v}/settings`,
    UPDATE: `/api/${v}/settings`,
  },
} as const;
