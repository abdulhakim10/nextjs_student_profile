'use client';

import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'motion/react';
import { listItemTransition, DashboardSection, DashboardEmptyState } from '@/components/dashboard/motion-wrapper';
import { attendanceService } from '@/services/attendance.service';
import type { AttendanceChartData } from '@/types';
import { useTranslation } from '@/i18n';
import { toISODate } from '@/lib/date-utils';
import { STATUS_COLORS } from '@/components/dashboard/chart-constants';

interface WeeklyHeatmapProps {
  selectedSid: string;
}

interface DayCell {
  date: string;
  dayLabel: string;
  dateLabel: string;
  rate: number;
  present: number;
  late: number;
  absent: number;
  total: number;
  restDay: boolean;
}

function getRateColor(rate: number, restDay: boolean): string {
  if (restDay) return 'bg-muted/50 dark:bg-muted/30';
  if (rate >= 90) return 'bg-emerald-500';
  if (rate >= 75) return 'bg-emerald-400';
  if (rate >= 60) return 'bg-amber-400';
  if (rate >= 40) return 'bg-orange-400';
  return 'bg-red-400';
}

export function WeeklyHeatmap({ selectedSid }: WeeklyHeatmapProps) {
  const { t } = useTranslation('dashboard');
  const { t: tStatus } = useTranslation('status');
  const { locale } = useTranslation('common');
  const [days, setDays] = useState<DayCell[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selectedSid) {
      setDays([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);

      const res = await attendanceService.getReport({
        sid: selectedSid,
        report_type: 'weekly',
        start_date: toISODate(start),
        end_date: toISODate(end),
      });

      if (res.success && res.data?.dailyBreakdown) {
        const loc = locale === 'ms' ? 'ms-MY' : 'en-GB';
        const cells: DayCell[] = res.data.dailyBreakdown.map((d: AttendanceChartData) => {
          const dateObj = new Date(d.date);
          const total = d.present + d.late + d.absent;
          const attended = d.present + d.late;
          const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
          return {
            date: d.date,
            dayLabel: dateObj.toLocaleDateString(loc, { weekday: 'short' }),
            dateLabel: dateObj.toLocaleDateString(loc, { day: 'numeric', month: 'short' }),
            rate,
            present: d.present,
            late: d.late,
            absent: d.absent,
            total,
            restDay: d.restDay ?? false,
          };
        });
        setDays(cells);
      } else {
        setDays([]);
      }
    } catch {
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSid, locale]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute week summary
  const workingDays = days.filter((d) => !d.restDay);
  const avgRate = workingDays.length > 0
    ? Math.round(workingDays.reduce((sum, d) => sum + d.rate, 0) / workingDays.length)
    : 0;
  const totalPresent = workingDays.reduce((sum, d) => sum + d.present, 0);
  const totalLate = workingDays.reduce((sum, d) => sum + d.late, 0);
  const totalAbsent = workingDays.reduce((sum, d) => sum + d.absent, 0);

  // Trend: compare first half vs second half of the week
  const half = Math.ceil(workingDays.length / 2);
  const firstHalf = workingDays.slice(0, half);
  const secondHalf = workingDays.slice(half);
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, d) => s + d.rate, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, d) => s + d.rate, 0) / secondHalf.length : 0;
  const trendDiff = Math.round(secondAvg - firstAvg);

  const periodLabel = (
    <span className="text-[10px] font-medium text-muted-foreground">{t('last7Days')}</span>
  );

  return (
    <DashboardSection
      icon={CalendarDays}
      iconBg="bg-indigo-100 dark:bg-indigo-900/40"
      iconColor="text-indigo-600 dark:text-indigo-400"
      title={t('weeklyHeatmap')}
      action={periodLabel}
      delay={0.15}
    >
      {!selectedSid ? (
        <DashboardEmptyState
          icon={CalendarDays}
          title={t('selectBranchHeatmap')}
          iconClassName="bg-muted"
        />
      ) : loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : days.length === 0 ? (
        <DashboardEmptyState
          icon={CalendarDays}
          title={t('noDataPeriod')}
          iconClassName="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500"
        />
      ) : (
        <div className="space-y-4">
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={listItemTransition(index, 0.05)}
                className="group relative"
              >
                <div
                  className={`relative rounded-xl p-2.5 text-center transition-all duration-200 hover:scale-105 hover:shadow-md cursor-default ${getRateColor(day.rate, day.restDay)}`}
                >
                  <p className={`text-[11px] font-semibold ${day.restDay ? 'text-muted-foreground' : 'text-white'}`}>
                    {day.dayLabel}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${day.restDay ? 'text-muted-foreground/60' : 'text-white'}`}>
                    {day.restDay ? '—' : `${day.rate}%`}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${day.restDay ? 'text-muted-foreground/50' : 'text-white/70'}`}>
                    {day.dateLabel}
                  </p>

                  {/* Mini breakdown bar */}
                  {!day.restDay && day.total > 0 && (
                    <div className="flex gap-px mt-2 rounded-full overflow-hidden h-1.5">
                      {day.present > 0 && (
                        <div
                          className="bg-white/40"
                          style={{ width: `${(day.present / day.total) * 100}%` }}
                        />
                      )}
                      {day.late > 0 && (
                        <div
                          className="bg-white/20"
                          style={{ width: `${(day.late / day.total) * 100}%` }}
                        />
                      )}
                      {day.absent > 0 && (
                        <div
                          className="bg-black/20"
                          style={{ width: `${(day.absent / day.total) * 100}%` }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Hover tooltip */}
                {!day.restDay && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block">
                    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg whitespace-nowrap">
                      <p className="font-medium">{day.present} {t('heatmapPresent')} · {day.late} {t('heatmapLate')} · {day.absent} {t('heatmapAbsent')}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Week summary */}
          {workingDays.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 25 }}
              className="rounded-xl bg-muted/40 dark:bg-muted/20 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.present }} />
                    <span className="text-xs text-muted-foreground">{totalPresent} {tStatus('present').toLowerCase()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.late }} />
                    <span className="text-xs text-muted-foreground">{totalLate} {tStatus('late').toLowerCase()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.absent }} />
                    <span className="text-xs text-muted-foreground">{totalAbsent} {tStatus('absent').toLowerCase()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {trendDiff > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  ) : trendDiff < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={`text-xs font-semibold ${trendDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : trendDiff < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                    {t('weekAvg')} {avgRate}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </DashboardSection>
  );
}
