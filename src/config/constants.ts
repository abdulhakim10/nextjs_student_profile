export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Attendance Admin Dashboard';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  ENCRYPTED_KEY: 'encrypted_key',
  ENCRYPTED_USER: 'encrypted_user',
  ACCESS_TOKEN: 'access_token',
  SERVER_ID: 'server_id',
  APPCODE_DATA: 'appcode_data',
  USER_DATA: 'user_data',
  FIREBASE_ID: 'firebase_id',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const DATE_FORMATS = {
  API: 'yyyy-MM-dd',
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_DATETIME: 'dd MMM yyyy HH:mm',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  LEAVE: 'Leave',
  HOLIDAY: 'Holiday',
} as const;

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  'half day': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  leave: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  holiday: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export const ATTENDANCE_GRID_CELL_COLORS: Record<string, string> = {
  present: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300',
  late: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300',
  absent: 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/60 dark:border-red-800 dark:text-red-400',
  leave: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/60 dark:border-violet-800 dark:text-violet-300',
  holiday: 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400',
  rest_day: 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-400',
  future: 'bg-muted/30 border-border/30 text-muted-foreground/30',
};
