'use client';

import { Settings as SettingsIcon, Sun, Moon, Monitor, Info, CalendarClock, LifeBuoy, User, Mail, Phone } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';
import { useLanguageStore } from '@/stores/language.store';
import { useAuthStore } from '@/stores/auth.store';
import { openSupportPortal } from '@/lib/support-portal';
import { useTranslation } from '@/i18n';
import { useHydrated } from '@/hooks/use-hydrated';
import { SUPPORTED_LOCALES } from '@/i18n/types';
import { APP_VERSION, APP_VERSION_DATE } from '@/lib/version';
import { formatDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'App';

const THEME_OPTIONS = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
] as const;

export default function SettingsPage() {
  const { t } = useTranslation('common');
  const { t: tSupport } = useTranslation('support');
  const { theme, setTheme } = useTheme();
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const userData = useAuthStore((s) => s.userData);

  const accountName = userData?.user_name?.trim() || '';
  const accountEmail = userData?.user_email?.trim() || '';
  const accountPhone = userData?.user_phone_num?.trim() || '';

  // Gate the theme read until hydrated so the active button doesn't flash the
  // wrong state before hydration.
  const activeTheme = useHydrated() ? theme : undefined;

  return (
    <MotionStagger className="space-y-6">
      <MotionCard>
        <PageHeader
          icon={SettingsIcon}
          accent="primary"
          title={t('settings')}
          subtitle="Personalize how the app looks and reads."
        />
      </MotionCard>

      <MotionCard>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                <Info className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold tracking-tight">About</h2>
                <p className="text-xs text-muted-foreground">{APP_NAME} — current build.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 backdrop-blur px-2.5 py-1 text-[11px] font-mono font-medium text-foreground shadow-sm">
                    v{APP_VERSION}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/20">
                    <CalendarClock className="h-3 w-3" strokeWidth={2.5} />
                    {formatDate(APP_VERSION_DATE)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionCard>

      <MotionCard>
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold tracking-tight">{tSupport('account')}</h2>
                <p className="text-xs text-muted-foreground">{tSupport('accountSubtitle')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {accountName || <span className="text-muted-foreground">—</span>}
              </span>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {accountEmail || <span className="text-muted-foreground">—</span>}
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {accountPhone || <span className="text-muted-foreground">—</span>}
              </span>
            </div>
            <Button variant="outline" onClick={() => openSupportPortal(userData)}>
              <LifeBuoy className="h-4 w-4" />
              {tSupport('needSupport')}
            </Button>
          </CardContent>
        </Card>
      </MotionCard>

      <MotionCard>
        <Card>
          <CardContent className="space-y-3 p-6">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Appearance</h2>
              <p className="text-xs text-muted-foreground">Switch between light, dark, or follow your system.</p>
            </div>
            <div className="grid max-w-md grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = activeTheme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      'inline-flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-sm transition-all',
                      active
                        ? 'border-primary/50 bg-primary/[0.06] text-foreground shadow-sm'
                        : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
                    )}
                    aria-pressed={active}
                  >
                    <Icon className={cn('h-4 w-4', active && 'text-primary')} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </MotionCard>

      <MotionCard>
        <Card>
          <CardContent className="space-y-3 p-6">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">{t('language')}</h2>
              <p className="text-xs text-muted-foreground">Choose your interface language.</p>
            </div>
            <div className="grid max-w-md grid-cols-2 gap-2">
              {SUPPORTED_LOCALES.map((opt) => {
                const active = locale === opt.code;
                return (
                  <button
                    key={opt.code}
                    onClick={() => setLocale(opt.code)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all',
                      active
                        ? 'border-primary/50 bg-primary/[0.06] text-foreground shadow-sm'
                        : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
                    )}
                    aria-pressed={active}
                  >
                    <span className="text-base leading-none">{opt.flag}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </MotionCard>
    </MotionStagger>
  );
}
