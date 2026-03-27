'use client';

import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Flame, Star, Medal } from 'lucide-react';
import { motion } from 'motion/react';
import { listItemTransition, DashboardSection, DashboardEmptyState } from '@/components/dashboard/motion-wrapper';
import { calculateStreaks, type StreakEntry } from '@/lib/streak-calculator';
import { attendanceService } from '@/services/attendance.service';
import { useTranslation } from '@/i18n';
import { toISODate } from '@/lib/date-utils';

interface TopPerformersProps {
  selectedSid: string;
}

const MEDAL_STYLES = [
  'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
  'bg-purple-50 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
] as const;

const TIER_BADGE_CONFIG: Record<StreakEntry['tier'], { labelKey: 'onFire' | 'solid' | 'good'; className: string; icon: typeof Flame }> = {
  'on-fire': {
    labelKey: 'onFire',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
    icon: Flame,
  },
  solid: {
    labelKey: 'solid',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
    icon: Star,
  },
  good: {
    labelKey: 'good',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
    icon: Medal,
  },
};

export function TopPerformers({ selectedSid }: TopPerformersProps) {
  const { t } = useTranslation('dashboard');
  const [streaks, setStreaks] = useState<StreakEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selectedSid) {
      setStreaks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 13);

      const res = await attendanceService.getList(
        { sid: selectedSid, start_date: toISODate(start), end_date: toISODate(end) },
        1,
        100
      );

      if (res.success && res.data?.list) {
        setStreaks(calculateStreaks(res.data.list));
      } else {
        setStreaks([]);
      }
    } catch {
      setStreaks([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periodLabel = (
    <span className="text-[10px] font-medium text-muted-foreground">{t('last14Days')}</span>
  );

  return (
    <DashboardSection
      icon={Trophy}
      iconBg="bg-amber-100 dark:bg-amber-900/40"
      iconColor="text-amber-600 dark:text-amber-400"
      title={t('topPerformers')}
      action={periodLabel}
      delay={0.25}
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : !selectedSid ? (
        <DashboardEmptyState
          icon={Trophy}
          title={t('selectBranchPerformers')}
          iconClassName="bg-muted"
        />
      ) : streaks.length === 0 ? (
        <DashboardEmptyState
          icon={Trophy}
          title={t('noPerformers')}
          description={t('noPerformersDesc')}
          iconClassName="bg-amber-100 dark:bg-amber-900/30 text-amber-500"
        />
      ) : (
        <div className="space-y-2">
          {streaks.map((entry, index) => {
            const badge = TIER_BADGE_CONFIG[entry.tier];
            const BadgeIcon = badge.icon;
            return (
              <motion.div
                key={entry.uid}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={listItemTransition(index)}
                whileHover={{ x: 4, transition: { duration: 0.2 } }}
                className="activity-row flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-default"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={listItemTransition(index, 0.15)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${MEDAL_STYLES[index] || MEDAL_STYLES[4]} ${index === 0 ? 'ring-2 ring-amber-300/50 dark:ring-amber-600/30' : ''}`}
                >
                  {index + 1}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.streak} {t('dayStreak')}</p>
                </div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={listItemTransition(index, 0.25)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                >
                  <BadgeIcon className={`h-3 w-3 ${entry.tier === 'on-fire' ? 'animate-fire' : ''}`} />
                  {t(badge.labelKey)}
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardSection>
  );
}
