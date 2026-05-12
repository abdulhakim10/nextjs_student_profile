import type ms from './locales/ms.json';

/** Full translation shape — derived from the default (Malay) locale */
export type Translations = typeof ms;

/** Top-level namespace keys */
export type TranslationNamespace = keyof Translations;

/** Supported locale codes */
export type Locale = 'ms' | 'en';

/** Generic translation function — use when passing t() to non-hook utilities */
export type TranslationFn = (key: string) => string;

/** Metadata for each supported locale */
export interface LocaleInfo {
  code: Locale;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export const DEFAULT_LOCALE: Locale = 'ms';

/** Type guard — narrows an unknown string (e.g. URL param) to a supported Locale. */
export function isLocale(value: unknown): value is Locale {
  return value === 'ms' || value === 'en';
}
