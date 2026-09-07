import type { StudentAddress } from '@/types';

/** Branch used for the status lookup when "All branches" is selected. */
export const DEFAULT_STATUS_BRANCH = '1';

export type StatusTone = 'active' | 'pending' | 'inactive';

/** Visual tone per status code: 6 Pelajar = active, 9 Senarai Menunggu = pending, rest = ended. */
export function statusTone(code: number | string | undefined | null): StatusTone {
  const n = Number(code);
  if (n === 6) return 'active';
  if (n === 9) return 'pending';
  return 'inactive';
}

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  inactive: 'bg-muted text-muted-foreground',
};

/** "0" = female, "1" = male */
export function genderCode(gender: string | undefined | null): 'M' | 'F' | '-' {
  if (gender === '1') return 'M';
  if (gender === '0') return 'F';
  return '-';
}

/** Legacy API uses "0000-00-00" as "no date". */
export function isEmptyDate(date: string | null | undefined): boolean {
  return !date || date === '0000-00-00' || date.startsWith('0000');
}

export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const s = String(value).trim();
  if (s === '' || s === 'None' || s === 'null') return '-';
  return s;
}

export function initials(name: string | null | undefined): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

export function formatAddress(address: StudentAddress | undefined): string {
  if (!address) return '-';
  const parts = [
    address.line1,
    address.line2,
    address.line3,
    [address.postcode, address.city].filter(Boolean).join(' '),
    address.state,
    address.country,
  ].filter((p) => p && p.trim() !== '');
  return parts.length ? parts.join(', ') : '-';
}

export const EMPTY_ADDRESS: StudentAddress = {
  line1: '',
  line2: '',
  line3: '',
  city: '',
  postcode: '',
  state: '',
  country: 'Malaysia',
};
