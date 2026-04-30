import { useCallback } from 'react';
import { useI18nContext } from './provider';
import type { TranslationNamespace, Translations, TranslationFn } from './types';

/**
 * Hook to access translations for a specific namespace.
 *
 * @example
 *   const { t } = useTranslation('dashboard');
 *   t('totalUsers') // → "Jumlah Pengguna" (ms) or "Total Users" (en)
 *
 * When passing `t` to utility functions, cast-free via TranslationFn:
 *   computeInsights(summary, t)
 */
export function useTranslation<NS extends TranslationNamespace>(namespace: NS) {
  const { locale, translations } = useI18nContext();
  const ns = translations[namespace];

  const t = useCallback(
    (key: keyof Translations[NS] | (string & {})) => {
      return (ns[key as keyof Translations[NS]] as string) ?? String(key);
    },
    [ns]
  ) as ((key: keyof Translations[NS]) => string) & TranslationFn;

  return { t, locale };
}
