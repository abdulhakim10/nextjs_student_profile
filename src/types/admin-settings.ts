// ──────────────────────────────────────────
// 1. DAY TYPE
// ──────────────────────────────────────────

export interface DayTypePayload {
  sid: string;
  name: string;
  description: string;
  level: string;
  isWorkingDay: boolean;
  isPaid: boolean;
  allowOvertime: boolean;
  isActive: boolean;
}

export interface DayTypeUpdatePayload extends DayTypePayload {
  code: string;
}

export interface DayTypeItem {
  code: string;
  sid: string;
  level: string;
  name: string;
  description: string;
  isWorkingDay: boolean;
  isPaid: boolean | number;
  allowOvertime: boolean | number;
  isActive: boolean | number;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────
// 2. WORKING POLICY (OT Policy)
// ──────────────────────────────────────────

export interface WorkingPolicyRules {
  minMinutes: number;
  roundingMinutes: number;
  maxDailyHours: number;
  rate: number;
  holidayRate: number;
}

export interface WorkingPolicyPayload {
  sid: string;
  name: string;
  description: string;
  isActive: boolean;
  allowed: boolean;
  rules: WorkingPolicyRules;
}

export interface WorkingPolicyUpdatePayload extends WorkingPolicyPayload {
  code: string;
}

export interface WorkingPolicyItem {
  code: string;
  name: string;
  description: string;
  isActive: boolean | number;
  allowed: boolean | number;
  rules: WorkingPolicyRules;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────
// 3. RULESET
// ──────────────────────────────────────────

export interface FlexWindow {
  earliestIn: string | null;
  latestIn: string | null;
  requiredHours: number;
}

export interface RulesetPayload {
  sid: string;
  name: string;
  description: string;
  flexible: boolean;
  flexWindowActive: boolean;
  flexWindow?: FlexWindow | null;
  maxPair: number;
  doublePunchInSeconds: number;
  clockInGracePeriod: number;
  isActive: boolean;
}

export interface RulesetUpdatePayload extends RulesetPayload {
  code: string;
}

export interface RulesetItem {
  code: string;
  sid: string;
  name: string;
  description: string;
  flexible: boolean;
  flexWindowActive: boolean;
  flexWindow: FlexWindow;
  maxPair: number;
  doublePunchInSeconds: number;
  clockInGracePeriod: number;
  isActive: boolean | number;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────
// 4. SCHEDULE TEMPLATE
// ──────────────────────────────────────────

export interface ScheduleDayOverrides {
  rulesetCode?: string;
  otPolicyCode?: string;
}

export interface ScheduleDay {
  enabled: boolean;
  clockIn: string | null;
  clockOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  dayType: string | null;
  isOverride: boolean;
  overrides: ScheduleDayOverrides | null;
}

export type WeeklySchedule = Record<string, ScheduleDay>;

export interface ScheduleTemplatePayload {
  sid: string;
  name: string;
  description: string;
  isActive: boolean;
  schedule: WeeklySchedule;
}

export interface ScheduleTemplateUpdatePayload {
  code: string;
  schedule: WeeklySchedule;
}

export interface ScheduleTemplateListItem {
  code: string;
  name: string;
  sid: string;
}

export interface ScheduleTemplateItem {
  code: string;
  sid: string;
  name: string;
  description: string;
  isActive: boolean | number;
  schedule: WeeklySchedule;
  shiftSpan: number;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────
// 5. ATTENDANCE GROUP
// ──────────────────────────────────────────

export interface AttendanceGroupPayload {
  sid: string;
  name: string;
  description: string;
}

export interface AttendanceGroupUpdatePayload {
  code: string;
  sid: string;
  name: string;
  description: string;
  rulesetCode?: string;
  scheduleTemplateCode?: string;
  otPolicyCode?: string;
  isActive: boolean;
}

export interface AttendanceGroupItem {
  code: string;
  sid: string;
  name: string;
  description: string;
  rulesetCode: string;
  scheduleTemplateCode: string;
  otPolicyCode: string | null;
  isActive: boolean | number;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────
// 6. EMPLOYEE ATTENDANCE PROFILE
// ──────────────────────────────────────────

export interface EmployeeProfilePayload {
  uid: string[];
  sid: string;
  attendance_group_code: string;
  ot_policy_code?: string;
  override_schedule_enabled?: boolean;
}

export interface EmployeeProfileListItem {
  uid: string;
  sid: string;
  attendanceGroupCode: string;
  attendanceGroupName: string;
  otPolicyCode: string | null;
  otPolicyName: string | null;
  overrideScheduleEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeProfileItem {
  uid: string;
  sid: string;
  attendanceGroupCode: string;
  override: {
    otPolicyCode: string | null;
    flexible: boolean;
  };
  overrideScheduleEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  attendanceGroup: {
    code: string;
    name: string;
    description: string;
    rulesetCode: string;
    scheduleTemplateCode: string;
    otPolicyCode: string | null;
  };
}

// ──────────────────────────────────────────
// 7. OVERRIDE SCHEDULE
// ──────────────────────────────────────────

export interface OverrideDaySchedule {
  clockIn: string | null;
  clockOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
}

export interface UpsertOverrideSchedulePayload {
  uid: string;
  sid: string;
  schedules: Record<string, OverrideDaySchedule | null>;
}

export interface DeleteOverrideSchedulePayload {
  uid: string;
  sid: string;
  dates: string[];
}

export type OverrideScheduleMap = Record<string, OverrideDaySchedule | null>;
