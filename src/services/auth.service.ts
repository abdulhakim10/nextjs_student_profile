import apiClient from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/endpoints';
import { STORAGE_KEYS } from '@/config/constants';
import type { ApiResponse, AppcodeData, LoginRequest, UserData } from '@/types';

export const authService = {
  validateAppcode: async (appcode: string) => {
    const response = await apiClient.post<ApiResponse<AppcodeData>>(
      API_ENDPOINTS.AUTH.APPCODE,
      { appcode }
    );
    return response.data;
  },

  login: async (data: LoginRequest, app?: string, userType?: string) => {
    const response = await apiClient.post<ApiResponse<UserData>>(
      API_ENDPOINTS.AUTH.LOGIN(app, userType),
      data
    );
    return response.data;
  },

  logout: async (app?: string, userType?: string) => {
    const firebaseId =
      typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEYS.FIREBASE_ID) ?? ''
        : '';
    const response = await apiClient.post<ApiResponse<null>>(
      API_ENDPOINTS.AUTH.LOGOUT(app, userType),
      { firebase_id: firebaseId }
    );
    return response.data;
  },
};
