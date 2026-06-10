'use client';

import { createContext, useContext, useMemo } from 'react';
import { useLanguageStore } from '@/stores/language.store';
import type { Locale, Translations } from './types';

import ms from './locales/ms.json';
import en from './locales/en.json';

const localeMap: Record<Locale, Translations> = { ms, en };

interface I18nContextValue {
  locale: Locale;
  translations: Translations;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  translations: en,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useLanguageStore((s) => s.locale);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, translations: localeMap[locale] }),
    [locale]
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext() {
  return useContext(I18nContext);
}
