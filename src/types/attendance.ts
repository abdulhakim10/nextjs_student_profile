export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave' | 'Holiday';

export interface AttendanceGridDay {
  clockIn?: string;
  clockOut?: string | null;
  workHours?: string | null;
  status: string;
}

export interface AttendanceGridUser {
  uid: string;
  name: string;
  groupCode?: string | null;
  days: Record<string, AttendanceGridDay | null>;
}

export interface AttendanceGridResponse {
  users: AttendanceGridUser[];
  dates: string[];
  pagination: AttendanceListPagination;
}

export interface AttendanceRecord {
  uid: string;
  name: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  workHours: number | string | null;
  status: string;
}

export interface AttendanceListPagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AttendanceListResponse {
  startDate: string;
  endDate: string;
  list: AttendanceRecord[];
  pagination: AttendanceListPagination;
}

export interface AttendanceFilters {
  sid?: string;
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface AttendanceSummary {
  total_staff: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
  attendance_rate: number;
}

export interface AttendanceChartData {
  date: string;
  present: number;
  absent: number;
  late: number;
  restDay?: boolean;
}

export interface AttendanceReportDepartment {
  department: string;
  attendanceRate: number;
  present: number;
  absent: number;
}

// Individual monthly report types
export interface IndividualReportEvent {
  eventType: number;
  eventTime: string;
  eventDate: string;
}

export interface IndividualReportDay {
  date: string;
  dayName: string;
  pairs: unknown[];
  events: IndividualReportEvent[];
  status: string;
  isLate: boolean;
  lateTime: string;
  lateMinutes: number;
  workingTime: string;
  workingMinutes: number;
  expectedTime: string;
  expectedMinutes: number;
  shortTime: string;
  shortMinutes: number;
  overtimeTime: string;
  overtimeMinutes: number;
  paidOvertimeTime: string;
  paidOvertimeMinutes: number;
  scheduleTemplateCode: string;
}

export interface IndividualReportSummary {
  totalDays: string;
  workingDays: string;
  presentDays: string;
  onTimeDays: string;
  lateDays: string;
  absentDays: string;
  restDays: string;
  kpiPercent: string;
  totalLateTime: string;
  totalLateMinutes: number;
  totalWorkingTime: string;
  totalWorkingMinutes: number;
  totalShortTime: string;
  totalShortMinutes: number;
  totalOvertimeTime: string;
  totalOvertimeMinutes: number;
  totalPaidOvertimeTime: string;
  totalPaidOvertimeMinutes: number;
}

export interface IndividualReportResponse {
  name: string;
  uid: string;
  attendanceOfMonth: IndividualReportDay[];
  attendanceSummary: IndividualReportSummary;
}

export interface AttendanceReportData {
  reportType: string;
  startDate: string;
  endDate: string;
  dailyBreakdown: AttendanceChartData[];
  departmentBreakdown: AttendanceReportDepartment[];
}
