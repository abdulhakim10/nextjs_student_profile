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
    /**
     * GET — full student profile: stu + registration + every custom field
     * (superset of the original GET /student/{uid}).
     */
    DETAIL: (uid: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/profile/${encodeURIComponent(uid)}`,
    /** GET — session-year dropdown for a branch, with its current session */
    SESSIONS: (branch: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/sessions/${encodeURIComponent(branch)}`,
    /** GET — class list for a branch */
    CLASS_LIST: (branch: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/classes/${branch}`,
    /** GET — education level list for a branch */
    LEVEL_LIST: (branch: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/levels/${branch}`,
    /** GET — status code → label list for a branch */
    STATUS_LIST: (branch: string, app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student/status/${branch}`,
    /** POST — create student. TODO: confirm path with backend team. */
    CREATE: (app: string = API_CONFIG.STUDENT_APP) =>
      `/api/${v}/user/${app}/student`,
    /**
     * PUT — section-by-section profile updates ("Student Profile" in
     * https://api02.awfatech.com/docs/user). Each takes `uid` in the body.
     * `main` is multipart (admin fields + flags + profileImage); the rest JSON.
     */
    PROFILE: {
      MAIN: (app: string = API_CONFIG.STUDENT_APP) => `/api/${v}/user/${app}/student/profile`,
      PERSONAL: (app: string = API_CONFIG.STUDENT_APP) => `/api/${v}/user/${app}/student/profile/personal`,
      ADDRESS: (app: string = API_CONFIG.STUDENT_APP) => `/api/${v}/user/${app}/student/profile/address`,
      FATHER: (app: string = API_CONFIG.STUDENT_APP) => `/api/${v}/user/${app}/student/profile/father`,
      MOTHER: (app: string = API_CONFIG.STUDENT_APP) => `/api/${v}/user/${app}/student/profile/mother`,
      EMERGENCY_CONTACT: (app: string = API_CONFIG.STUDENT_APP) =>
        `/api/${v}/user/${app}/student/profile/emergency-contact`,
      SIBLINGS: (app: string = API_CONFIG.STUDENT_APP) => `/api/${v}/user/${app}/student/profile/siblings`,
      CUSTOM_FIELDS: (app: string = API_CONFIG.STUDENT_APP) =>
        `/api/${v}/user/${app}/student/profile/custom-fields`,
    },
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
