import type { ScheduleDay, WeeklySchedule } from '@/types/admin-settings';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DayForm = {
  enabled: boolean;
  clockIn: string;
  clockOut: string;
  breakStart: string;
  breakEnd: string;
  isOverride: boolean;
  overrideOtPolicyCode: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DEFAULT_DAY_ON: DayForm = {
  enabled: true,
  clockIn: '08:00',
  clockOut: '17:00',
  breakStart: '13:00',
  breakEnd: '14:00',
  isOverride: false,
  overrideOtPolicyCode: '',
};

export const DEFAULT_DAY_OFF: DayForm = {
  enabled: false,
  clockIn: '',
  clockOut: '',
  breakStart: '',
  breakEnd: '',
  isOverride: false,
  overrideOtPolicyCode: '',
};

export const DEFAULT_WEEK: DayForm[] = [
  DEFAULT_DAY_OFF,  // Sunday
  DEFAULT_DAY_ON,   // Monday
  DEFAULT_DAY_ON,   // Tuesday
  DEFAULT_DAY_ON,   // Wednesday
  DEFAULT_DAY_ON,   // Thursday
  DEFAULT_DAY_ON,   // Friday
  DEFAULT_DAY_OFF,  // Saturday
];

// ─── Time format conversion ────────────────────────────────────────────────

/** API "8:00" -> UI "08:00" (pad hours for <input type="time">) */
export function apiTimeToUI(value: string | null | undefined): string {
  if (!value && value !== '0') return '';
  const str = String(value).replace('.', ':');
  const parts = str.split(':');
  if (parts.length !== 2) return '';
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padEnd(2, '0');
  return `${h}:${m}`;
}

/** UI "08:00" -> API "8:00" (standard colon format) */
export function uiTimeToAPI(value: string): string | null {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (Number.isNaN(h)) return null;
  return `${h}:${m}`;
}

/** Convert an API ScheduleDay into internal DayForm */
export function scheduleDayToDayForm(day: ScheduleDay): DayForm {
  return {
    enabled: day.enabled,
    clockIn: apiTimeToUI(day.clockIn),
    clockOut: apiTimeToUI(day.clockOut),
    breakStart: apiTimeToUI(day.breakStart),
    breakEnd: apiTimeToUI(day.breakEnd),
    isOverride: !!day.isOverride,
    overrideOtPolicyCode: day.overrides?.otPolicyCode ?? '',
  };
}

/** Convert internal DayForm array into API WeeklySchedule */
export function daysToWeeklySchedule(days: DayForm[]): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  for (let i = 0; i < 7; i++) {
    const d = days[i];
    const hasOverride = d.isOverride && !!d.overrideOtPolicyCode;
    schedule[String(i)] = {
      enabled: d.enabled,
      clockIn: d.enabled ? uiTimeToAPI(d.clockIn) : null,
      clockOut: d.enabled ? uiTimeToAPI(d.clockOut) : null,
      breakStart: d.enabled ? uiTimeToAPI(d.breakStart) : null,
      breakEnd: d.enabled ? uiTimeToAPI(d.breakEnd) : null,
      dayType: null,
      isOverride: hasOverride,
      overrides: hasOverride
        ? { otPolicyCode: d.overrideOtPolicyCode }
        : null,
    };
  }
  return schedule;
}
