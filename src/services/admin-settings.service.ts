import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/endpoints';
import { API_CONFIG } from '@/config/api';
import type {
  ApiResponse,
  DayTypePayload, DayTypeUpdatePayload, DayTypeItem,
  WorkingPolicyPayload, WorkingPolicyUpdatePayload, WorkingPolicyItem,
  RulesetPayload, RulesetUpdatePayload, RulesetItem,
  ScheduleTemplatePayload, ScheduleTemplateUpdatePayload,
  ScheduleTemplateItem, ScheduleTemplateListItem,
  AttendanceGroupPayload, AttendanceGroupUpdatePayload, AttendanceGroupItem,
  EmployeeProfilePayload, EmployeeProfileListItem, EmployeeProfileItem,
  UpsertOverrideSchedulePayload, DeleteOverrideSchedulePayload, OverrideScheduleMap,
} from '@/types';

const defaultApp = API_CONFIG.DEFAULT_APP;
const defaultUser = API_CONFIG.DEFAULT_USER_TYPE;

export const adminSettingsService = {
  // ─── Day Type ──────────────────────────────────────────────────────────────
  createDayType: (data: DayTypePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .post<ApiResponse<{ code: string }>>(API_ENDPOINTS.ADMIN.SETTINGS_DAY_TYPE(app, user), data)
      .then((r) => r.data),

  getDayTypeList: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<DayTypeItem[]>>(API_ENDPOINTS.ADMIN.SETTINGS_DAY_TYPE(app, user), {
        params: { sid },
      })
      .then((r) => r.data),

  updateDayType: (data: DayTypeUpdatePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ code: string }>>(API_ENDPOINTS.ADMIN.SETTINGS_DAY_TYPE(app, user), data)
      .then((r) => r.data),

  deleteDayType: (code: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ code: string }>>(API_ENDPOINTS.ADMIN.SETTINGS_DAY_TYPE(app, user), {
        params: { code },
      })
      .then((r) => r.data),

  // ─── Working Policy ────────────────────────────────────────────────────────
  createWorkingPolicy: (data: WorkingPolicyPayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .post<ApiResponse<{ code: string }>>(
        API_ENDPOINTS.ADMIN.SETTINGS_WORKING_POLICY(app, user),
        data
      )
      .then((r) => r.data),

  getWorkingPolicyList: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<WorkingPolicyItem[]>>(
        API_ENDPOINTS.ADMIN.SETTINGS_WORKING_POLICY(app, user),
        { params: { sid } }
      )
      .then((r) => r.data),

  updateWorkingPolicy: (data: WorkingPolicyUpdatePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ code: string }>>(
        API_ENDPOINTS.ADMIN.SETTINGS_WORKING_POLICY(app, user),
        data
      )
      .then((r) => r.data),

  deleteWorkingPolicy: (code: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ code: string }>>(
        API_ENDPOINTS.ADMIN.SETTINGS_WORKING_POLICY(app, user),
        { params: { code } }
      )
      .then((r) => r.data),

  // ─── Ruleset ───────────────────────────────────────────────────────────────
  createRuleset: (data: RulesetPayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .post<ApiResponse<{ code: string }>>(
        API_ENDPOINTS.ADMIN.SETTINGS_RULESET(app, user),
        data
      )
      .then((r) => r.data),

  getRulesetList: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<RulesetItem[]>>(API_ENDPOINTS.ADMIN.SETTINGS_RULESET(app, user), {
        params: { sid },
      })
      .then((r) => r.data),

  updateRuleset: (data: RulesetUpdatePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ code: string }>>(
        API_ENDPOINTS.ADMIN.SETTINGS_RULESET(app, user),
        data
      )
      .then((r) => r.data),

  deleteRuleset: (code: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ code: string }>>(
        API_ENDPOINTS.ADMIN.SETTINGS_RULESET(app, user),
        { params: { code } }
      )
      .then((r) => r.data),

  // ─── Schedule Template ─────────────────────────────────────────────────────
  createSchedule: (data: ScheduleTemplatePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .post<ApiResponse<{ code: string; name: string; shift_span: number }>>(
        API_ENDPOINTS.ADMIN.SCHEDULE(app, user),
        data
      )
      .then((r) => r.data),

  getSchedule: (code: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<ScheduleTemplateItem>>(API_ENDPOINTS.ADMIN.SCHEDULE(app, user), {
        params: { code },
      })
      .then((r) => r.data),

  getScheduleList: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<ScheduleTemplateListItem[]>>(
        API_ENDPOINTS.ADMIN.SCHEDULE_LIST(app, user),
        { params: { sid } }
      )
      .then((r) => r.data),

  updateSchedule: (data: ScheduleTemplateUpdatePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ code: string; modifiedCount: number; shift_span: number }>>(
        API_ENDPOINTS.ADMIN.SCHEDULE(app, user),
        data
      )
      .then((r) => r.data),

  deleteSchedule: (code: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ code: string; deletedCount: number }>>(
        API_ENDPOINTS.ADMIN.SCHEDULE(app, user),
        { params: { code } }
      )
      .then((r) => r.data),

  // ─── Attendance Group ──────────────────────────────────────────────────────
  createGroup: (data: AttendanceGroupPayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .post<
        ApiResponse<{
          groupCode: string;
          name: string;
          scheduleTemplateCode: string;
          rulesetCode: string;
        }>
      >(API_ENDPOINTS.ADMIN.GROUP(app, user), data)
      .then((r) => r.data),

  getGroup: (code: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<AttendanceGroupItem>>(API_ENDPOINTS.ADMIN.GROUP(app, user), {
        params: { code },
      })
      .then((r) => r.data),

  getGroupList: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<AttendanceGroupItem[]>>(API_ENDPOINTS.ADMIN.GROUP_LIST(app, user), {
        params: { sid },
      })
      .then((r) => r.data),

  updateGroup: (data: AttendanceGroupUpdatePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ code: string; name: string }>>(
        API_ENDPOINTS.ADMIN.GROUP(app, user),
        data
      )
      .then((r) => r.data),

  deleteGroup: (code: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ code: string; deletedCount: number }>>(
        API_ENDPOINTS.ADMIN.GROUP(app, user),
        { params: { code } }
      )
      .then((r) => r.data),

  // ─── Employee Profile ──────────────────────────────────────────────────────
  getEmployeeProfile: (uid: string, sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<EmployeeProfileItem>>(API_ENDPOINTS.ADMIN.EMPLOYEE_PROFILE(app, user), {
        params: { uid, sid },
      })
      .then((r) => r.data),

  updateEmployeeProfile: (data: EmployeeProfilePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ uid: string }>>(
        API_ENDPOINTS.ADMIN.EMPLOYEE_PROFILE(app, user),
        data
      )
      .then((r) => r.data),

  getEmployeeProfileList: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<EmployeeProfileListItem[]>>(
        API_ENDPOINTS.ADMIN.EMPLOYEE_PROFILE_LIST(app, user),
        { params: { sid } }
      )
      .then((r) => r.data),

  deleteEmployeeProfile: (uid: string, sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ uid: string; sid: string }>>(
        API_ENDPOINTS.ADMIN.EMPLOYEE_PROFILE(app, user),
        { params: { uid, sid } }
      )
      .then((r) => r.data),

  // ─── Override Schedule ──────────────────────────────────────────────────────
  upsertOverrideSchedule: (data: UpsertOverrideSchedulePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ uid: string; dates: string[] }>>(
        API_ENDPOINTS.ADMIN.OVERRIDE_SCHEDULE(app, user),
        data
      )
      .then((r) => r.data),

  getOverrideSchedule: (uid: string, sid: string, year: string, month: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<OverrideScheduleMap>>(
        API_ENDPOINTS.ADMIN.OVERRIDE_SCHEDULE(app, user),
        { params: { uid, sid, year, month } }
      )
      .then((r) => r.data),

  deleteOverrideSchedule: (data: DeleteOverrideSchedulePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ uid: string; dates: string[] }>>(
        API_ENDPOINTS.ADMIN.OVERRIDE_SCHEDULE(app, user),
        { data }
      )
      .then((r) => r.data),

  // ─── Weekly Report Email ──────────────────────────────────────────────────
  sendWeeklyReportEmail: (data: { sid: string; to_email: string; to_name: string }, app = defaultApp, user = defaultUser) =>
    apiClient
      .post<ApiResponse<{ to_email: string; to_name: string; period: string }>>(
        API_ENDPOINTS.ADMIN.SEND_WEEKLY_REPORT(app, user),
        data
      )
      .then((r) => r.data),
};
