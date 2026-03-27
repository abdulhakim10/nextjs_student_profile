import type { AttendanceRecord, User } from '@/types';

export const ATTENDANCE_EXPORT_COLUMNS: {
  header: string;
  key: keyof AttendanceRecord;
  width?: number;
}[] = [
  { header: 'Date', key: 'date', width: 12 },
  { header: 'Name', key: 'name', width: 20 },
  { header: 'UID', key: 'uid', width: 15 },
  { header: 'Clock In', key: 'clockInTime', width: 10 },
  { header: 'Clock Out', key: 'clockOutTime', width: 10 },
  { header: 'Work Hours', key: 'workHours', width: 10 },
  { header: 'Status', key: 'status', width: 10 },
];

export const STAFF_EXPORT_COLUMNS: {
  header: string;
  key: keyof User;
  width?: number;
}[] = [
  { header: 'Name', key: 'name', width: 20 },
  { header: 'Email', key: 'email', width: 25 },
  { header: 'Phone', key: 'phone', width: 15 },
  { header: 'Department', key: 'department', width: 15 },
  { header: 'Position', key: 'position', width: 15 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Join Date', key: 'join_date', width: 12 },
];
