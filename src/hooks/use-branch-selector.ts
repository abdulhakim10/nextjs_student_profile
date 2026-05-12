/**
 * ============================================================================
 * useBranchSelector — Shared hook for branch selection across all pages
 * ============================================================================
 *
 * The selected SID is persisted in sessionStorage (`BRANCH_STORAGE_KEY`)
 * so it carries across page navigation within the same tab.
 *
 * On mount, auto-selects the first branch if no valid SID is stored.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';
import type { BranchListItem } from '@/types';
import { toast } from '@/lib/toast';
import { SESSION_KEYS } from '@/config/constants';

export const BRANCH_STORAGE_KEY = SESSION_KEYS.BRANCH_SID;

export function useBranchSelector() {
  const userData = useAuthStore((s) => s.userData);
  const userSid = String(userData?.user_sid ?? '');
  const isHQ = userSid === '0';

  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [selectedSid, setSelectedSidState] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(BRANCH_STORAGE_KEY) || '';
    }
    return '';
  });
  const [loadingBranches, setLoadingBranches] = useState(true);

  const setSelectedSid = useCallback((sid: string | ((prev: string) => string)) => {
    setSelectedSidState((prev) => {
      const next = typeof sid === 'function' ? sid(prev) : sid;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(BRANCH_STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  const fetchBranches = useCallback(async (district?: string) => {
    if (!userData) return;

    setLoadingBranches(true);
    try {
      const res = await userService.getBranchList(undefined, district || undefined);
      if (res.success && res.data?.length) {
        setBranches(res.data);

        if (isHQ) {
          // HQ: keep stored value if valid, otherwise default to first branch
          setSelectedSid((prev) => {
            if (prev && res.data!.some((b) => b.sid === prev)) {
              return prev;
            }
            return res.data![0].sid;
          });
        } else {
          // Sub-branch: lock to their own branch
          setSelectedSid(userSid);
        }
      } else {
        setBranches(res.data ?? []);
      }
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  }, [userData, setSelectedSid, isHQ, userSid]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const branchName = useMemo(() => {
    return branches.find((b) => b.sid === selectedSid)?.name || '';
  }, [branches, selectedSid]);

  return { branches, selectedSid, setSelectedSid, loadingBranches, isHQ, branchName, fetchBranches };
}
