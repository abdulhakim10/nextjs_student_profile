'use client';

import { useCallback, useEffect, useState } from 'react';
import { studentService } from '@/services/student.service';
import { useFetchGuard } from '@/hooks/use-fetch-guard';
import type { StudentClassItem } from '@/types';
import { DEFAULT_STATUS_BRANCH } from './student-helpers';

const cache = new Map<string, StudentClassItem[]>();

/** Loads the class list for a branch (GET /student/classes/{branch}). */
export function useStudentClasses(branch?: string) {
  const key = branch || DEFAULT_STATUS_BRANCH;
  const [classes, setClasses] = useState<StudentClassItem[]>(() => cache.get(key) ?? []);
  const [loading, setLoading] = useState(false);
  const guard = useFetchGuard();

  const load = useCallback(
    async (branchKey: string) => {
      const id = guard.begin();
      const cached = cache.get(branchKey);
      if (cached) {
        setClasses(cached);
        return;
      }
      setLoading(true);
      try {
        const res = await studentService.getClassList(branchKey);
        if (guard.isStale(id)) return;
        const list = (res.success && res.data ? res.data : [])
          .map((c) => ({ classCode: c.classCode, className: c.className.trim() }))
          .sort((a, b) => a.className.localeCompare(b.className));
        cache.set(branchKey, list);
        setClasses(list);
      } catch {
        if (!guard.isStale(id)) setClasses([]);
      } finally {
        if (!guard.isStale(id)) setLoading(false);
      }
    },
    [guard]
  );

  useEffect(() => {
    load(key);
  }, [key, load]);

  return { classes, loading };
}
