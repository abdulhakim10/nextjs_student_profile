/**
 * ============================================================================
 * Auth Store — Zustand store for authentication state
 * ============================================================================
 *
 * Two-step authentication flow:
 *   Step 1: Appcode → validates organization → stores encrypted_key + server_id
 *   Step 2: Login   → authenticates user     → stores access_token + encrypted_user
 *
 * Persistence:
 *   - Zustand persist middleware saves { appcodeData, userData, isAppCodeVerified,
 *     isAuthenticated } to localStorage under AUTH_STORAGE_KEY.
 *   - On page load, onRehydrateStorage fires → sets _hasHydrated = true.
 *   - AuthGuard waits for _hasHydrated before routing decisions to prevent
 *     flash-of-wrong-page during SSR/hydration.
 *
 * Logout vs ForceLogout:
 *   - logout()      → user-initiated, clears tokens + resets state (keeps appcode data)
 *   - forceLogout() → 401-triggered, clears EVERYTHING including Zustand persist key
 *                      (see lib/auth.ts)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppcodeData, UserData } from '@/types';
import { STORAGE_KEYS } from '@/config/constants';
import { AUTH_STORAGE_KEY, clearSessionStorage } from '@/lib/auth';

interface AuthState {
  // --- Data ---
  appcodeData: AppcodeData | null;
  userData: UserData | null;

  // --- Status flags ---
  isAppCodeVerified: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  /** True once persist middleware has restored state from localStorage */
  _hasHydrated: boolean;

  // --- Actions ---
  setAppcodeData: (data: AppcodeData) => void;
  setUserData: (data: UserData, firebaseId?: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  clearError: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      appcodeData: null,
      userData: null,
      isAppCodeVerified: false,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      /**
       * Step 1: Store appcode validation result.
       * Saves encrypted_key and server_id to localStorage for API header injection.
       */
      setAppcodeData: (data) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.ENCRYPTED_KEY, data.encrypted_key);
          localStorage.setItem(STORAGE_KEYS.SERVER_ID, data.server_id);
        }
        set({
          appcodeData: data,
          isAppCodeVerified: true,
          error: null,
        });
      },

      /**
       * Step 2: Store login result.
       * Saves access_token and encrypted_user to localStorage for API header injection.
       */
      setUserData: (data, firebaseId?: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.token);
          localStorage.setItem(STORAGE_KEYS.ENCRYPTED_USER, data.encrypted_user);
          if (firebaseId !== undefined) {
            localStorage.setItem(STORAGE_KEYS.FIREBASE_ID, firebaseId);
          }
          // Seed fresh activity so the idle timer doesn't fire against a stale
          // timestamp from a prior session in this module (e.g. after SSO entry).
          localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
        }
        // sid is string everywhere internally — coerce in case API returns number
        const normalized: UserData = { ...data, user_sid: String(data.user_sid ?? '') };
        set({
          userData: normalized,
          isAuthenticated: true,
          error: null,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error, isLoading: false }),
      clearError: () => set({ error: null }),

      /**
       * User-initiated logout (e.g. sidebar menu).
       * Clears login-session keys only — keeps appcode data (encrypted_key,
       * server_id) so the user can re-login without re-entering the org code.
       * Zustand persist auto-syncs the new state to AUTH_STORAGE_KEY.
       */
      logout: () => {
        clearSessionStorage();
        set({
          userData: null,
          isAuthenticated: false,
          error: null,
        });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        appcodeData: state.appcodeData,
        userData: state.userData,
        isAppCodeVerified: state.isAppCodeVerified,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
