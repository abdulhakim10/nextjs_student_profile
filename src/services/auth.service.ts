import apiClient from '@/lib/api-client';
import { API_CONFIG } from '@/config/api';
import { API_ENDPOINTS } from '@/config/endpoints';
import { STORAGE_KEYS } from '@/config/constants';
import type { ApiResponse, AppcodeData, LoginRequest, UserData } from '@/types';

export interface SSOVerifyData {
  encrypted_key: string;
  server_id: string;
  sid: string;
  client_appname: string;
  customer: string;
  client_logo: string;
  url: string;
  bos_config: string;
  app_config: string;
  token: string;
  encrypted_user: string;
  user_id: string;
  user_sid: number;
  user_name: string;
  user_image: string;
  user_phone_num: string;
  user_ic: string;
  user_email: string;
  user_addr: string;
  sch_name: string;
  sch_addr: string;
  system_level: string;
  system_access: string;
}

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

  verifySSOToken: async (ssoToken: string): Promise<ApiResponse<SSOVerifyData>> => {
    // Go through the same-origin proxy to avoid CORS preflight against the
    // auth domain. The proxy (`isAuthPath`) forwards sso/verify to AUTH_BASE_URL.
    const res = await fetch(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.SSO_VERIFY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sso_token: ssoToken }),
      }
    );

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'SSO verification failed');
    }

    return json;
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
