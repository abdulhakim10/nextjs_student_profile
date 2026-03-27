'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download,
  FileText,
  Clock,
  TrendingUp,
  AlertTriangle,
  CalendarCheck,
  CalendarX,
  Coffee,
  Timer,
  Hourglass,
  X,
  User,
} from 'lucide-react';
import { attendanceService } from '@/services/attendance.service';
import { toast } from '@/lib/toast';
import { format, parseISO } from 'date-fns';
import { exportToExcel } from '@/lib/export-excel';
import { useTranslation } from '@/i18n';
import { UserAvatar } from '@/components/shared/user-avatar';
import type { IndividualReportResponse, IndividualReportDay } from '@/types';

interface IndividualReportDialogProps {
  open: boolean;
  onClose: () => void;
  uid: string;
  name: string;
  sid: string;
  selectedDate: string;
}

const STATUS_STYLE: Record<string, { labelKey: string; color: string; dot: string; bg: string }> = {
  present: { labelKey: 'present', color: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
  late: { labelKey: 'late', color: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-950/20' },
  absent: { labelKey: 'absent', color: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', bg: 'bg-red-50/50 dark:bg-red-950/20' },
  rest_day: { labelKey: 'restDay', color: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400', bg: 'bg-slate-50/50 dark:bg-slate-900/20' },
  leave: { labelKey: 'leave', color: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', bg: 'bg-violet-50/50 dark:bg-violet-950/20' },
  holiday: { labelKey: 'holiday', color: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500', bg: 'bg-sky-50/50 dark:bg-sky-950/20' },
};

function KpiRing({ percent, delay, label }: { percent: number; delay: number; label: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 90 ? 'text-emerald-500' : percent >= 70 ? 'text-amber-500' : 'text-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      className="flex flex-col items-center"
    >
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <motion.circle
            cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="6"
            strokeLinecap="round"
            className={color}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ delay: delay + 0.3, duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums">{percent}</span>
          <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">%</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground mt-1.5">{label}</span>
    </motion.div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  sub,
  color,
  iconBg,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  iconBg: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="flex items-center gap-3 rounded-xl border bg-card/80 p-3.5 transition-shadow hover:shadow-md"
    >
      <div className={`rounded-xl p-2.5 ${iconBg}`}>
        <Icon className={`h-4.5 w-4.5 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold tabular-nums leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function DayRow({ day, index, statusLabel }: { day: IndividualReportDay; index: number; statusLabel: string }) {
  const config = STATUS_STYLE[day.status] || STATUS_STYLE.rest_day;
  const isWorkDay = day.status !== 'rest_day' && day.status !== 'holiday';
  const parsed = parseISO(day.date);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.012, duration: 0.2 }}
      whileHover={isWorkDay ? { backgroundColor: 'rgba(0,0,0,0.02)' } : undefined}
      className={`border-b border-border/30 transition-colors ${
        !isWorkDay ? 'opacity-40' : ''
      }`}
    >
      {/* Date */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-sm font-semibold">{format(parsed, 'd MMM')}</div>
        <div className="text-xs text-muted-foreground">{day.dayName.slice(0, 3)}</div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
          <span className={`h-2 w-2 rounded-full ${config.dot}`} />
          {statusLabel}
        </span>
      </td>

      {/* Clock In / Out */}
      <td className="px-4 py-3">
        {isWorkDay && day.workingTime ? (
          <div className="text-sm tabular-nums font-medium">{day.workingTime}</div>
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )}
      </td>

      {/* Expected */}
      <td className="px-4 py-3">
        {isWorkDay && day.expectedTime ? (
          <div className="text-sm tabular-nums text-muted-foreground">{day.expectedTime}</div>
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )}
      </td>

      {/* Late */}
      <td className="px-4 py-3">
        {day.isLate ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            {day.lateTime}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )}
      </td>

      {/* Short */}
      <td className="px-4 py-3 tabular-nums">
        {day.shortMinutes > 0 ? (
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">{day.shortTime}</span>
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )}
      </td>

      {/* OT */}
      <td className="px-4 py-3 tabular-nums">
        {day.overtimeMinutes > 0 ? (
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{day.overtimeTime}</span>
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )}
      </td>
    </motion.tr>
  );
}

function exportReportExcel(data: IndividualReportResponse, selectedDate: string, t: (key: string) => string) {
  const rows = data.attendanceOfMonth.map((d) => ({
    date: d.date,
    day: d.dayName,
    status: d.status,
    workingTime: d.workingTime,
    expectedTime: d.expectedTime,
    lateTime: d.lateTime,
    shortTime: d.shortTime,
    overtimeTime: d.overtimeTime,
    paidOvertimeTime: d.paidOvertimeTime,
  }));

  exportToExcel(rows, [
    { header: t('date'), key: 'date', width: 12 },
    { header: t('day'), key: 'day', width: 12 },
    { header: t('status'), key: 'status', width: 10 },
    { header: t('working'), key: 'workingTime', width: 10 },
    { header: t('expected'), key: 'expectedTime', width: 10 },
    { header: t('late'), key: 'lateTime', width: 10 },
    { header: t('short'), key: 'shortTime', width: 10 },
    { header: t('overtime'), key: 'overtimeTime', width: 10 },
    { header: t('paidOt'), key: 'paidOvertimeTime', width: 10 },
  ], `report-${data.uid}-${selectedDate.substring(0, 7)}`);
}

async function exportReportPDF(data: IndividualReportResponse, selectedDate: string, t: (key: string) => string, tStatus: (key: string) => string) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });
  const monthLabel = format(parseISO(selectedDate), 'MMMM yyyy');

  doc.setFontSize(16);
  doc.text(`Attendance Report - ${data.name}`, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`UID: ${data.uid}  |  Period: ${monthLabel}`, 14, 26);

  const s = data.attendanceSummary;
  doc.setFontSize(9);
  doc.text(
    `${tStatus('present')}: ${s.presentDays}  |  ${tStatus('late')}: ${s.lateDays}  |  ${tStatus('absent')}: ${s.absentDays}  |  ${tStatus('restDay')}: ${s.restDays}  |  KPI: ${s.kpiPercent}%  |  ${t('working')}: ${s.totalWorkingTime}h  |  ${t('ot')}: ${s.totalOvertimeTime}h`,
    14,
    33
  );

  const statusStyleMap: Record<string, string> = {};
  for (const [key, cfg] of Object.entries(STATUS_STYLE)) {
    statusStyleMap[key] = tStatus(cfg.labelKey);
  }

  const tableRows = data.attendanceOfMonth.map((d) => [
    d.date,
    d.dayName.slice(0, 3),
    statusStyleMap[d.status] || (d.status.charAt(0).toUpperCase() + d.status.slice(1)),
    d.workingTime || '--',
    d.expectedTime || '--',
    d.isLate ? d.lateTime : '--',
    d.shortMinutes > 0 ? d.shortTime : '--',
    d.overtimeMinutes > 0 ? d.overtimeTime : '--',
  ]);

  autoTable(doc, {
    startY: 38,
    head: [[t('date'), t('day'), t('status'), t('working'), t('expected'), tStatus('late'), t('short'), t('ot')]],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`report-${data.uid}-${selectedDate.substring(0, 7)}.pdf`);
}

export function IndividualReportDialog({
  open,
  onClose,
  uid,
  name,
  sid,
  selectedDate,
}: IndividualReportDialogProps) {
  const { t } = useTranslation('attendance');
  const { t: tStatus } = useTranslation('status');
  const [data, setData] = useState<IndividualReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const year = selectedDate.substring(0, 4);
  const month = String(parseInt(selectedDate.substring(5, 7)));

  const fetchReport = useCallback(async () => {
    if (!uid || !sid) {
      setErrorMsg(`Missing params — uid: "${uid}", sid: "${sid}"`);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await attendanceService.getIndividualReport({ uid, sid, year, month });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setErrorMsg(`API returned: success=${res.success}, message="${res.message}"`);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; errors?: { message?: string }[] } } };
      const msg = axiosErr?.response?.data?.errors?.[0]?.message
        || axiosErr?.response?.data?.message
        || 'Failed to load individual report';
      const status = axiosErr?.response?.status || 'unknown';
      setErrorMsg(`HTTP ${status}: ${msg}`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [uid, sid, year, month]);

  useEffect(() => {
    if (open) {
      setData(null);
      fetchReport();
    }
  }, [open, fetchReport]);

  const s = data?.attendanceSummary;
  const kpi = s ? Number(s.kpiPercent) || 0 : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="!max-w-6xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-8 pt-6 pb-5 border-b bg-gradient-to-r from-primary/8 via-primary/3 to-transparent shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <UserAvatar name={name} size="lg" />
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">{name}</DialogTitle>
                <div className="flex items-center gap-3 mt-1">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    {uid}
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="text-sm font-medium text-primary">
                    {format(parseISO(selectedDate), 'MMMM yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!data}
                onClick={() => data && exportReportExcel(data, selectedDate, t)}
                className="h-9 rounded-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('excel')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data}
                onClick={() => data && exportReportPDF(data, selectedDate, t, tStatus)}
                className="h-9 rounded-lg"
              >
                <FileText className="h-4 w-4 mr-2" />
                {t('pdf')}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="px-8 py-6 space-y-6">
              <div className="flex gap-6">
                <Skeleton className="h-28 w-28 rounded-full shrink-0" />
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              </div>
              <Skeleton className="h-80 rounded-xl" />
            </div>
          ) : data && s ? (
            <div className="px-8 py-6 space-y-6">
              {/* Summary Section */}
              <div className="flex gap-6 items-start">
                {/* KPI Ring */}
                <div className="shrink-0 pt-1">
                  <KpiRing percent={kpi} delay={0} label={t('kpiScore')} />
                </div>

                {/* Stat Cards */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                  <StatItem
                    icon={CalendarCheck} label={tStatus('present')} value={s.presentDays}
                    sub={t('onTimeCount').replace('{count}', s.onTimeDays)}
                    color="text-emerald-600 dark:text-emerald-400"
                    iconBg="bg-emerald-100 dark:bg-emerald-950/50"
                    delay={0.05}
                  />
                  <StatItem
                    icon={AlertTriangle} label={tStatus('late')} value={s.lateDays}
                    sub={t('totalHours').replace('{time}', s.totalLateTime)}
                    color="text-amber-600 dark:text-amber-400"
                    iconBg="bg-amber-100 dark:bg-amber-950/50"
                    delay={0.08}
                  />
                  <StatItem
                    icon={CalendarX} label={tStatus('absent')} value={s.absentDays}
                    color="text-red-600 dark:text-red-400"
                    iconBg="bg-red-100 dark:bg-red-950/50"
                    delay={0.11}
                  />
                  <StatItem
                    icon={Coffee} label={tStatus('restDay')} value={s.restDays}
                    color="text-slate-600 dark:text-slate-400"
                    iconBg="bg-slate-100 dark:bg-slate-800/50"
                    delay={0.14}
                  />
                  <StatItem
                    icon={Clock} label={t('workingTime')} value={`${s.totalWorkingTime}h`}
                    color="text-blue-600 dark:text-blue-400"
                    iconBg="bg-blue-100 dark:bg-blue-950/50"
                    delay={0.17}
                  />
                  <StatItem
                    icon={Hourglass} label={t('shortTime')} value={`${s.totalShortTime}h`}
                    color="text-orange-600 dark:text-orange-400"
                    iconBg="bg-orange-100 dark:bg-orange-950/50"
                    delay={0.2}
                  />
                  <StatItem
                    icon={Timer} label={t('overtime')} value={`${s.totalOvertimeTime}h`}
                    color="text-cyan-600 dark:text-cyan-400"
                    iconBg="bg-cyan-100 dark:bg-cyan-950/50"
                    delay={0.23}
                  />
                  <StatItem
                    icon={TrendingUp} label={t('paidOt')} value={`${s.totalPaidOvertimeTime || '0:00'}h`}
                    color="text-indigo-600 dark:text-indigo-400"
                    iconBg="bg-indigo-100 dark:bg-indigo-950/50"
                    delay={0.26}
                  />
                </div>
              </div>

              {/* Daily Table */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 25 }}
                className="rounded-xl border border-border/60 overflow-hidden"
              >
                <div className="overflow-auto max-h-[42vh]">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted/60 backdrop-blur-sm border-b border-border/60">
                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[100px]">{t('date')}</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[120px]">{t('status')}</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[90px]">{t('working')}</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[90px]">{t('expected')}</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[90px]">{tStatus('late')}</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[80px]">{t('short')}</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[80px]">{t('ot')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {data.attendanceOfMonth.map((day, i) => {
                          const cfg = STATUS_STYLE[day.status] || STATUS_STYLE.rest_day;
                          return (
                            <DayRow key={day.date} day={day} index={i} statusLabel={tStatus(cfg.labelKey)} />
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-muted-foreground"
            >
              <div className="text-5xl mb-4">&#128203;</div>
              <p className="text-base font-medium">{t('noReportData')}</p>
              <p className="text-sm mt-1">{t('noReportHint')}</p>
              {errorMsg && (
                <div className="mt-4 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-mono max-w-md text-center">
                  {errorMsg}
                </div>
              )}
              <p className="text-[10px] mt-3 text-muted-foreground/60 font-mono">
                uid: {uid} | sid: {sid} | year: {year} | month: {month}
              </p>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
