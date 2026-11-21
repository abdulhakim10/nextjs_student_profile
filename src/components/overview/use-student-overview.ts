'use client';

import { useCallback, useEffect, useState } from 'react';
import { studentService } from '@/services/student.service';
import { useFetchGuard } from '@/hooks/use-fetch-guard';
import { DEFAULT_STATUS_BRANCH } from '@/components/students/student-helpers';
import { DEFAULT_STUDENT_STATUS } from '@/stores/student.store';
import type { StudentLevelResponse, StudentListItem, StudentListRequest } from '@/types';

export interface CountRow {
  code: string;
  label: string;
  count: number;
}

export interface StudentOverview {
  active: number;
  total: number;
  inactive: number;
  intakeThisYear: number;
  byStatus: CountRow[];
  byLevel: CountRow[];
  recent: StudentListItem[];
}

/**
 * There is no stats endpoint, so every figure is a `totalRecord` from the
 * list endpoint with `pageLimit: 1`. Note: the backend treats `status: ""`
 * as "active only", so the overall total is the sum of the per-status counts.
 */
async function count(params: Partial<StudentListRequest>): Promise<number> {
  try {
    const res = await studentService.fetchStudents({ ...params, pageLimit: 1, pageStart: 1 });
    return res.success && res.data ? res.data.totalRecord ?? 0 : 0;
  } catch {
    return 0;
  }
}

function normalizeLevels(data: StudentLevelResponse | null | undefined) {
  const rows = Array.isArray(data) ? data : data?.dataset ?? [];
  const label = !Array.isArray(data) ? data?.levelLabel?.trim() : '';
  return rows
    .filter((r) => r && r.educationLevel !== undefined && r.educationLevel !== null)
    .map((r) => ({
      code: String(r.educationLevel),
      label:
        (r.educationLevelName && String(r.educationLevelName).trim()) ||
        (label ? `${label} ${r.educationLevel}` : String(r.educationLevel)),
    }));
}

export function useStudentOverview(branch: string, ready: boolean) {
  const [data, setData] = useState<StudentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const guard = useFetchGuard();

  const load = useCallback(async () => {
    const id = guard.begin();
    setLoading(true);
    setError(false);
    const lookupBranch = branch || DEFAULT_STATUS_BRANCH;
    const year = String(new Date().getFullYear());

    try {
      const [statusRes, levelRes, recentRes] = await Promise.all([
        studentService.getStatusList(lookupBranch).catch(() => null),
        studentService.getLevelList(lookupBranch).catch(() => null),
        studentService.fetchStudents({
          branch,
          status: DEFAULT_STUDENT_STATUS,
          pageOrder: 'id',
          pageSort: 'desc',
          pageLimit: 6,
          pageStart: 1,
        }),
      ]);
      if (guard.isStale(id)) return;

      const statuses = statusRes?.success && statusRes.data ? statusRes.data : [];
      const levels = levelRes?.success ? normalizeLevels(levelRes.data) : [];

      const [statusCounts, levelCounts, intakeThisYear] = await Promise.all([
        Promise.all(statuses.map((s) => count({ branch, status: String(s.status) }))),
        Promise.all(
          levels.map((l) => count({ branch, status: DEFAULT_STUDENT_STATUS, educationLevel: l.code }))
        ),
        count({ branch, status: DEFAULT_STUDENT_STATUS, academicYear: year }),
      ]);
      if (guard.isStale(id)) return;

      const byStatus = statuses
        .map((s, i) => ({ code: String(s.status), label: s.statusName, count: statusCounts[i] }))
        .sort((a, b) => b.count - a.count);
      const byLevel = levels.map((l, i) => ({ ...l, count: levelCounts[i] }));

      const activeRow = byStatus.find((s) => s.code === DEFAULT_STUDENT_STATUS);
      const active =
        activeRow?.count ?? (recentRes.success && recentRes.data ? recentRes.data.totalRecord ?? 0 : 0);
      const total = byStatus.length ? byStatus.reduce((sum, s) => sum + s.count, 0) : active;

      setData({
        active,
        total,
        inactive: Math.max(0, total - active),
        intakeThisYear,
        byStatus,
        byLevel,
        recent: recentRes.success && recentRes.data ? recentRes.data.dataset ?? [] : [],
      });
    } catch {
      if (!guard.isStale(id)) {
        setData(null);
        setError(true);
      }
    } finally {
      if (!guard.isStale(id)) setLoading(false);
    }
  }, [branch, guard]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  return { data, loading, error, reload: load };
}
