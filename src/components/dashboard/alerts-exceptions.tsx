'use client';

import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, UserX, Clock, ShieldAlert, CheckCircle2, Flame, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listItemTransition, DashboardSection, DashboardEmptyState } from '@/components/dashboard/motion-wrapper';
import { attendanceService } from '@/services/attendance.service';
import { useTranslation } from '@/i18n';
import { toISODate } from '@/lib/date-utils';
import type { AttendanceRecord } from '@/types';

interface AlertItem {
  id: string;
  type: 'absent' | 'late_today' | 'repeat_late';
  title: string;
  preview: string;
  names: string[];
  count: number;
}

interface AlertsExceptionsProps {
  selectedSid: string;
}

const ALERT_CONFIG = {
  absent: {
    icon: UserX,
    gradient: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/20',
    bg: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/30',
    border: 'border-red-200/80 dark:border-red-800/50',
    badge: 'bg-red-500',
    iconBg: 'bg-red-500',
  },
  late_today: {
    icon: Clock,
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20',
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30',
    border: 'border-amber-200/80 dark:border-amber-800/50',
    badge: 'bg-amber-500',
    iconBg: 'bg-amber-500',
  },
  repeat_late: {
    icon: ShieldAlert,
    gradient: 'from-orange-500 to-red-500',
    glow: 'shadow-orange-500/20',
    bg: 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/40 dark:to-red-950/30',
    border: 'border-orange-200/80 dark:border-orange-800/50',
    badge: 'bg-gradient-to-r from-orange-500 to-red-500',
    iconBg: 'bg-orange-500',
  },
} as const;

const PREVIEW_MAX = 3;

function buildAlerts(
  todayRecords: AttendanceRecord[],
  recentRecords: AttendanceRecord[],
  t: (key: string) => string,
): AlertItem[] {
  const alerts: AlertItem[] = [];

  const absent = todayRecords.filter((r) => r.status?.toLowerCase() === 'absent');
  if (absent.length > 0) {
    const names = absent.map((r) => r.name);
    alerts.push({
      id: 'absent',
      type: 'absent',
      title: `${absent.length} ${t('staffAbsent')}`,
      preview: names.slice(0, PREVIEW_MAX).join(', ') + (names.length > PREVIEW_MAX ? ` +${names.length - PREVIEW_MAX}` : ''),
      names,
      count: absent.length,
    });
  }

  const lateToday = todayRecords.filter((r) => r.status?.toLowerCase() === 'late');
  if (lateToday.length > 0) {
    const names = lateToday.map((r) => r.name);
    alerts.push({
      id: 'late_today',
      type: 'late_today',
      title: `${lateToday.length} ${t('staffLateToday')}`,
      preview: names.slice(0, PREVIEW_MAX).join(', ') + (names.length > PREVIEW_MAX ? ` +${names.length - PREVIEW_MAX}` : ''),
      names,
      count: lateToday.length,
    });
  }

  const grouped = new Map<string, AttendanceRecord[]>();
  for (const r of recentRecords) {
    const existing = grouped.get(r.uid) || [];
    existing.push(r);
    grouped.set(r.uid, existing);
  }

  const repeatLateUsers: { name: string; count: number }[] = [];
  for (const [, records] of grouped) {
    const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
    let consecutive = 0;
    for (const r of sorted) {
      if (r.status?.toLowerCase() === 'late') consecutive++;
      else break;
    }
    if (consecutive >= 3) {
      repeatLateUsers.push({ name: sorted[0].name, count: consecutive });
    }
  }

  if (repeatLateUsers.length > 0) {
    const names = repeatLateUsers.map((u) => `${u.name} (${u.count}d)`);
    alerts.push({
      id: 'repeat_late',
      type: 'repeat_late',
      title: `${repeatLateUsers.length} ${t('repeatLate')}`,
      preview: names.slice(0, PREVIEW_MAX).join(', ') + (names.length > PREVIEW_MAX ? ` +${names.length - PREVIEW_MAX}` : ''),
      names,
      count: repeatLateUsers.length,
    });
  }

  return alerts;
}

export function AlertsExceptions({ selectedSid }: AlertsExceptionsProps) {
  const { t } = useTranslation('dashboard');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedSid) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const today = toISODate();
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 4);

      const [todayRes, recentRes] = await Promise.all([
        attendanceService.getList({ sid: selectedSid, start_date: today, end_date: today }, 1, 100),
        attendanceService.getList({ sid: selectedSid, start_date: toISODate(fiveDaysAgo), end_date: today }, 1, 100),
      ]);

      const todayRecords = todayRes.success && todayRes.data?.list ? todayRes.data.list : [];
      const recentRecords = recentRes.success && recentRes.data?.list ? recentRes.data.list : [];

      setAlerts(buildAlerts(todayRecords, recentRecords, t));
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSid, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const countBadge = alerts.length > 0 ? (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1.5"
    >
      {alerts.length}
    </motion.span>
  ) : undefined;

  return (
    <DashboardSection
      icon={Flame}
      iconBg="bg-red-100 dark:bg-red-900/40"
      iconColor="text-red-600 dark:text-red-400"
      title={t('alertsExceptions')}
      action={countBadge}
      delay={0.15}
    >
      {!selectedSid ? (
        <DashboardEmptyState
          icon={AlertTriangle}
          title={t('selectBranchAlerts')}
          iconClassName="bg-muted"
        />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <DashboardEmptyState
          icon={CheckCircle2}
          title={t('noExceptions')}
          description={t('allGoodToday')}
          iconClassName="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500"
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const config = ALERT_CONFIG[alert.type];
            const Icon = config.icon;
            const isExpanded = expandedId === alert.id;
            const hasMore = alert.names.length > PREVIEW_MAX;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={listItemTransition(index)}
                onClick={() => hasMore && toggleExpand(alert.id)}
                className={`group relative rounded-2xl border ${config.border} ${config.bg} p-3.5 transition-all duration-300 hover:shadow-lg ${config.glow} hover:scale-[1.01] ${hasMore ? 'cursor-pointer' : 'cursor-default'} overflow-hidden`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b ${config.gradient}`} />

                <div className="flex items-center gap-3 pl-2">
                  <motion.div
                    initial={{ rotate: -10 }}
                    animate={{ rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.iconBg} shadow-sm`}
                  >
                    <Icon className="h-4.5 w-4.5 text-white" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.preview}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={listItemTransition(index, 0.15)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-xl ${config.badge} text-xs font-bold text-white shadow-sm px-2`}
                    >
                      {alert.count}
                    </motion.div>
                    {hasMore && (
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Expanded name list */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-14 pr-2 pt-2 pb-1">
                        <div className="flex flex-wrap gap-1.5">
                          {alert.names.map((name, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-md bg-background/60 px-2 py-0.5 text-[11px] font-medium border border-border/50"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardSection>
  );
}
