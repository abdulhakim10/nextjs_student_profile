'use client';

import { useEffect, useState } from 'react';
import { studentService } from '@/services/student.service';
import { useFetchGuard } from '@/hooks/use-fetch-guard';
import type { StudentSessions } from '@/types';
import { DEFAULT_STATUS_BRANCH } from './student-helpers';

/** Module cache shared by every caller; null = fetched but unavailable. */
const cache = new Map<string, StudentSessions | null>();

/** Session-year dropdown for a branch (GET /student/sessions/{branch}), incl. its current session. */
export function useStudentSessions(branch?: string) {
  const key = branch || DEFAULT_STATUS_BRANCH;
  const [, rerender] = useState(0);
  const guard = useFetchGuard();

  useEffect(() => {
    if (cache.has(key)) return;
    const id = guard.begin();
    studentService
      .getSessions(key)
      .then((res) => cache.set(key, res.success && res.data ? res.data : null))
      .catch(() => cache.set(key, null))
      .finally(() => {
        if (!guard.isStale(id)) rerender((n) => n + 1);
      });
  }, [key, guard]);

  return { sessions: cache.get(key) ?? null, loading: !cache.has(key) };
}
