import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/endpoints';
import type { ApiResponse, DashboardSummary, ChartDataPoint, RecentActivity } from '@/types';

export const dashboardService = {
  getSummary: async () => {
    const response = await apiClient.get<ApiResponse<DashboardSummary>>(
      API_ENDPOINTS.DASHBOARD.SUMMARY
    );
    return response.data;
  },

  getChartData: async (period: 'weekly' | 'monthly' = 'weekly', sid?: string) => {
    const response = await apiClient.get<ApiResponse<ChartDataPoint[]>>(
      API_ENDPOINTS.DASHBOARD.CHART,
      { params: { period, ...(sid ? { sid } : {}) } }
    );
    return response.data;
  },

  getRecentActivity: async (limit: number = 10) => {
    const response = await apiClient.get<ApiResponse<RecentActivity[]>>(
      API_ENDPOINTS.DASHBOARD.RECENT,
      { params: { limit } }
    );
    return response.data;
  },
};
