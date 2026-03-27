'use client';

import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { listItemTransition, DashboardSection } from '@/components/dashboard/motion-wrapper';
import { computeInsights, type Insight } from '@/lib/dashboard-insights';
import { useTranslation } from '@/i18n';
import { attendanceService } from '@/services/attendance.service';
import type { AttendanceChartData } from '@/types';
import { mapApiToSummary } from '@/lib/dashboard-utils';
import { toISODate } from '@/lib/date-utils';

interface AISmartInsightsProps {
  selectedSid: string;
}

const SEVERITY_STYLES: Record<Insight['severity'], { card: string; hover: string }> = {
  positive: {
    card: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300',
    hover: 'hover:bg-emerald-100/80 dark:hover:bg-emerald-950/70 hover:shadow-emerald-500/10',
  },
  negative: {
    card: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300',
    hover: 'hover:bg-red-100/80 dark:hover:bg-red-950/70 hover:shadow-red-500/10',
  },
  warning: {
    card: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300',
    hover: 'hover:bg-amber-100/80 dark:hover:bg-amber-950/70 hover:shadow-amber-500/10',
  },
  neutral: {
    card: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300',
    hover: 'hover:bg-blue-100/80 dark:hover:bg-blue-950/70 hover:shadow-blue-500/10',
  },
};

export function AISmartInsights({ selectedSid }: AISmartInsightsProps) {
  const { t } = useTranslation('dashboard');
  const { t: tInsight } = useTranslation('insights');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selectedSid) {
      setInsights(computeInsights(null, [], tInsight));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);

      const [summaryRes, trendRes] = await Promise.all([
        attendanceService.getDashboardSummary(selectedSid),
        attendanceService.getReport({
          sid: selectedSid,
          report_type: 'weekly',
          start_date: toISODate(start),
          end_date: toISODate(end),
        }),
      ]);

      const summary = summaryRes.success && summaryRes.data
        ? mapApiToSummary(summaryRes.data)
        : null;
      const trend: AttendanceChartData[] =
        trendRes.success && trendRes.data?.dailyBreakdown
          ? trendRes.data.dailyBreakdown
          : [];

      setInsights(computeInsights(summary, trend, tInsight));
    } catch {
      setInsights(computeInsights(null, [], tInsight));
    } finally {
      setLoading(false);
    }
  }, [selectedSid, tInsight]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const aiBadge = (
    <span className="animate-badge-sparkle text-[10px] font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/40 px-2 py-0.5 rounded-full">
      {t('aiPowered')}
    </span>
  );

  return (
    <DashboardSection
      icon={Sparkles}
      iconBg="bg-cyan-100 dark:bg-cyan-900/40"
      iconColor="text-cyan-600 dark:text-cyan-400"
      title={t('smartInsights')}
      action={aiBadge}
      delay={0.2}
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.map((insight, index) => {
            const styles = SEVERITY_STYLES[insight.severity];
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={listItemTransition(index)}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className={`rounded-xl border p-3 transition-all duration-200 cursor-default hover:shadow-md ${styles.card} ${styles.hover}`}
              >
                <div className="flex items-start gap-2.5">
                  <motion.span
                    className="text-lg leading-none mt-0.5"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={listItemTransition(index, 0.15)}
                  >
                    {insight.icon}
                  </motion.span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{insight.title}</p>
                    <p className="text-xs opacity-80 mt-0.5">{insight.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardSection>
  );
}
