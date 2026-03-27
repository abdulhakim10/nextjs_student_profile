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
  },
  ATTENDANCE: {
    LIST: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/attendance-list`,
    REPORT: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/attendance-report`,
    DASHBOARD_SUMMARY: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/dashboard/summary`,
    GRID: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/attendance-grid`,
    INDIVIDUAL_REPORT: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/reports/monthly`,
  },
  ADMIN: {
    LOCATION: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/location`,
    DEVICE: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/device`,
    SETTINGS_ATTENDANCE: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/settings/attendance`,
    // Day Type
    SETTINGS_DAY_TYPE: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/settings/day-type`,

    // Working Policy (OT)
    SETTINGS_WORKING_POLICY: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/settings/working-policy`,

    // Ruleset
    SETTINGS_RULESET: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/settings/ruleset`,

    // Schedule Template
    SCHEDULE: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/schedule`,
    SCHEDULE_LIST: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/schedule/list`,

    // Attendance Group
    GROUP: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/group`,
    GROUP_LIST: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/group/list`,

    // Employee Attendance Profile
    EMPLOYEE_PROFILE: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/settings/employee-attendance-profile`,
    EMPLOYEE_PROFILE_LIST: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/settings/employee-attendance-profile/list`,

    // Override Schedule
    OVERRIDE_SCHEDULE: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/override-schedule`,

    // Weekly Report Email
    SEND_WEEKLY_REPORT: (app: string = API_CONFIG.DEFAULT_APP, user: string = API_CONFIG.DEFAULT_USER_TYPE) =>
      `/api/${v}/attendance/${app}/${user}/admin/email/weekly-report`,
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
