/**
 * ============================================================================
 * useBranchSelector — Shared hook for branch selection across all pages
 * ============================================================================
 *
 * The selected SID is persisted in sessionStorage (`BRANCH_STORAGE_KEY`)
 * so it carries across page navigation within the same tab.
 *
 * On mount, if no valid SID is stored, auto-selects the branch the user
 * logged into (matched by the appcode's school id, then by the user's
 * school name), falling back to the first branch.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';
import type { BranchListItem } from '@/types';
import { toast } from '@/lib/toast';
import { SESSION_KEYS } from '@/config/constants';

export const BRANCH_STORAGE_KEY = SESSION_KEYS.BRANCH_SID;

/** Stored when the user picks "All branches" — distinct from "nothing chosen yet". */
const ALL_BRANCHES = '__all__';

/**
 * @param options.allowAll  HQ users may pick "All branches"; selectedSid is
 *   then '' (what the student APIs read as "every branch"). Pages that don't
 *   opt in treat a stored "all" as unset and fall back to the home branch.
 */
export function useBranchSelector(options: { allowAll?: boolean } = {}) {
  const { allowAll = false } = options;
  const userData = useAuthStore((s) => s.userData);
  const appcodeData = useAuthStore((s) => s.appcodeData);
  const userSid = String(userData?.user_sid ?? '');
  const homeSid = String(appcodeData?.sid ?? '');
  const homeName = (userData?.sch_name ?? '').trim().toLowerCase();
  const isHQ = userSid === '0';

  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [rawSid, setRawSid] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(BRANCH_STORAGE_KEY) || '';
    }
    return '';
  });
  const isAll = allowAll && isHQ && rawSid === ALL_BRANCHES;
  const selectedSid = rawSid === ALL_BRANCHES ? '' : rawSid;
  const [loadingBranches, setLoadingBranches] = useState(true);

  /** '' means "All branches" (only honoured when allowAll). */
  const setSelectedSid = useCallback((sid: string | ((prev: string) => string)) => {
    setRawSid((prev) => {
      let next = typeof sid === 'function' ? sid(prev) : sid;
      if (next === '' && allowAll) next = ALL_BRANCHES;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(BRANCH_STORAGE_KEY, next);
      }
      return next;
    });
  }, [allowAll]);

  const fetchBranches = useCallback(async (district?: string) => {
    if (!userData) return;

    setLoadingBranches(true);
    try {
      const res = await userService.getBranchList(undefined, district || undefined);
      if (res.success && res.data?.length) {
        setBranches(res.data);

        if (isHQ) {
          // HQ: keep stored value if valid, otherwise default to the branch
          // the user logged into so the pill matches the header identity.
          setSelectedSid((prev) => {
            const list = res.data!;
            if (prev === ALL_BRANCHES && allowAll) return prev;
            if (prev && list.some((b) => b.sid === prev)) {
              return prev;
            }
            const bySid = homeSid && homeSid !== '0' ? list.find((b) => b.sid === homeSid) : undefined;
            if (bySid) return bySid.sid;
            const byName = homeName ? list.find((b) => b.name.trim().toLowerCase() === homeName) : undefined;
            if (byName) return byName.sid;
            return list[0].sid;
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
  }, [userData, setSelectedSid, isHQ, userSid, homeSid, homeName, allowAll]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const branchName = useMemo(() => {
    return branches.find((b) => b.sid === selectedSid)?.name || '';
  }, [branches, selectedSid]);

  return {
    branches,
    /** '' while "All branches" is selected */
    selectedSid: isAll ? '' : selectedSid,
    setSelectedSid,
    loadingBranches,
    isHQ,
    isAll,
    allowAll: allowAll && isHQ,
    branchName,
    fetchBranches,
  };
}
