export interface DashboardSummary {
  total_staff: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
  attendance_rate: number;
}

/** API response for GET /api/v2/attendance/{app}/{user}/admin/dashboard/summary */
export interface AttendanceDashboardSummaryResponse {
  totalStaff: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalOnLeave: number;
  attendanceRate: number;
  date: string;
}

export interface ChartDataPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface RecentActivity {
  id: string;
  staff_name: string;
  staff_image: string;
  action: string;
  time: string;
  status: string;
}
