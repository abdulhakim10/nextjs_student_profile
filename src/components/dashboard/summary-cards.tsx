'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { attendanceService } from '@/services/attendance.service';
import type { DashboardSummary } from '@/types';
import { mapApiToSummary } from '@/lib/dashboard-utils';
import { Users, UserCheck, UserX, Clock, CalendarOff, TrendingUp } from 'lucide-react';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';
import { AnimatedNumber } from '@/components/dashboard/animated-number';
import { useTranslation } from '@/i18n';

const CARD_CONFIG = [
  {
    key: 'total_staff' as const,
    titleKey: 'totalStaff' as const,
    icon: Users,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    tint: 'bg-blue-50/50 dark:bg-blue-950/20',
    accent: 'hover:shadow-blue-200/40 dark:hover:shadow-blue-800/20',
  },
  {
    key: 'present_today' as const,
    titleKey: 'presentToday' as const,
    icon: UserCheck,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    tint: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    accent: 'hover:shadow-emerald-200/40 dark:hover:shadow-emerald-800/20',
  },
  {
    key: 'absent_today' as const,
    titleKey: 'absentToday' as const,
    icon: UserX,
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-400',
    tint: 'bg-red-50/50 dark:bg-red-950/20',
    accent: 'hover:shadow-red-200/40 dark:hover:shadow-red-800/20',
  },
  {
    key: 'late_today' as const,
    titleKey: 'lateToday' as const,
    icon: Clock,
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    tint: 'bg-amber-50/50 dark:bg-amber-950/20',
    accent: 'hover:shadow-amber-200/40 dark:hover:shadow-amber-800/20',
  },
  {
    key: 'on_leave_today' as const,
    titleKey: 'onLeave' as const,
    icon: CalendarOff,
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    tint: 'bg-purple-50/50 dark:bg-purple-950/20',
    accent: 'hover:shadow-purple-200/40 dark:hover:shadow-purple-800/20',
  },
  {
    key: 'attendance_rate' as const,
    titleKey: 'attendanceRate' as const,
    icon: TrendingUp,
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    tint: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    accent: 'hover:shadow-indigo-200/40 dark:hover:shadow-indigo-800/20',
    isPercentage: true,
  },
];

interface SummaryCardsProps {
  selectedSid: string;
}

export function SummaryCards({ selectedSid }: SummaryCardsProps) {
  const { t } = useTranslation('dashboard');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async (sid: string) => {
    if (!sid) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await attendanceService.getDashboardSummary(sid);
      if (res.success && res.data) {
        setData(mapApiToSummary(res.data));
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(selectedSid);
  }, [selectedSid, fetchSummary]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {CARD_CONFIG.map((card) => (
          <Card key={card.key} className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-14" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <MotionStagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {CARD_CONFIG.map((card) => {
        const Icon = card.icon;
        const value = data?.[card.key] ?? 0;
        return (
          <MotionCard key={card.key}>
            <Card className={`dashboard-card overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-md ${card.accent} ${card.tint}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t(card.titleKey)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="animate-number-pop text-2xl font-bold tracking-tight">
                        <AnimatedNumber value={value} suffix={card.isPercentage ? '%' : ''} />
                      </p>
                      {card.key === 'present_today' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`summary-icon-wrapper rounded-xl p-2.5 ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionCard>
        );
      })}
    </MotionStagger>
  );
}
