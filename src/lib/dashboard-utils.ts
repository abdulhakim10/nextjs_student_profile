import type { DashboardSummary, AttendanceDashboardSummaryResponse } from '@/types';

/** Maps the camelCase API response to the snake_case DashboardSummary used internally */
export function mapApiToSummary(api: AttendanceDashboardSummaryResponse): DashboardSummary {
  return {
    total_staff: api.totalStaff,
    present_today: api.totalPresent,
    absent_today: api.totalAbsent,
    late_today: api.totalLate,
    on_leave_today: api.totalOnLeave,
    attendance_rate: api.attendanceRate,
  };
}
