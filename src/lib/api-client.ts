/**
 * ============================================================================
 * API Client — Axios instance for all service layer HTTP calls
 * ============================================================================
 *
 * All services (auth, attendance, admin, dashboard, etc.) use this shared
 * Axios instance. It provides:
 *
 *   Request Interceptor:
 *     Reads auth tokens from localStorage via getAuthHeaders() and attaches
 *     them to every outgoing request. Skips encrypted headers for the
 *     appcode endpoint (which only needs the appcode in the body).
 *
 *   Response Interceptor:
 *     Catches 401 Unauthorized responses and triggers forceLogout() to clear
 *     all auth state and redirect to /auth/appcode.
 *
 * Base URL:
 *   Points to /api/proxy (Next.js proxy route) which forwards requests to
 *   the actual backend servers, avoiding CORS issues on the client.
 *
 * Note: The AI chat service (ai.service.ts) uses fetch() directly to
 * /api/ai/chat (a Next.js API route, not the proxy). It has its own 401
 * handling via authFetch().
 */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/config/api';
import { getAuthHeaders, forceLogout } from '@/lib/auth';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request Interceptor — Attach auth headers to every outgoing request
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const isAppcodeEndpoint = config.url?.includes('/auth/appcode');
    const headers = getAuthHeaders({ skipEncrypted: isAppcodeEndpoint });

    Object.entries(headers).forEach(([key, value]) => {
      config.headers[key] = value;
    });

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response Interceptor — Handle 401 globally (session expired / invalid token)
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      forceLogout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
