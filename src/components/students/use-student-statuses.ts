'use client';

import { useCallback, useEffect, useState } from 'react';
import { studentService } from '@/services/student.service';
import { useFetchGuard } from '@/hooks/use-fetch-guard';
import type { StudentStatusItem } from '@/types';
import { DEFAULT_STATUS_BRANCH } from './student-helpers';

/** Module-level cache so the list, view modal and edit modal share one fetch per branch. */
const cache = new Map<string, StudentStatusItem[]>();

/**
 * Loads the status code → label table for a branch
 * (GET /student/status/{branch}) and exposes a label lookup.
 */
export function useStudentStatuses(branch?: string) {
  const key = branch || DEFAULT_STATUS_BRANCH;
  const [statuses, setStatuses] = useState<StudentStatusItem[]>(() => cache.get(key) ?? []);
  const [loading, setLoading] = useState(false);
  const guard = useFetchGuard();

  const load = useCallback(
    async (branchKey: string) => {
      const id = guard.begin();
      const cached = cache.get(branchKey);
      if (cached) {
        setStatuses(cached);
        return;
      }
      setLoading(true);
      try {
        const res = await studentService.getStatusList(branchKey);
        if (guard.isStale(id)) return;
        const list = res.success && res.data ? res.data : [];
        cache.set(branchKey, list);
        setStatuses(list);
      } catch {
        if (!guard.isStale(id)) setStatuses([]);
      } finally {
        if (!guard.isStale(id)) setLoading(false);
      }
    },
    [guard]
  );

  useEffect(() => {
    load(key);
  }, [key, load]);

  const labelFor = useCallback(
    (code: number | string | undefined | null, fallback = 'Status'): string => {
      if (code === undefined || code === null || code === '') return '-';
      const found = statuses.find((s) => s.status === Number(code));
      return found ? found.statusName : `${fallback} ${code}`;
    },
    [statuses]
  );

  return { statuses, loading, labelFor };
}
