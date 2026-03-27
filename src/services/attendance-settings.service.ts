import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/endpoints';
import { API_CONFIG } from '@/config/api';
import type {
  ApiResponse,
  LocationPayload,
  LocationUpdatePayload,
  LocationItem,
  DevicePayload,
  DeviceUpdatePayload,
  DeviceItem,
  AttendanceSettingData,
  AttendanceSettingUpdatePayload,
} from '@/types';

const defaultApp = API_CONFIG.DEFAULT_APP;
const defaultUser = API_CONFIG.DEFAULT_USER_TYPE;

export const attendanceSettingsService = {
  // ─── Location ─────────────────────────────────────────────────────────────
  createLocation: (data: LocationPayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ code: string; name: string }>>(
        API_ENDPOINTS.ADMIN.LOCATION(app, user),
        data
      )
      .then((r) => r.data),

  getLocationList: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<LocationItem[]>>(API_ENDPOINTS.ADMIN.LOCATION(app, user), {
        params: { sid },
      })
      .then((r) => r.data),

  updateLocation: (data: LocationUpdatePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ code: string }>>(API_ENDPOINTS.ADMIN.LOCATION(app, user), data)
      .then((r) => r.data),

  deleteLocation: (code: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ code: string; deletedCount: number }>>(
        API_ENDPOINTS.ADMIN.LOCATION(app, user),
        { params: { code } }
      )
      .then((r) => r.data),

  // ─── Device ──────────────────────────────────────────────────────────────
  createDevice: (data: DevicePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .post<ApiResponse<{ code: string; deviceCode: string }>>(
        API_ENDPOINTS.ADMIN.DEVICE(app, user),
        data
      )
      .then((r) => r.data),

  getDeviceList: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<DeviceItem[]>>(API_ENDPOINTS.ADMIN.DEVICE(app, user), {
        params: { sid },
      })
      .then((r) => r.data),

  updateDevice: (data: DeviceUpdatePayload, app = defaultApp, user = defaultUser) =>
    apiClient
      .put<ApiResponse<{ code: string }>>(API_ENDPOINTS.ADMIN.DEVICE(app, user), data)
      .then((r) => r.data),

  deleteDevice: (code: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ code: string; deletedCount: number }>>(
        API_ENDPOINTS.ADMIN.DEVICE(app, user),
        { params: { code } }
      )
      .then((r) => r.data),

  // ─── Attendance Setting (PUT is upsert: creates if not exists, updates if exists) ─
  getAttendanceSetting: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .get<ApiResponse<AttendanceSettingData>>(
        API_ENDPOINTS.ADMIN.SETTINGS_ATTENDANCE(app, user),
        { params: { sid } }
      )
      .then((r) => r.data),

  updateAttendanceSetting: (
    data: AttendanceSettingUpdatePayload,
    app = defaultApp,
    user = defaultUser
  ) =>
    apiClient
      .put<ApiResponse<AttendanceSettingData & { message?: string }>>(
        API_ENDPOINTS.ADMIN.SETTINGS_ATTENDANCE(app, user),
        data
      )
      .then((r) => r.data),

  deleteAttendanceSetting: (sid: string, app = defaultApp, user = defaultUser) =>
    apiClient
      .delete<ApiResponse<{ sid: string; deletedCount: number }>>(
        API_ENDPOINTS.ADMIN.SETTINGS_ATTENDANCE(app, user),
        { params: { sid } }
      )
      .then((r) => r.data),
};
