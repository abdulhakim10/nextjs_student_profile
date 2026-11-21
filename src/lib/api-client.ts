/**
 * ============================================================================
 * API Client — Axios instance for all service layer HTTP calls
 * ============================================================================
 *
 * All services (auth, user, dashboard, plus your module's services) use this
 * shared Axios instance. It provides:
 *
 *   Credentials:
 *     None attached client-side — httpOnly session cookies + server-side
 *     injection in /api/proxy (see lib/server/session.ts).
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
import type { AxiosError } from 'axios';
import { API_CONFIG } from '@/config/api';
import { forceLogout } from '@/lib/auth';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Credentials: none are attached here. The sealed httpOnly session cookies
// ride along automatically (same-origin) and /api/proxy injects the backend
// headers server-side. See lib/server/session.ts.

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
