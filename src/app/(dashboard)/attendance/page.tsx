'use client';

import { useEffect, useCallback, useMemo, useState } from 'react';
import {
  Building2, Download, Search, CalendarCheck2,
  ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Zap, Plane, XCircle, Star, UserX,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAttendanceStore } from '@/stores/attendance.store';
import { attendanceService } from '@/services/attendance.service';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { AttendanceGrid } from '@/components/attendance/attendance-grid';
import { AttendanceOverviewGrid } from '@/components/attendance/attendance-overview-grid';
import { PeriodNavigator, getMonthPages } from '@/components/attendance/period-navigator';
import { IndividualReportDialog } from '@/components/attendance/individual-report-dialog';
import { DataPagination } from '@/components/shared/data-pagination';
import { exportToExcel } from '@/lib/export-excel';
import { toast } from '@/lib/toast';
import { useDebounce } from '@/hooks/use-debounce';
import { useTranslation } from '@/i18n';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type ViewMode = 'week' | 'month';

const EXPORT_COLUMNS = [
  { header: 'Date', key: 'date', width: 12 },
  { header: 'Name', key: 'name', width: 20 },
  { header: 'UID', key: 'uid', width: 15 },
  { header: 'Clock In', key: 'clockInTime', width: 10 },
  { header: 'Clock Out', key: 'clockOutTime', width: 10 },
  { header: 'Work Hours', key: 'workHours', width: 10 },
  { header: 'Status', key: 'status', width: 10 },
] as const;

const LEGEND_ITEMS = [
  { key: 'present', icon: CheckCircle2, color: 'text-emerald-500' },
  { key: 'late', icon: AlertCircle, color: 'text-amber-500' },
  { key: 'overtime', icon: Zap, color: 'text-purple-500' },
  { key: 'leave', icon: Plane, color: 'text-blue-500' },
  { key: 'absent', icon: XCircle, color: 'text-red-500' },
  { key: 'holiday', icon: Star, color: 'text-pink-500' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as { response?: { data?: { message?: string; errors?: { message?: string }[] } } };
  return (
    axiosErr?.response?.data?.errors?.[0]?.message
    || axiosErr?.response?.data?.message
    || fallback
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { t } = useTranslation('attendance');

  // ── Branch selection ─────────────────────────────────────────────────────
  const { branches, selectedSid, setSelectedSid, loadingBranches } = useBranchSelector();

  // ── Store bindings ───────────────────────────────────────────────────────
  const {
    filters, pagination, currentPage, isLoading,
    selectedDate, pageIndex, gridUsers,
    setFilters, setPagination, setPage, setLoading,
    setSelectedDate, setPageIndex, setGridUsers, setGridDates,
  } = useAttendanceStore();

  // ── Local state ────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportUser, setReportUser] = useState<{ uid: string; name: string }>({ uid: '', name: '' });
  const [hideUnassigned, setHideUnassigned] = useState(true);

  const handleUserClick = (uid: string, name: string) => {
    setReportUser({ uid, name });
    setReportOpen(true);
  };

  // ── Filter unassigned users ─────────────────────────────────────────────
  const filteredGridUsers = useMemo(() => {
    if (!hideUnassigned) return gridUsers;
    return gridUsers.filter((u) => u.groupCode);
  }, [gridUsers, hideUnassigned]);

  const unassignedCount = useMemo(
    () => gridUsers.filter((u) => !u.groupCode).length,
    [gridUsers]
  );

  // ── Derived state ────────────────────────────────────────────────────────
  const debouncedSearch = useDebounce(filters.search || '', 300);
  const monthInfo = useMemo(() => getMonthPages(selectedDate), [selectedDate]);
  const currentMonth = selectedDate.substring(0, 7);
  const monthLabel = useMemo(() => format(parseISO(selectedDate), 'MMMM yyyy'), [selectedDate]);

  // Week view: page navigation
  const pageIdx = Math.min(pageIndex, monthInfo.pages.length - 1);
  const displayDates = monthInfo.pages[pageIdx]?.dates ?? [];
  const isFirstPage = pageIdx <= 0;
  const isLastPage = pageIdx >= monthInfo.pages.length - 1;

  // Week range label (e.g. "01 Feb — 08 Feb, 2026")
  const weekRangeLabel = useMemo(() => {
    if (displayDates.length === 0) return '';
    const first = parseISO(displayDates[0]);
    const last = parseISO(displayDates[displayDates.length - 1]);
    return `${format(first, 'dd MMM')} — ${format(last, 'dd MMM, yyyy')}`;
  }, [displayDates]);

  // ── Side effects ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedSid) {
      setFilters({ sid: selectedSid });
    }
  }, [selectedSid, setFilters]);

  useEffect(() => {
    setPageIndex(monthInfo.todayPageIndex);
  }, [currentMonth, monthInfo.todayPageIndex, setPageIndex]);

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!filters.sid) return;
    setLoading(true);
    try {
      const response = await attendanceService.getGrid({
        sid: filters.sid,
        start_date: monthInfo.apiStart,
        end_date: monthInfo.apiEnd,
        search: debouncedSearch,
        page: currentPage,
        limit: PAGE_SIZE,
      });
      if (response.success && response.data) {
        setGridUsers(response.data.users ?? []);
        setGridDates(response.data.dates ?? []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setGridUsers([]);
        setGridDates([]);
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, t('failedLoadGrid')));
      setGridUsers([]);
      setGridDates([]);
    } finally {
      setLoading(false);
    }
  }, [filters.sid, monthInfo.apiStart, monthInfo.apiEnd, debouncedSearch, currentPage, setGridUsers, setGridDates, setPagination, setLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows: Record<string, string>[] = [];
    for (const user of filteredGridUsers) {
      for (const date of monthInfo.allDates) {
        const day = user.days[date];
        rows.push({
          date,
          name: user.name,
          uid: user.uid,
          clockInTime: day?.clockIn || '',
          clockOutTime: day?.clockOut || '',
          workHours: day?.workHours || '',
          status: day?.status === 'rest_day' ? t('restDay') : day?.status === 'future' ? '' : day?.status || 'absent',
        });
      }
    }
    exportToExcel(rows, [...EXPORT_COLUMNS], `attendance-${monthInfo.apiStart}`);
    toast.success(t('exportSuccess'));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ── Row 1: Title + View Toggle + Month Navigator ── */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{t('title')}</h1>
        </div>

        {/* Week / Month Toggle */}
        <div className="flex rounded-lg border bg-muted/50 p-0.5">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'week'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('week')}
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'month'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('month')}
          </button>
        </div>

        {/* Month Navigator */}
        <PeriodNavigator
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </div>

      {/* ── Row 2: Controls Bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Branch selector */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedSid} onValueChange={setSelectedSid} disabled={loadingBranches}>
            <SelectTrigger className="w-[180px] h-9 rounded-lg">
              <SelectValue placeholder={t('selectBranch')} />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.sid} value={b.sid}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Week range navigator (only in week mode) */}
        {viewMode === 'week' && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              disabled={isFirstPage}
              onClick={() => setPageIndex(pageIdx - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-background text-sm font-medium min-w-[200px] justify-center">
              <CalendarCheck2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{weekRangeLabel}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              disabled={isLastPage}
              onClick={() => setPageIndex(pageIdx + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Search + Unassigned Toggle + Export (right side) */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchEmployee')}
              className="pl-9 w-[200px] h-9 rounded-lg"
              value={filters.search || ''}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
          {unassignedCount > 0 && (
            <Button
              variant={hideUnassigned ? 'outline' : 'secondary'}
              size="sm"
              onClick={() => setHideUnassigned((v) => !v)}
              className="h-9 gap-1.5"
            >
              <UserX className="h-3.5 w-3.5" />
              <span>{unassignedCount} {t('unassigned')}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={filteredGridUsers.length === 0}
            onClick={handleExport}
            className="h-9"
          >
            <Download className="h-4 w-4 mr-1.5" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* ── Section Title + Legend ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {viewMode === 'week'
              ? t('detailedMatrix')
              : t('monthlyOverview').replace('{month}', monthLabel)
            }
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-1.5">
          {LEGEND_ITEMS.map(({ key, icon: Icon, color }) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              {t(key)}
            </span>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      {viewMode === 'week' ? (
        <AttendanceGrid
          users={filteredGridUsers}
          displayDates={displayDates}
          currentMonth={currentMonth}
          loading={isLoading}
          onUserClick={handleUserClick}
        />
      ) : (
        <AttendanceOverviewGrid
          users={filteredGridUsers}
          allDates={monthInfo.allDates}
          currentMonth={currentMonth}
          loading={isLoading}
          onUserClick={handleUserClick}
        />
      )}

      {/* ── Pagination ── */}
      <DataPagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalCount}
        pageSize={pagination.limit}
        onPageChange={setPage}
      />

      {/* ── Individual Report Dialog ── */}
      <IndividualReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        uid={reportUser.uid}
        name={reportUser.name}
        sid={filters.sid || ''}
        selectedDate={selectedDate}
      />
    </motion.div>
  );
}
