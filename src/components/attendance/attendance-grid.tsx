'use client';

import { useState } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import { ATTENDANCE_GRID_CELL_COLORS } from '@/config/constants';
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

interface AttendanceGridProps {
  users: AttendanceGridUser[];
  displayDates: string[];
  currentMonth: string;
  loading: boolean;
  onUserClick?: (uid: string, name: string) => void;
}

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  icon: typeof CheckCircle2;
  emoji: string;
  labelKey: string;
}> = {
  present: { icon: CheckCircle2, emoji: '\u2713', labelKey: 'present' },
  late: { icon: AlertCircle, emoji: '!', labelKey: 'late' },
  absent: { icon: XCircle, emoji: '\u2715', labelKey: 'absent' },
  leave: { icon: Plane, emoji: '\u25CB', labelKey: 'leave' },
  holiday: { icon: Star, emoji: '\u2606', labelKey: 'holiday' },
  rest_day: { icon: Star, emoji: '-', labelKey: 'restDay' },
  future: { icon: Star, emoji: '', labelKey: '' },
};

// ─── Tooltip ────────────────────────────────────────────────────────────────

function CellTooltip({
  data,
  dateStr,
  statusLabel,
}: {
  data: { clockIn?: string; clockOut?: string | null; status: string; workHours?: string | null } | null;
  dateStr: string;
  statusLabel: string;
}) {
  const parsed = parseISO(dateStr);
  const status = data?.status || 'absent';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
    >
      <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-xs min-w-[140px]">
        <div className="font-semibold text-foreground mb-1">{format(parsed, 'EEEE, d MMM')}</div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`h-2 w-2 rounded-full ${
            status === 'present' ? 'bg-emerald-500' :
            status === 'late' ? 'bg-amber-500' :
            status === 'absent' ? 'bg-red-500' :
            status === 'leave' ? 'bg-violet-500' :
            status === 'rest_day' ? 'bg-blue-500' : 'bg-slate-400'
          }`} />
          <span className="font-medium">{statusLabel}</span>
        </div>
        {data?.clockIn && (
          <div className="space-y-0.5 text-muted-foreground">
            <div>In: <span className="text-foreground font-mono">{data.clockIn}</span></div>
            <div>Out: <span className="text-foreground font-mono">{data.clockOut || '--:--'}</span></div>
            {data.workHours && <div>Hours: <span className="text-foreground font-mono">{data.workHours}</span></div>}
          </div>
        )}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
          <div className="w-2 h-2 bg-popover border-r border-b border-border rotate-45 -translate-y-1" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Grid cell ──────────────────────────────────────────────────────────────

function GridCell({
  data,
  isInMonth,
  colIndex,
  rowIndex,
  dateStr,
}: {
  data: { clockIn?: string; clockOut?: string | null; status: string; workHours?: string | null } | null;
  isInMonth: boolean;
  colIndex: number;
  rowIndex: number;
  dateStr: string;
}) {
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation('attendance');

  if (!isInMonth) {
    return <div className="h-[64px] rounded-lg bg-muted/20 border border-transparent" />;
  }

  if (!data || data.status === 'future') {
    return <div className="h-[64px] rounded-lg bg-muted/10 border border-transparent" />;
  }

  const status = data.status;
  const colorClass = ATTENDANCE_GRID_CELL_COLORS[status] || ATTENDANCE_GRID_CELL_COLORS.present;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.present;
  const statusLabel = config.labelKey ? t(config.labelKey) : status;
  const hasClockData = !!data.clockIn;

  // Rest day — plain text
  if (status === 'rest_day') {
    return (
      <div className="flex items-center justify-center h-[64px]">
        <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wide">
          {t('offDay')}
        </span>
      </div>
    );
  }

  // Status-only cells (absent, leave, holiday) — centered badge
  if (!hasClockData) {
    const Icon = config.icon;
    return (
      <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <AnimatePresence>{hovered && <CellTooltip data={data} dateStr={dateStr} statusLabel={statusLabel} />}</AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: rowIndex * 0.03 + colIndex * 0.02, duration: 0.3 }}
          whileHover={{ scale: 1.04, y: -1 }}
          className={`flex flex-col items-center justify-center h-[64px] rounded-xl border text-xs gap-1 cursor-default transition-shadow hover:shadow-md ${colorClass}`}
        >
          <Icon className="h-4 w-4 opacity-80" />
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
            {statusLabel}
          </span>
        </motion.div>
      </div>
    );
  }

  // Clock data cells (present, late) — time card
  const Icon = config.icon;
  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <AnimatePresence>{hovered && <CellTooltip data={data} dateStr={dateStr} statusLabel={statusLabel} />}</AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: rowIndex * 0.03 + colIndex * 0.02, duration: 0.3 }}
        whileHover={{ scale: 1.04, y: -1 }}
        className={`relative flex flex-col items-center justify-center h-[64px] rounded-xl border text-xs cursor-default transition-shadow hover:shadow-md ${colorClass}`}
      >
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3 opacity-80" />
          <span className="font-bold text-[12px] tabular-nums">{data.clockIn}</span>
        </div>
        <span className="text-[10px] tabular-nums opacity-60 mt-0.5">
          {t('out').replace('{time}', data.clockOut || '--:--')}
        </span>
      </motion.div>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonGrid({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.tr
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="border-b border-border/50"
        >
          <td className="sticky left-0 z-10 bg-background/95 backdrop-blur-sm border-r border-border/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-28 mb-1.5" />
                <Skeleton className="h-3 w-18" />
              </div>
            </div>
          </td>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-1.5 py-1.5">
              <Skeleton className="h-[64px] w-full rounded-xl" />
            </td>
          ))}
        </motion.tr>
      ))}
    </>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function AttendanceGrid({ users, displayDates, currentMonth, loading, onUserClick }: AttendanceGridProps) {
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
            <th className="sticky left-0 z-20 bg-muted/50 backdrop-blur-sm border-r border-border/50 px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[220px]">
              {t('employeeProfile')}
            </th>
            {displayDates.map((d) => {
              const parsed = parseISO(d);
              const isInMonth = d.substring(0, 7) === currentMonth;
              const isTodayDate = isToday(parsed);
              return (
                <th
                  key={d}
                  className={`px-1.5 py-2.5 text-center font-medium min-w-[90px] transition-opacity ${
                    !isInMonth ? 'opacity-20' : ''
                  }`}
                >
                  <div className={`text-[10px] uppercase tracking-wider ${isTodayDate ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {format(parsed, 'EEE')}
                  </div>
                  <div
                    className={`text-sm mt-0.5 font-bold ${
                      isTodayDate
                        ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto'
                        : ''
                    }`}
                  >
                    {format(parsed, 'dd')}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="wait">
            {loading ? (
              <SkeletonGrid cols={displayDates.length || 7} />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={(displayDates.length || 7) + 1}>
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: rowIndex * 0.04,
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                  }}
                  className="border-b border-border/40 group/row transition-colors hover:bg-muted/30"
                >
                  <td className="sticky left-0 z-10 bg-background/95 group-hover/row:bg-muted/30 backdrop-blur-sm border-r border-border/50 px-4 py-2.5 transition-colors">
                    <motion.button
                      type="button"
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 text-left group/btn w-full cursor-pointer rounded-lg px-2 py-1.5 -mx-2 -my-1.5 hover:bg-primary/5 transition-colors"
                      onClick={() => onUserClick?.(user.uid, user.name)}
                    >
                      <UserAvatar name={user.name} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate group-hover/btn:text-primary transition-colors">{user.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{user.uid}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover/btn:text-primary group-hover/btn:translate-x-0.5 transition-all shrink-0" />
                    </motion.button>
                  </td>
                  {displayDates.map((d, colIndex) => {
                    const isInMonth = d.substring(0, 7) === currentMonth;
                    return (
                      <td key={d} className="px-1.5 py-1.5">
                        <GridCell
                          data={user.days[d] ?? null}
                          isInMonth={isInMonth}
                          colIndex={colIndex}
                          rowIndex={rowIndex}
                          dateStr={d}
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
