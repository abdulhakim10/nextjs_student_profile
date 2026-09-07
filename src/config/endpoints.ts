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
  STUDENT: {
    /** POST — paginated student list */
    LIST: (app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/list`,
    /** GET — full student profile */
    DETAIL: (uid: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/${uid}`,
    /** GET — class list for a branch */
    CLASS_LIST: (branch: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/classes/${branch}`,
    /** GET — status code → label list for a branch */
    STATUS_LIST: (branch: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/status/${branch}`,
    /** POST — create student. TODO: confirm path with backend team. */
    CREATE: (app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student`,
    /** PUT — update student. TODO: confirm path with backend team. */
    UPDATE: (uid: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/${uid}`,
    /** DELETE — remove student. TODO: confirm path with backend team. */
    DELETE: (uid: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/${uid}`,
  },
  UTILITIES: {
    CALENDAR_EVENTS: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/calendar/events`,
    BRANCH_LIST: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/list/branch/all`,
    COUNTRY_LIST: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/list/country`,
    STATE_LIST: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/list/state`,
    DISTRICT_LIST: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/list/district`,
    CITY_LIST: (app: string = API_CONFIG.DEFAULT_APP) =>
      `/api/${v}/utilities/${app}/list/city`,
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
