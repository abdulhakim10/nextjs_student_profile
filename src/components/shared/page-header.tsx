'use client';

import { CalendarDays, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

/** Per-accent treatment: full-color gradient icon chip (white icon on
 *  saturated gradient) + subtle accent tint at the bottom-right of the
 *  card surface + two decorative orbs in the accent family.
 *
 *  Pick a different accent per page for visual variety while keeping the
 *  overall chrome consistent. `primary` is the brand default. */
export type PageHeaderAccent =
  | 'primary' | 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo' | 'violet';

const ACCENT_STYLES: Record<PageHeaderAccent, {
  iconGradient: string;
  iconShadow: string;
  surfaceTint: string;
  orb1: string;
  orb2: string;
}> = {
  primary: {
    iconGradient: 'from-primary via-primary to-primary/70',
    iconShadow:   'shadow-primary/30',
    surfaceTint:  'to-primary/[0.06]',
    orb1:         'bg-primary/15',
    orb2:         'bg-fuchsia-500/10',
  },
  emerald: {
    iconGradient: 'from-emerald-500 via-emerald-500 to-teal-600',
    iconShadow:   'shadow-emerald-500/30',
    surfaceTint:  'to-emerald-500/[0.06]',
    orb1:         'bg-emerald-500/15',
    orb2:         'bg-teal-500/10',
  },
  blue: {
    iconGradient: 'from-blue-500 via-blue-500 to-cyan-600',
    iconShadow:   'shadow-blue-500/30',
    surfaceTint:  'to-blue-500/[0.06]',
    orb1:         'bg-blue-500/15',
    orb2:         'bg-cyan-500/10',
  },
  amber: {
    iconGradient: 'from-amber-500 via-orange-500 to-rose-500',
    iconShadow:   'shadow-amber-500/30',
    surfaceTint:  'to-amber-500/[0.06]',
    orb1:         'bg-amber-500/15',
    orb2:         'bg-rose-500/10',
  },
  rose: {
    iconGradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
    iconShadow:   'shadow-rose-500/30',
    surfaceTint:  'to-rose-500/[0.06]',
    orb1:         'bg-rose-500/15',
    orb2:         'bg-pink-500/10',
  },
  indigo: {
    iconGradient: 'from-indigo-500 via-indigo-500 to-purple-600',
    iconShadow:   'shadow-indigo-500/30',
    surfaceTint:  'to-indigo-500/[0.06]',
    orb1:         'bg-indigo-500/15',
    orb2:         'bg-purple-500/10',
  },
  violet: {
    iconGradient: 'from-violet-500 via-violet-500 to-purple-600',
    iconShadow:   'shadow-violet-500/30',
    surfaceTint:  'to-violet-500/[0.06]',
    orb1:         'bg-violet-500/15',
    orb2:         'bg-fuchsia-500/10',
  },
};

/**
 * Standard page header card — drop-in for every page in the module so
 * every tab feels of-a-piece while still having its own color identity.
 *
 * Renders a subtle gradient surface tinted to the chosen `accent` with two
 * decorative orbs + dot texture, a full-color gradient icon chip (white
 * icon on saturated background) + title + subtitle on the left, and a
 * date pill (default) or caller-supplied element on the top-right.
 *
 *   <PageHeader icon={Settings} accent="primary" title="Settings" subtitle="...">
 *     <BranchPill {...branchState} />
 *   </PageHeader>
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  accent = 'primary',
  rightSlot,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: PageHeaderAccent;
  rightSlot?: ReactNode;
  children?: ReactNode;
}) {
  const { locale } = useTranslation('common');
  const todayFormatted = new Date().toLocaleDateString(
    locale === 'ms' ? 'ms-MY' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  );
  const styles = ACCENT_STYLES[accent];

  const defaultRightSlot = (
    <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm self-start">
      <CalendarDays className="h-3 w-3 text-primary" />
      <span>{todayFormatted}</span>
    </div>
  );

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card p-5 sm:p-7 shadow-sm',
      styles.surfaceTint,
    )}>
      <div aria-hidden className={cn('pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full blur-3xl', styles.orb1)} />
      <div aria-hidden className={cn('pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full blur-3xl', styles.orb2)} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:18px_18px]"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3 min-w-0">
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-inset ring-white/20 shrink-0',
              `bg-gradient-to-br ${styles.iconGradient}`,
              styles.iconShadow,
            )}>
              <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
            </div>
            <div className="leading-tight pt-0.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {children && (
            <div className="flex flex-wrap items-center gap-2">
              {children}
            </div>
          )}
        </div>
        {rightSlot ?? defaultRightSlot}
      </div>
    </div>
  );
}
