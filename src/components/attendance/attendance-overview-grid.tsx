'use client';

import { format, parseISO, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plane,
  Star,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { UserAvatar } from '@/components/shared/user-avatar';
import type { AttendanceGridUser } from '@/types';

interface AttendanceOverviewGridProps {
  users: AttendanceGridUser[];
  allDates: string[];
  currentMonth: string;
  loading: boolean;
  onUserClick?: (uid: string, name: string) => void;
}

// ─── Status icon mapping ────────────────────────────────────────────────────

const STATUS_ICON_MAP: Record<string, {
  icon: typeof CheckCircle2;
  className: string;
}> = {
  present: { icon: CheckCircle2, className: 'text-emerald-500' },
  late: { icon: AlertCircle, className: 'text-amber-500' },
  absent: { icon: XCircle, className: 'text-red-500' },
  leave: { icon: Plane, className: 'text-blue-500' },
  holiday: { icon: Star, className: 'text-pink-500' },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function OverviewCell({
  data,
  dateStr,
  isInMonth,
}: {
  data: { clockIn?: string; clockOut?: string | null; status: string; workHours?: string | null } | null;
  dateStr: string;
  isInMonth: boolean;
}) {
  const { t } = useTranslation('attendance');

  if (!isInMonth) {
    return <div className="h-7 w-full" />;
  }

  if (!data || data.status === 'future') {
    return <div className="h-7 w-full" />;
  }

  const status = data.status;

  if (status === 'rest_day') {
    return (
      <div className="flex h-7 items-center justify-center">
        <span className="text-[9px] font-medium text-muted-foreground/60">{t('off')}</span>
      </div>
    );
  }

  const config = STATUS_ICON_MAP[status];
  if (!config) {
    return <div className="h-7 w-full" />;
  }

  const Icon = config.icon;
  const statusKey = status as keyof typeof STATUS_ICON_MAP;
  const tooltipLabel = t(statusKey === 'present' ? 'present' : statusKey === 'late' ? 'late' : statusKey === 'absent' ? 'absent' : statusKey === 'leave' ? 'leave' : statusKey === 'holiday' ? 'holiday' : 'overtime');

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex h-7 items-center justify-center cursor-default">
            <Icon className={`h-4 w-4 ${config.className}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{tooltipLabel}</p>
          {data.clockIn && (
            <p className="text-muted-foreground">
              {data.clockIn}{data.clockOut ? ` → ${data.clockOut}` : ''}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SkeletonOverview({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          <td className="sticky left-0 z-10 bg-background/95 border-r border-border/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-3.5 w-24 mb-1" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          </td>
          {Array.from({ length: Math.min(cols, 31) }).map((_, j) => (
            <td key={j} className="px-0.5 py-1">
              <Skeleton className="h-5 w-5 rounded-full mx-auto" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function AttendanceOverviewGrid({
  users,
  allDates,
  currentMonth,
  loading,
  onUserClick,
}: AttendanceOverviewGridProps) {
  const { t } = useTranslation('attendance');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 25 }}
      className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-auto shadow-sm"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="sticky left-0 z-20 bg-muted/50 backdrop-blur-sm border-r border-border/50 px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[180px]">
              {t('employee')}
            </th>
            {allDates.map((d) => {
              const parsed = parseISO(d);
              const isInMonth = d.substring(0, 7) === currentMonth;
              const isTodayDate = isToday(parsed);
              return (
                <th
                  key={d}
                  className={`px-0.5 py-2 text-center font-medium min-w-[32px] transition-opacity ${
                    !isInMonth ? 'opacity-20' : ''
                  }`}
                >
                  <div
                    className={`text-[11px] tabular-nums ${
                      isTodayDate
                        ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto font-bold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {format(parsed, 'd')}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="wait">
            {loading ? (
              <SkeletonOverview cols={allDates.length} />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={allDates.length + 1}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-muted-foreground"
                  >
                    <div className="text-4xl mb-3">&#128203;</div>
                    <p className="text-sm font-medium">{t('noData')}</p>
                    <p className="text-xs mt-1">{t('noDataHint')}</p>
                  </motion.div>
                </td>
              </tr>
            ) : (
              users.map((user, rowIndex) => (
                <motion.tr
                  key={user.uid}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: rowIndex * 0.03,
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                  }}
                  className="border-b border-border/40 group/row transition-colors hover:bg-muted/30"
                >
                  <td className="sticky left-0 z-10 bg-background/95 group-hover/row:bg-muted/30 backdrop-blur-sm border-r border-border/50 px-3 py-1.5 transition-colors">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left group/btn w-full cursor-pointer rounded-lg px-1.5 py-1 -mx-1.5 -my-1 hover:bg-primary/5 transition-colors"
                      onClick={() => onUserClick?.(user.uid, user.name)}
                    >
                      <UserAvatar name={user.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs truncate group-hover/btn:text-primary transition-colors">
                          {user.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {user.uid}
                        </div>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/0 group-hover/btn:text-primary transition-all shrink-0" />
                    </button>
                  </td>
                  {allDates.map((d) => {
                    const isInMonth = d.substring(0, 7) === currentMonth;
                    return (
                      <td key={d} className="px-0.5 py-0.5">
                        <OverviewCell
                          data={user.days[d] ?? null}
                          dateStr={d}
                          isInMonth={isInMonth}
                        />
                      </td>
                    );
                  })}
                </motion.tr>
              ))
            )}
          </AnimatePresence>
        </tbody>
      </table>
    </motion.div>
  );
}
