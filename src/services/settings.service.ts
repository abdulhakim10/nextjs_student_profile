import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/endpoints';
import type { ApiResponse } from '@/types';

export interface SettingsData {
  organization_name: string;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  timezone: string;
  notifications: {
    email_enabled: boolean;
    late_alert: boolean;
    absent_alert: boolean;
    weekly_report: boolean;
  };
}

export const settingsService = {
  get: async () => {
    const response = await apiClient.get<ApiResponse<SettingsData>>(
      API_ENDPOINTS.SETTINGS.GET
    );
    return response.data;
  },

  update: async (data: Partial<SettingsData>) => {
    const response = await apiClient.put<ApiResponse<SettingsData>>(
      API_ENDPOINTS.SETTINGS.UPDATE,
      data
    );
    return response.data;
  },
};
