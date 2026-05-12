import { format, parseISO, isValid } from 'date-fns';

/** Returns a Date as local `YYYY-MM-DD` string (defaults to today). */
export function toLocalDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, 'dd MMM yyyy') : '-';
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return '-';
  // Handle dot notation like "8.00" → "08:00"
  const dotParts = String(time).split('.');
  if (dotParts.length === 2 && !time.includes(':') && !time.includes('T')) {
    return `${dotParts[0].padStart(2, '0')}:${dotParts[1].padEnd(2, '0')}`;
  }
  // Handle time-only strings like "08:30:00" or "08:30"
  if (time.includes(':') && time.length <= 8) return time.slice(0, 5);
  const d = parseISO(time);
  return isValid(d) ? format(d, 'HH:mm') : time;
}

export function formatDateTime(datetime: string): string {
  const d = parseISO(datetime);
  return isValid(d) ? format(d, 'dd MMM yyyy HH:mm') : '-';
}
