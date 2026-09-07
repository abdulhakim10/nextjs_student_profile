'use client';

import { useCallback, useEffect, useState } from 'react';
import { studentService } from '@/services/student.service';
import { useFetchGuard } from '@/hooks/use-fetch-guard';
import type { StudentLevelItem, StudentLevelResponse } from '@/types';
import { DEFAULT_STATUS_BRANCH } from './student-helpers';

const cache = new Map<string, StudentLevelItem[]>();

/** Accepts either the flat list or the `{ levelLabel, dataset }` wrapper. */
function normalize(data: StudentLevelResponse | null | undefined): StudentLevelItem[] {
  const rows = Array.isArray(data) ? data : data?.dataset ?? [];
  const label = !Array.isArray(data) ? data?.levelLabel?.trim() : '';
  return rows
    .filter((r) => r && r.educationLevel !== undefined && r.educationLevel !== null)
    .map((r) => ({
      educationLevel: String(r.educationLevel),
      educationLevelName:
        (r.educationLevelName && String(r.educationLevelName).trim()) ||
        (label ? `${label} ${r.educationLevel}` : String(r.educationLevel)),
    }));
}

/** Loads the education level list for a branch (GET /student/levels/{branch}). */
export function useStudentLevels(branch?: string) {
  const key = branch || DEFAULT_STATUS_BRANCH;
  const [levels, setLevels] = useState<StudentLevelItem[]>(() => cache.get(key) ?? []);
  const [loading, setLoading] = useState(false);
  const guard = useFetchGuard();

  const load = useCallback(
    async (branchKey: string) => {
      const id = guard.begin();
      const cached = cache.get(branchKey);
      if (cached) {
        setLevels(cached);
        return;
      }
      setLoading(true);
      try {
        const res = await studentService.getLevelList(branchKey);
        if (guard.isStale(id)) return;
        const list = res.success ? normalize(res.data) : [];
        cache.set(branchKey, list);
        setLevels(list);
      } catch {
        if (!guard.isStale(id)) setLevels([]);
      } finally {
        if (!guard.isStale(id)) setLoading(false);
      }
    },
    [guard]
  );

  useEffect(() => {
    load(key);
  }, [key, load]);

  return { levels, loading };
}
