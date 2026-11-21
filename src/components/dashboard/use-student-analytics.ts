'use client';

import { useCallback, useEffect, useState } from 'react';
import { studentService } from '@/services/student.service';
import { useFetchGuard } from '@/hooks/use-fetch-guard';
import { DEFAULT_STATUS_BRANCH, genderCode, isEmptyDate } from '@/components/students/student-helpers';
import { DEFAULT_STUDENT_STATUS } from '@/stores/student.store';
import type { StudentLevelResponse, StudentListItem } from '@/types';

export interface Datum {
  key: string;
  label: string;
  value: number;
}

export interface StudentAnalytics {
  activeCount: number;
  /** Rows actually loaded (capped by MAX_ROWS) — breakdowns are computed from these. */
  sampled: number;
  truncated: boolean;
  male: number;
  female: number;
  unknownGender: number;
  averageAge: number | null;
  classCount: number;
  byIntake: Datum[];
  byAge: Datum[];
  byClass: Datum[];
  byLevel: Datum[];
  byStatus: Datum[];
  byRegisterMonth: Datum[];
}

const PAGE_SIZE = 500;
const MAX_ROWS = 5000;
const TOP_CLASSES = 10;

/** Pages through every active student of the branch (up to MAX_ROWS). */
async function fetchAllActive(branch: string) {
  const rows: StudentListItem[] = [];
  let total = 0;
  for (let page = 1; rows.length < MAX_ROWS; page++) {
    const res = await studentService.fetchStudents({
      branch,
      status: DEFAULT_STUDENT_STATUS,
      pageOrder: 'id',
      pageSort: 'desc',
      pageLimit: PAGE_SIZE,
      pageStart: page,
    });
    if (!res.success || !res.data) throw new Error(res.message);
    total = res.data.totalRecord ?? 0;
    const batch = res.data.dataset ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE || rows.length >= total) break;
  }
  return { rows, total };
}

async function countByStatus(branch: string, status: string) {
  try {
    const res = await studentService.fetchStudents({ branch, status, pageLimit: 1, pageStart: 1 });
    return res.success && res.data ? res.data.totalRecord ?? 0 : 0;
  } catch {
    return 0;
  }
}

function levelNames(data: StudentLevelResponse | null | undefined): Map<string, string> {
  const rows = Array.isArray(data) ? data : data?.dataset ?? [];
  const label = !Array.isArray(data) ? data?.levelLabel?.trim() : '';
  return new Map(
    rows.map((r) => [
      String(r.educationLevel),
      (r.educationLevelName && String(r.educationLevelName).trim()) ||
        (label ? `${label} ${r.educationLevel}` : String(r.educationLevel)),
    ])
  );
}

function tally<T>(items: T[], keyOf: (item: T) => string | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = keyOf(it);
    if (k === null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function ageOf(birthDate: string, now: Date): number | null {
  if (isEmptyDate(birthDate)) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 100 ? age : null;
}

export function useStudentAnalytics(
  branch: string,
  ready: boolean,
  labels: { noClass: string; other: string; unknown: string; locale: string }
) {
  const [data, setData] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const guard = useFetchGuard();
  const { noClass, other, unknown, locale } = labels;

  const load = useCallback(async () => {
    const id = guard.begin();
    setLoading(true);
    setError(false);
    const lookup = branch || DEFAULT_STATUS_BRANCH;
    try {
      const [{ rows, total }, statusRes, levelRes, classRes] = await Promise.all([
        fetchAllActive(branch),
        studentService.getStatusList(lookup).catch(() => null),
        studentService.getLevelList(lookup).catch(() => null),
        studentService.getClassList(lookup).catch(() => null),
      ]);
      if (guard.isStale(id)) return;

      const statuses = statusRes?.success && statusRes.data ? statusRes.data : [];
      const statusCounts = await Promise.all(statuses.map((s) => countByStatus(branch, String(s.status))));
      if (guard.isStale(id)) return;

      const now = new Date();
      const levels = levelNames(levelRes?.success ? levelRes.data : null);
      const classNames = new Map(
        (classRes?.success && classRes.data ? classRes.data : []).map((c) => [c.classCode, c.className])
      );

      // Gender
      const male = rows.filter((r) => genderCode(r.gender) === 'M').length;
      const female = rows.filter((r) => genderCode(r.gender) === 'F').length;

      // Age
      const ages = rows.map((r) => ageOf(r.birthDate, now)).filter((a): a is number => a !== null);
      const ageTally = tally(ages, (a) => String(a));
      const ageKeys = [...ageTally.keys()].map(Number).sort((a, b) => a - b);
      const byAge: Datum[] = [];
      if (ageKeys.length) {
        for (let a = ageKeys[0]; a <= ageKeys[ageKeys.length - 1]; a++) {
          byAge.push({ key: String(a), label: String(a), value: ageTally.get(String(a)) ?? 0 });
        }
      }

      // Intake year (contiguous range so gaps show as zero)
      const intakeTally = tally(rows, (r) => (/^\d{4}$/.test(r.academicYear ?? '') ? r.academicYear : null));
      const years = [...intakeTally.keys()].map(Number).sort((a, b) => a - b);
      const byIntake: Datum[] = [];
      if (years.length) {
        for (let y = Math.max(years[0], years[years.length - 1] - 11); y <= years[years.length - 1]; y++) {
          byIntake.push({ key: String(y), label: String(y), value: intakeTally.get(String(y)) ?? 0 });
        }
      }

      // Class — top N + Other
      const classTally = tally(rows, (r) => (r.classCode ? String(r.classCode) : ''));
      const classSorted = [...classTally.entries()]
        .map(([code, value]) => ({
          key: code || '__none',
          label: code ? classNames.get(code) || rows.find((r) => r.classCode === code)?.className || code : noClass,
          value,
        }))
        .sort((a, b) => b.value - a.value);
      const byClass = classSorted.slice(0, TOP_CLASSES);
      const rest = classSorted.slice(TOP_CLASSES).reduce((s, d) => s + d.value, 0);
      if (rest > 0) byClass.push({ key: '__other', label: other, value: rest });

      // Level (keeps the branch's level order)
      const levelTally = tally(rows, (r) =>
        r.educationLevel === null || r.educationLevel === undefined ? null : String(r.educationLevel)
      );
      const byLevel: Datum[] = [...levels.entries()]
        .map(([code, label]) => ({ key: code, label, value: levelTally.get(code) ?? 0 }))
        .filter((d) => d.value > 0);
      for (const [code, value] of levelTally) {
        if (!levels.has(code)) byLevel.push({ key: code, label: `${unknown} (${code})`, value });
      }

      // Status (all records, not only active)
      const byStatus = statuses
        .map((s, i) => ({ key: String(s.status), label: s.statusName, value: statusCounts[i] }))
        .sort((a, b) => b.value - a.value);

      // Registrations per month — last 12 months, active students
      const monthFmt = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' });
      const regTally = tally(rows, (r) => (isEmptyDate(r.registerDate) ? null : r.registerDate.slice(0, 7)));
      const byRegisterMonth: Datum[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byRegisterMonth.push({ key, label: monthFmt.format(d), value: regTally.get(key) ?? 0 });
      }

      setData({
        activeCount: total,
        sampled: rows.length,
        truncated: rows.length < total,
        male,
        female,
        unknownGender: rows.length - male - female,
        averageAge: ages.length ? ages.reduce((s, a) => s + a, 0) / ages.length : null,
        classCount: [...classTally.keys()].filter(Boolean).length,
        byIntake,
        byAge,
        byClass,
        byLevel,
        byStatus,
        byRegisterMonth,
      });
    } catch {
      if (!guard.isStale(id)) {
        setData(null);
        setError(true);
      }
    } finally {
      if (!guard.isStale(id)) setLoading(false);
    }
  }, [branch, guard, noClass, other, unknown, locale]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  return { data, loading, error, reload: load };
}
