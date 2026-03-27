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

import { useState, useEffect, useCallback } from 'react';
import { userService } from '@/services/user.service';
import type { BranchListItem } from '@/types';
import { toast } from '@/lib/toast';

export const BRANCH_STORAGE_KEY = 'att_selected_sid';

export function useBranchSelector() {
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

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await userService.getBranchList();
      if (res.success && res.data?.length) {
        setBranches(res.data);
        setSelectedSid((prev) => {
          // Keep stored value if it's a valid branch SID
          if (prev && res.data!.some((b) => b.sid === prev)) {
            return prev;
          }
          // Default to first branch
          return res.data![0].sid;
        });
      }
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  }, [setSelectedSid]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return { branches, selectedSid, setSelectedSid, loadingBranches };
}
