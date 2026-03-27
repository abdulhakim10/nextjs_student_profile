'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Building2,
  Download,
  FileBarChart,
  Loader2,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  BarChart3,
  Users,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { attendanceService } from '@/services/attendance.service';
import { useTranslation } from '@/i18n';
import type { AttendanceReportData } from '@/types';

/* ------------------------------------------------------------------ */
/*  Circular Progress Ring                                             */
/* ------------------------------------------------------------------ */
function CircularProgress({ value, size = 100, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/40"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Card Config                                                */
/* ------------------------------------------------------------------ */
const STAT_CARDS = [
  {
    key: 'rate',
    titleKey: 'avgAttendanceRate' as const,
    icon: TrendingUp,
    lightBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    borderAccent: 'hover:border-indigo-200 dark:hover:border-indigo-800',
    valueColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'present',
    titleKey: 'totalPresent' as const,
    icon: UserCheck,
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderAccent: 'hover:border-emerald-200 dark:hover:border-emerald-800',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'absent',
    titleKey: 'totalAbsent' as const,
    icon: UserX,
    lightBg: 'bg-red-50 dark:bg-red-950/50',
    iconColor: 'text-red-600 dark:text-red-400',
    borderAccent: 'hover:border-red-200 dark:hover:border-red-800',
    valueColor: 'text-red-600 dark:text-red-400',
  },
  {
    key: 'late',
    titleKey: 'totalLate' as const,
    icon: Clock,
    lightBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderAccent: 'hover:border-amber-200 dark:hover:border-amber-800',
    valueColor: 'text-amber-600 dark:text-amber-400',
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ReportsPage() {
  const { branches, selectedSid, setSelectedSid, loadingBranches } = useBranchSelector();
  const { t, locale } = useTranslation('attendance');

  const dateLocale = locale === 'ms' ? 'ms-MY' : 'en-GB';

  const [reportType, setReportType] = useState('weekly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [report, setReport] = useState<AttendanceReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const computeDateRange = useCallback((type: string) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    if (type === 'daily') {
      const d = fmt(today);
      return { from: d, to: d };
    }
    if (type === 'weekly') {
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - ((day + 6) % 7));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: fmt(mon), to: fmt(sun) };
    }
    if (type === 'monthly') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: fmt(first), to: fmt(last) };
    }
    if (type === 'yearly') {
      const first = new Date(today.getFullYear(), 0, 1);
      const last = new Date(today.getFullYear(), 11, 31);
      return { from: fmt(first), to: fmt(last) };
    }
    return null;
  }, []);

  const handleReportTypeChange = useCallback((type: string) => {
    setReportType(type);
    const range = computeDateRange(type);
    if (range) {
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [computeDateRange]);

  useEffect(() => {
    const range = computeDateRange(reportType);
    if (range) {
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedSid) {
      toast.error(t('selectBranchFirst'));
      return;
    }
    if (!dateFrom || !dateTo) {
      toast.error(t('selectDateRange'));
      return;
    }
    setLoading(true);
    setGenerated(true);
    try {
      const response = await attendanceService.getReport({
        sid: selectedSid,
        report_type: reportType,
        start_date: dateFrom,
        end_date: dateTo,
      });
      if (response.success && response.data) {
        setReport(response.data);
      } else {
        setReport(null);
        toast.error(t('failedGenerateReport'));
      }
    } catch (err: unknown) {
      setReport(null);
      const axiosErr = err as { response?: { data?: { message?: string; errors?: { message?: string }[] } } };
      const msg = axiosErr?.response?.data?.errors?.[0]?.message
        || axiosErr?.response?.data?.message
        || t('failedGenerateReport');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedSid, reportType, dateFrom, dateTo, t]);

  // Compute summary
  const summary = report
    ? {
        totalPresent: report.dailyBreakdown.reduce((sum, d) => sum + d.present, 0),
        totalAbsent: report.dailyBreakdown.reduce((sum, d) => sum + d.absent, 0),
        totalLate: report.dailyBreakdown.reduce((sum, d) => sum + d.late, 0),
      }
    : null;

  const avgRate = summary
    ? summary.totalPresent + summary.totalAbsent + summary.totalLate > 0
      ? ((summary.totalPresent / (summary.totalPresent + summary.totalAbsent + summary.totalLate)) * 100).toFixed(1)
      : '0.0'
    : null;

  const total = summary ? summary.totalPresent + summary.totalAbsent + summary.totalLate : 0;

  // Chart data
  const chartData = useMemo(() =>
    report?.dailyBreakdown.map((d) => {
      const dt = new Date(d.date);
      return {
        ...d,
        label: dt.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }),
        fullDate: dt.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }),
      };
    }) ?? [],
  [report, dateLocale]);

  // Peak day
  const peakDay = useMemo(() => {
    if (!chartData.length) return null;
    let best = chartData[0];
    for (const d of chartData) {
      if (d.present > best.present) best = d;
    }
    return best;
  }, [chartData]);

  const statValues: Record<string, string> = summary ? {
    rate: `${avgRate}%`,
    present: String(summary.totalPresent),
    absent: String(summary.totalAbsent),
    late: String(summary.totalLate),
  } : {};

  /* ── Excel Export ─────────────────────────────────────── */
  const handleExportExcel = () => {
    if (!report) return;
    const branchName = branches.find((b) => b.sid === selectedSid)?.name || 'report';

    const dailyData = report.dailyBreakdown.map((d) => ({
      [t('date')]: d.date, [t('present')]: d.present, [t('late')]: d.late, [t('absent')]: d.absent,
    }));
    const dailySheet = XLSX.utils.json_to_sheet(dailyData);
    dailySheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];

    const deptData = report.departmentBreakdown.map((d) => ({
      [t('department')]: d.department, [t('attendanceRatePercent')]: d.attendanceRate,
      [t('present')]: d.present, [t('absent')]: d.absent,
    }));
    const deptSheet = XLSX.utils.json_to_sheet(deptData);
    deptSheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 10 }];

    const summaryData = [
      { Metric: t('avgAttendanceRate'), Value: `${avgRate}%` },
      { Metric: t('totalPresent'), Value: String(summary!.totalPresent) },
      { Metric: t('totalAbsent'), Value: String(summary!.totalAbsent) },
      { Metric: t('totalLate'), Value: String(summary!.totalLate) },
      { Metric: t('reportType'), Value: reportType },
      { Metric: t('dateRange'), Value: `${dateFrom} to ${dateTo}` },
      { Metric: 'Branch', Value: branchName },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 22 }, { wch: 20 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, t('summarySheet'));
    XLSX.utils.book_append_sheet(workbook, dailySheet, t('dailyBreakdown'));
    XLSX.utils.book_append_sheet(workbook, deptSheet, t('deptBreakdownSheet'));
    XLSX.writeFile(workbook, `attendance-report-${dateFrom}-${dateTo}.xlsx`);
    toast.success(t('exportSuccess'));
  };

  const handleExportPdf = () => { window.print(); };

  /* ── Date display helper ──────────────────────────────── */
  const dateRangeLabel = dateFrom && dateTo
    ? `${new Date(dateFrom).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })} - ${new Date(dateTo).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';

  /* ── Report type display map ──────────────────────────── */
  const reportTypeLabels: Record<string, string> = {
    daily: t('daily'),
    weekly: t('weekly'),
    monthly: t('monthly'),
    yearly: t('yearly'),
    custom: t('custom'),
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('attendanceReports')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('reportsDesc')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!report} onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" />
            {t('excel')}
          </Button>
          <Button variant="outline" size="sm" disabled={!report} onClick={handleExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            {t('pdf')}
          </Button>
        </div>
      </div>

      {/* ── Report Configuration ────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <FileBarChart className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">{t('reportConfig')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Branch</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedSid} onValueChange={setSelectedSid} disabled={loadingBranches}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t('selectBranch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.sid} value={b.sid}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('reportType')}</Label>
              <Select value={reportType} onValueChange={handleReportTypeChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('daily')}</SelectItem>
                  <SelectItem value="weekly">{t('weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('monthly')}</SelectItem>
                  <SelectItem value="yearly">{t('yearly')}</SelectItem>
                  <SelectItem value="custom">{t('custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('from')}</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('to')}</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              {t('generate')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Loading Skeleton ────────────────────────── */}
      {loading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
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
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[350px] w-full rounded-xl" />
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Results ─────────────────────────────────── */}
      {!loading && report && summary && (
        <>
          {/* Report period banner */}
          <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-2.5">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {reportTypeLabels[reportType] || reportType} Report
            </span>
            <span className="text-xs text-muted-foreground">{dateRangeLabel}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              <Users className="inline h-3.5 w-3.5 mr-1" />
              {t('totalRecords').replace('{count}', String(total))}
            </span>
          </div>

          {/* ── Summary Cards ─────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Attendance Rate - Hero card */}
            <Card className={`card-hover overflow-hidden border transition-colors ${STAT_CARDS[0].borderAccent} relative`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t(STAT_CARDS[0].titleKey)}
                    </p>
                    <p className={`text-3xl font-bold mt-1 tracking-tight ${STAT_CARDS[0].valueColor}`}>
                      {avgRate}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Number(avgRate) >= 80 ? t('greatPerformance') : Number(avgRate) >= 60 ? t('needsImprovement') : t('attentionNeeded')}
                    </p>
                  </div>
                  <div className="relative">
                    <CircularProgress value={Number(avgRate)} size={72} strokeWidth={6} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <TrendingUp className={`h-5 w-5 ${STAT_CARDS[0].iconColor}`} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Other stat cards */}
            {STAT_CARDS.slice(1).map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.key}
                  className={`card-hover overflow-hidden border transition-colors ${card.borderAccent}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {t(card.titleKey)}
                        </p>
                        <p className="text-2xl font-bold mt-2 tracking-tight">
                          {statValues[card.key]}
                        </p>
                        {total > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {((Number(statValues[card.key]) / total) * 100).toFixed(0)}% of total
                          </p>
                        )}
                      </div>
                      <div className={`rounded-xl p-2.5 ${card.lightBg}`}>
                        <Icon className={`h-5 w-5 ${card.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Attendance Trend Chart ─────────────────── */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">{t('attendanceTrendChart')}</CardTitle>
              </div>
              {peakDay && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {t('peakDay').replace('{day}', peakDay.label).replace('{count}', String(peakDay.present))}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-2">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rptGradPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="rptGradLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="rptGradAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                    <XAxis
                      dataKey="label"
                      className="text-xs"
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      className="text-xs"
                      axisLine={false}
                      tickLine={false}
                      dx={-8}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#rptGradPresent)"
                      name={t('present')}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fill="url(#rptGradLate)"
                      name={t('late')}
                    />
                    <Area
                      type="monotone"
                      dataKey="absent"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      fill="url(#rptGradAbsent)"
                      name={t('absent')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
                  {t('noTrendData')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Department Breakdown ───────────────────── */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">{t('deptBreakdown')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {report.departmentBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {report.departmentBreakdown
                    .sort((a, b) => b.attendanceRate - a.attendanceRate)
                    .map((dept, idx) => {
                      const rate = dept.attendanceRate;
                      const barColor = rate >= 80
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : rate >= 60
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-red-500 dark:bg-red-400';
                      const badgeColor = rate >= 80
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
                        : rate >= 60
                          ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50'
                          : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50';
                      return (
                        <div key={dept.department} className="group rounded-lg border p-4 transition-colors hover:bg-muted/30">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-sm">{dept.department}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  {dept.present}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                  {dept.absent}
                                </span>
                              </div>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
                                {rate}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{
                                width: `${rate}%`,
                                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  {t('noDeptData')}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Empty State ─────────────────────────────── */}
      {!loading && generated && !report && (
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileBarChart className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">{t('noReportDataTitle')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('noReportDataHint')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
