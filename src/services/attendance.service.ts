import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/endpoints';
import { API_CONFIG } from '@/config/api';
import type {
  ApiResponse,
  AttendanceListResponse,
  AttendanceFilters,
  AttendanceReportData,
  AttendanceDashboardSummaryResponse,
  AttendanceGridResponse,
  IndividualReportResponse,
} from '@/types';

const defaultApp = API_CONFIG.DEFAULT_APP;
const defaultUser = API_CONFIG.DEFAULT_USER_TYPE;

export const attendanceService = {
  /**
   * GET /api/v2/attendance/{app}/{user}/admin/attendance-list
   * Params: sid (required), search, status, start_date, end_date
   */
  getList: async (
    filters: AttendanceFilters = {},
    page: number = 1,
    limit: number = 10,
    app: string = defaultApp,
    user: string = defaultUser
  ) => {
    const body: Record<string, string | number> = {
      sid: filters.sid || '',
      search: filters.search || '',
      status: filters.status || '',
      start_date: filters.start_date || '',
      end_date: filters.end_date || '',
      page,
      limit,
    };

    const response = await apiClient.post<ApiResponse<AttendanceListResponse>>(
      API_ENDPOINTS.ATTENDANCE.LIST(app, user),
      body
    );
    return response.data;
  },

  /**
   * Dashboard summary by branch
   */
  getDashboardSummary: async (
    sid: string,
    app: string = defaultApp,
    user: string = defaultUser
  ) => {
    const response = await apiClient.get<ApiResponse<AttendanceDashboardSummaryResponse>>(
      API_ENDPOINTS.ATTENDANCE.DASHBOARD_SUMMARY(app, user),
      { params: { sid } }
    );
    return response.data;
  },

  getGrid: async (
    params: {
      sid: string;
      module?: string;
      start_date: string;
      end_date: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    app: string = defaultApp,
    user: string = defaultUser
  ) => {
    const response = await apiClient.post<ApiResponse<AttendanceGridResponse>>(
      API_ENDPOINTS.ATTENDANCE.GRID(app, user),
      {
        sid: params.sid,
        module: params.module || 'staff',
        start_date: params.start_date,
        end_date: params.end_date,
        search: params.search || '',
        page: params.page || 1,
        limit: params.limit || 20,
      }
    );
    return response.data;
  },

  getIndividualReport: async (
    params: {
      uid: string;
      sid: string;
      year: string;
      month: string;
    },
    app: string = defaultApp,
    user: string = defaultUser
  ) => {
    const response = await apiClient.post<ApiResponse<IndividualReportResponse>>(
      API_ENDPOINTS.ATTENDANCE.INDIVIDUAL_REPORT(app, user),
      params
    );
    return response.data;
  },

  getReport: async (
    params: {
      sid: string;
      report_type: string;
      start_date: string;
      end_date: string;
    },
    app: string = defaultApp,
    user: string = defaultUser
  ) => {
    const response = await apiClient.post<ApiResponse<AttendanceReportData>>(
      API_ENDPOINTS.ATTENDANCE.REPORT(app, user),
      params
    );
    return response.data;
  },

};
