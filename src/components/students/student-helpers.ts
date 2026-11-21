import type { StudentAddress, StudentVaccineInfo, StudentVaccineRaw, YesNo } from '@/types';

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

/**
 * Gender arrives as "1"/"0" (list, legacy detail) or "male"/"female"
 * (newer detail responses). Malay initials L/P are accepted too.
 */
export function genderCode(gender: string | number | undefined | null): 'M' | 'F' | '-' {
  const g = String(gender ?? '').trim().toLowerCase();
  if (g === '1' || g === 'male' || g === 'm' || g === 'l' || g === 'lelaki') return 'M';
  if (g === '0' || g === 'female' || g === 'f' || g === 'p' || g === 'perempuan') return 'F';
  return '-';
}

/** School name from a details response (`school`; older responses called it `course`). */
export function schoolName(s: { school?: string | null; course?: string | null } | null | undefined): string {
  return String(s?.school ?? s?.course ?? '').trim();
}

/** Legacy API uses "0000-00-00" as "no date". */
export function isEmptyDate(date: string | null | undefined): boolean {
  return !date || date === '0000-00-00' || date.startsWith('0000');
}

/** Placeholder strings the API uses for "nothing here". */
const EMPTY_TOKENS = new Set(['none', 'null', 'undefined', 'n/a', '-']);

export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  // "|" / "||||" are empty packed values from the legacy forms
  return s === '' || /^\|+$/.test(s) || EMPTY_TOKENS.has(s.toLowerCase());
}

export function displayValue(value: string | number | null | undefined): string {
  return isBlank(value) ? '-' : String(value).trim();
}

const CODE_PREFIXES: Record<string, string> = { wp: 'W.P.' };

/**
 * Turns snake_case / lowercase codes ("wp_kuala_lumpur", "malay", "other")
 * into display text. Values that already look like text are left alone.
 */
export function humanize(value: string | number | null | undefined): string {
  if (isBlank(value)) return '-';
  const s = String(value).trim();
  if (!/^[a-z0-9_]+$/.test(s)) return s;
  return s
    .split('_')
    .filter(Boolean)
    .map((w, i) => (i === 0 && CODE_PREFIXES[w]) || w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Packed legacy value "a|b|" → "a, b". */
export function unpack(value: string | null | undefined): string {
  if (isBlank(value)) return '-';
  const parts = String(value).split('|').map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts.join(', ') : '-';
}

/** Strips mis-encoded leading bullets (e.g. "â ") from legacy field labels. */
export function cleanLabel(label: string | null | undefined): string {
  return String(label ?? '')
    // "â" + C1 controls / "€¢" is a UTF-8 bullet decoded as Latin-1
    .replace(/^[\s\u0080-\u00bf]*â[\s\u0080-\u00bf€™¢]*/, '')
    .replace(/^[^\p{L}\p{N}(]+/u, '')
    .trim();
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

function toYesNo(v: string | undefined): YesNo {
  const s = (v ?? '').trim().toLowerCase();
  if (['yes', 'ya', 'y', '1', 'true'].includes(s)) return 'yes';
  if (['no', 'tidak', 't', 'n', '0', 'false'].includes(s)) return 'no';
  return '';
}

function splitPacked(v: string | undefined): [YesNo, string] {
  const [answer = '', ...rest] = String(v ?? '').split('|');
  return [toYesNo(answer), rest.join('|').trim()];
}

/** Accepts the packed API shape ({ mysj: "yes|ID" }) or the form shape. */
export function parseVaccine(v: StudentVaccineRaw | StudentVaccineInfo | null | undefined): StudentVaccineInfo {
  if (v && 'mySejahtera' in v) return v;
  const raw = (v ?? {}) as StudentVaccineRaw;
  const [mySejahtera, mySejahteraId] = splitPacked(raw.mysj);
  const [vaccinated, notVaccinatedReason] = splitPacked(raw.vaccine);
  const [dose1, dose1Info] = splitPacked(raw.dose1);
  const [dose2, dose2Info] = splitPacked(raw.dose2);
  const [booster, boosterInfo] = splitPacked(raw.booster);
  return {
    mySejahtera, mySejahteraId,
    vaccinated, notVaccinatedReason,
    dose1, dose1Info,
    dose2, dose2Info,
    booster, boosterInfo,
  };
}

/**
 * Normalises a student photo URL from the API:
 * - full https URLs pass through (spaces etc. are encoded)
 * - protocol-relative and plain http URLs are upgraded to https, since an
 *   http image on the https site is blocked as mixed content
 * - relative paths ("content/student/12.jpg", "12.jpg") are resolved against
 *   the school's legacy site, taken from `schLogo`
 *   (e.g. https://my20.awfatech.com/hidayahjb/content/logo/x.png)
 */
export function resolveImageUrl(
  path: string | null | undefined,
  schoolLogo?: string | null
): string | undefined {
  if (isBlank(path)) return undefined;
  const raw = String(path).trim().replace(/\\/g, '/');
  if (/^(data|blob):/i.test(raw)) return raw;

  let url: string | undefined;
  if (raw.startsWith('//')) url = `https:${raw}`;
  else if (/^https?:\/\//i.test(raw)) url = raw.replace(/^http:\/\//i, 'https://');
  else if (schoolLogo && /^https?:\/\//i.test(schoolLogo)) {
    const logo = schoolLogo.replace(/^http:\/\//i, 'https://');
    const cut = logo.indexOf('/content/');
    const siteBase = cut > -1 ? logo.slice(0, cut) : new URL(logo).origin;
    const rel = raw.replace(/^\.?\/+/, '');
    url = rel.includes('/')
      ? `${siteBase}/${rel.replace(/^.*?(?=content\/)/, '')}`
      : `${siteBase}/content/student/${rel}`;
  }
  if (!url) return undefined;
  try {
    return encodeURI(decodeURI(url));
  } catch {
    return url;
  }
}
