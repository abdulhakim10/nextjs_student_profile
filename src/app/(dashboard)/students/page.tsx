'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { useStudentStore, DEFAULT_STUDENT_STATUS, type StudentSortField } from '@/stores/student.store';
import { studentService } from '@/services/student.service';
import { useTranslation } from '@/i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import { exportToExcel } from '@/lib/export-excel';
import { printTable } from '@/lib/print-table';
import { PageHeader } from '@/components/shared/page-header';
import { BranchPill } from '@/components/shared/branch-pill';
import { DataPagination } from '@/components/shared/data-pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button, ButtonWithTooltip } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StudentDetailDialog } from '@/components/students/student-detail-dialog';
import { StudentFormDialog } from '@/components/students/student-form-dialog';
import {
  displayValue,
  genderCode,
  initials,
  isEmptyDate,
  statusTone,
  STATUS_TONE_CLASS,
} from '@/components/students/student-helpers';
import { useStudentStatuses } from '@/components/students/use-student-statuses';
import { useStudentClasses } from '@/components/students/use-student-classes';
import type { StudentDetail, StudentListItem } from '@/types';
import {
  GraduationCap,
  Plus,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  Printer,
  Eye,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';

const fmtDate = (d: string | null | undefined) => (isEmptyDate(d) ? '-' : formatDate(d as string));

const ALL = 'all';

const SORT_OPTIONS: { field: StudentSortField; labelKey: 'sortId' | 'sortName' }[] = [
  { field: 'id', labelKey: 'sortId' },
  { field: 'name', labelKey: 'sortName' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 500] as const;

/** Delete is hidden for now; flip to true to show the row action again. */
const ENABLE_DELETE = false;

/** Academic year choices: next year back through the last twelve. */
const YEAR_OPTIONS = (() => {
  const next = new Date().getFullYear() + 1;
  return Array.from({ length: 13 }, (_, i) => String(next - i));
})();

export default function StudentsPage() {
  const { t } = useTranslation('students');
  const { t: tCommon } = useTranslation('common');

  const {
    dataset,
    filters,
    sort,
    pagination,
    isLoading,
    selectedUids,
    setDataset,
    setFilters,
    clearFilters,
    setSort,
    setPagination,
    setPage,
    setPageSize,
    setLoading,
    toggleSelected,
    setSelected,
  } = useStudentStore();

  // ── Branch (header pill, shared selector — same as the overview page) ──
  const {
    branches,
    selectedSid,
    setSelectedSid,
    loadingBranches,
    isHQ,
    branchName,
    fetchBranches,
  } = useBranchSelector();

  useEffect(() => {
    if (selectedSid !== filters.branch) setFilters({ branch: selectedSid });
  }, [selectedSid, filters.branch, setFilters]);

  // ── Status lookup for the selected branch ──
  const { statuses, loading: statusesLoading, labelFor } = useStudentStatuses(selectedSid);

  // ── Class options for the selected branch ──
  const { classes, loading: classesLoading } = useStudentClasses(selectedSid);

  // ── Level options ──
  // No lookup API yet, so levels accumulate from rows seen for the current branch.
  const [levelOptions, setLevelOptions] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLevelOptions(new Set());
  }, [selectedSid]);

  useEffect(() => {
    if (dataset.length === 0) return;
    setLevelOptions((prev) => {
      const next = new Set(prev);
      for (const s of dataset) if (s.educationLevel) next.add(s.educationLevel);
      return next.size === prev.size ? prev : next;
    });
  }, [dataset]);

  // ── Search (debounced) ──
  const [searchValue, setSearchValue] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) setFilters({ search: searchValue });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search, setFilters]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== DEFAULT_STUDENT_STATUS ||
    filters.academicYear !== '' ||
    filters.educationClass !== '' ||
    filters.educationLevel !== '';

  // ── Data fetch ──
  const fetchData = useCallback(async () => {
    if (loadingBranches && !filters.branch) return;
    setLoading(true);
    try {
      const res = await studentService.fetchStudents({
        branch: filters.branch,
        search: filters.search,
        educationClass: filters.educationClass,
        status: filters.status,
        academicYear: filters.academicYear,
        educationLevel: filters.educationLevel,
        pageOrder: sort.field,
        pageSort: sort.order,
        pageLimit: pagination.page_size,
        pageStart: pagination.current_page,
      });
      if (res.success && res.data) {
        setDataset(res.data.dataset ?? []);
        const total = res.data.totalRecord ?? 0;
        setPagination({
          current_page: pagination.current_page,
          page_size: pagination.page_size,
          total_items: total,
          total_pages: Math.max(1, Math.ceil(total / pagination.page_size)),
        });
      } else {
        setDataset([]);
        toast.error(t('loadFailed'), { description: res.message });
      }
    } catch (err) {
      setDataset([]);
      setPagination({ ...pagination, total_items: 0, total_pages: 0 });
      toast.error(t('loadFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, pagination.current_page, pagination.page_size, loadingBranches, setDataset, setPagination, setLoading, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Dialogs ──
  const [viewUid, setViewUid] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formUid, setFormUid] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<StudentDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setFormMode('create');
    setFormUid(null);
    setFormInitial(null);
    setFormOpen(true);
  };

  const openEdit = (uid: string, initial?: StudentDetail) => {
    setFormMode('edit');
    setFormUid(uid);
    setFormInitial(initial ?? null);
    setViewUid(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await studentService.delete(deleteTarget.uid);
      if (!res.success) throw new Error(res.message);
      toast.success(t('deleted'));
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(t('deleteFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── Export / print ──
  const selectedRows = () =>
    selectedUids.length ? dataset.filter((s) => selectedUids.includes(s.uid)) : dataset;

  const exportRows = () =>
    selectedRows().map((s) => ({
      systemNo: s.uid,
      name: s.name ?? '',
      ic: s.ic ?? '',
      gender: genderCode(s.gender),
      matric: s.matric ?? '',
      className: s.className || '',
      academicYear: s.academicYear ?? '',
      father: s.father?.name ?? '',
      fatherPhone: s.father?.phone ?? '',
      mother: s.mother?.name ?? '',
      motherPhone: s.mother?.phone ?? '',
      birthDate: fmtDate(s.birthDate),
      registerDate: fmtDate(s.registerDate),
      endDate: fmtDate(s.endDate),
      status: labelFor(s.status, t('statusUnknown')),
    }));

  const exportColumns = [
    { header: t('systemNo'), key: 'systemNo' as const, width: 16 },
    { header: t('name'), key: 'name' as const, width: 32 },
    { header: t('ic'), key: 'ic' as const, width: 16 },
    { header: t('gender'), key: 'gender' as const, width: 6 },
    { header: t('matric'), key: 'matric' as const, width: 14 },
    { header: t('className'), key: 'className' as const, width: 18 },
    { header: t('academicYear'), key: 'academicYear' as const, width: 8 },
    { header: t('fatherInfo'), key: 'father' as const, width: 28 },
    { header: `${t('fatherInfo')} ${t('phone')}`, key: 'fatherPhone' as const, width: 14 },
    { header: t('motherInfo'), key: 'mother' as const, width: 28 },
    { header: `${t('motherInfo')} ${t('phone')}`, key: 'motherPhone' as const, width: 14 },
    { header: t('birthDate'), key: 'birthDate' as const, width: 12 },
    { header: t('registerDate'), key: 'registerDate' as const, width: 12 },
    { header: t('endDate'), key: 'endDate' as const, width: 12 },
    { header: t('status'), key: 'status' as const, width: 10 },
  ];

  const handlePrint = () => {
    const statusLabel =
      filters.status === '' ? t('allStatuses') : labelFor(filters.status, t('statusUnknown'));
    const className =
      filters.educationClass === ''
        ? t('allClasses')
        : classes.find((c) => c.classCode === filters.educationClass)?.className ?? filters.educationClass;
    printTable<StudentListItem>({
      title: t('title'),
      subtitle: t('printSubtitle'),
      meta: [
        { label: t('branch'), value: branchName || selectedSid || '-' },
        { label: t('status'), value: statusLabel },
        { label: t('academicYear'), value: filters.academicYear || t('allYears') },
        { label: t('educationClass'), value: className },
        { label: t('records'), value: String(selectedRows().length) },
      ],
      columns: [
        { header: t('name'), value: (s) => `${s.name ?? ''}\n${s.uid}`, width: '22%' },
        { header: t('ic'), value: (s) => s.ic ?? '' },
        { header: t('matric'), value: (s) => s.matric ?? '' },
        { header: t('colGender'), value: (s) => genderCode(s.gender), align: 'center', width: '40px' },
        { header: t('className'), value: (s) => `${s.className || '-'}\n${t('intake')} ${s.academicYear ?? ''}` },
        { header: t('fatherInfo'), value: (s) => `${s.father?.name ?? ''}\n${s.father?.phone ?? ''}` },
        { header: t('motherInfo'), value: (s) => `${s.mother?.name ?? ''}\n${s.mother?.phone ?? ''}` },
        { header: t('birthDate'), value: (s) => fmtDate(s.birthDate) },
        { header: t('registerDate'), value: (s) => fmtDate(s.registerDate) },
        { header: t('endDate'), value: (s) => fmtDate(s.endDate) },
        { header: t('status'), value: (s) => labelFor(s.status, t('statusUnknown')) },
      ],
      rows: selectedRows(),
    });
  };

  const allSelected = dataset.length > 0 && selectedUids.length === dataset.length;
  const startIndex = (pagination.current_page - 1) * pagination.page_size;
  const columnCount = 11;

  const toSelectValue = (v: string) => (v === '' ? ALL : v);
  const fromSelectValue = (v: string) => (v === ALL ? '' : v);

  const sortedLevelOptions = useMemo(
    () => Array.from(levelOptions).sort((a, b) => a - b),
    [levelOptions]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GraduationCap}
        accent="emerald"
        title={t('title')}
        subtitle={t('subtitle')}
      >
        <BranchPill
          branches={branches}
          selectedSid={selectedSid}
          onBranchChange={setSelectedSid}
          loading={loadingBranches}
          isHQ={isHQ}
          branchName={branchName}
          onDistrictFilter={(d) => fetchBranches(d)}
        />
      </PageHeader>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openCreate} className="h-10 rounded-xl px-4">
          <Plus className="mr-1.5 h-4 w-4" />
          {t('addNew')}
        </Button>

        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-10 rounded-xl pl-9"
          />
        </div>

        {/* Status */}
        <Select
          value={toSelectValue(filters.status)}
          onValueChange={(v) => setFilters({ status: fromSelectValue(v) })}
          disabled={statusesLoading}
        >
          <SelectTrigger className="h-10 w-[170px] rounded-xl" aria-label={t('status')}>
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('allStatuses')}</SelectItem>
            {statuses.map((o) => (
              <SelectItem key={o.status} value={String(o.status)}>{o.statusName}</SelectItem>
            ))}
            {filters.status !== '' && !statuses.some((o) => String(o.status) === filters.status) && (
              <SelectItem value={filters.status}>{labelFor(filters.status, t('statusUnknown'))}</SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Academic year */}
        <Select
          value={toSelectValue(filters.academicYear)}
          onValueChange={(v) => setFilters({ academicYear: fromSelectValue(v) })}
        >
          <SelectTrigger className="h-10 w-[140px] rounded-xl" aria-label={t('academicYear')}>
            <SelectValue placeholder={t('academicYear')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('allYears')}</SelectItem>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Class */}
        <Select
          value={toSelectValue(filters.educationClass)}
          onValueChange={(v) => setFilters({ educationClass: fromSelectValue(v) })}
          disabled={classesLoading}
        >
          <SelectTrigger className="h-10 w-[190px] rounded-xl" aria-label={t('educationClass')}>
            <SelectValue placeholder={t('educationClass')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('allClasses')}</SelectItem>
            {classes.map((c, i) => (
              <SelectItem key={`${c.classCode}-${i}`} value={c.classCode}>{c.className}</SelectItem>
            ))}
            {filters.educationClass !== '' && !classes.some((c) => c.classCode === filters.educationClass) && (
              <SelectItem value={filters.educationClass}>{filters.educationClass}</SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Education level */}
        <Select
          value={toSelectValue(filters.educationLevel)}
          onValueChange={(v) => setFilters({ educationLevel: fromSelectValue(v) })}
        >
          <SelectTrigger className="h-10 w-[140px] rounded-xl" aria-label={t('educationLevel')}>
            <SelectValue placeholder={t('educationLevel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('allLevels')}</SelectItem>
            {sortedLevelOptions.map((lvl) => (
              <SelectItem key={lvl} value={String(lvl)}>
                {t('levelLabel').replace('{n}', String(lvl))}
              </SelectItem>
            ))}
            {filters.educationLevel !== '' && !levelOptions.has(Number(filters.educationLevel)) && (
              <SelectItem value={filters.educationLevel}>
                {t('levelLabel').replace('{n}', filters.educationLevel)}
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 rounded-xl"
            onClick={() => {
              clearFilters();
              setSearchValue('');
            }}
          >
            <X className="mr-1 h-4 w-4" />
            {t('clearFilters')}
          </Button>
        )}

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 rounded-xl">
              <ArrowUpDown className="mr-1.5 h-4 w-4" />
              {t('sort')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t('sort')}</DropdownMenuLabel>
            {SORT_OPTIONS.map((o) => (
              <DropdownMenuItem key={o.field} onClick={() => setSort({ ...sort, field: o.field })}>
                <span className="flex-1">{t(o.labelKey)}</span>
                {sort.field === o.field && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSort({ ...sort, order: 'asc' })}>
              <span className="flex-1">{t('ascending')}</span>
              {sort.order === 'asc' && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort({ ...sort, order: 'desc' })}>
              <span className="flex-1">{t('descending')}</span>
              {sort.order === 'desc' && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export actions */}
        <div className="ml-auto flex items-center gap-2">
          {selectedUids.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('selectedCount').replace('{count}', String(selectedUids.length))}
            </span>
          )}
          <ButtonWithTooltip
            tooltip={t('exportExcel')}
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            disabled={dataset.length === 0}
            onClick={() => exportToExcel(exportRows(), exportColumns, 'students')}
          >
            <FileSpreadsheet className="h-4 w-4" />
          </ButtonWithTooltip>
          <ButtonWithTooltip
            tooltip={t('print')}
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            disabled={dataset.length === 0}
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
          </ButtonWithTooltip>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <Table className="min-w-[1320px] table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/30 text-xs hover:bg-muted/30">
              <TableHead className="w-12 pl-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => setSelected(v === true ? dataset.map((s) => s.uid) : [])}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-12 text-center">{t('colNo')}</TableHead>
              <TableHead className="w-[22%]">{t('colStudent')}</TableHead>
              <TableHead className="w-[15%]">{t('matric')}</TableHead>
              <TableHead className="w-[10%]">{t('colClass')}</TableHead>
              <TableHead className="w-[16%]">{t('colParents')}</TableHead>
              <TableHead className="w-[100px]">{t('colBirthDate')}</TableHead>
              <TableHead className="w-[100px]">{t('colRegister')}</TableHead>
              <TableHead className="w-[100px]">{t('colEnd')}</TableHead>
              <TableHead className="w-[120px]">{t('colStatus')}</TableHead>
              <TableHead className="w-[88px] pr-4 text-right">{t('colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }).map((_, j) => (
                    <TableCell key={j} className="py-4">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : dataset.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <EmptyState
                    title={t('noStudents')}
                    description={t('noStudentsDesc')}
                    icon={<GraduationCap className="h-8 w-8 text-muted-foreground" />}
                  />
                </TableCell>
              </TableRow>
            ) : (
              dataset.map((s, i) => {
                const gender = genderCode(s.gender);
                const selected = selectedUids.includes(s.uid);
                const name = s.name || '-';
                return (
                  <TableRow key={s.uid} data-state={selected ? 'selected' : undefined} className="group">
                    <TableCell className="py-2.5 pl-4 align-top">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleSelected(s.uid)}
                        aria-label={name}
                        className="mt-2"
                      />
                    </TableCell>
                    <TableCell className="py-3 text-center align-top text-xs text-muted-foreground">{startIndex + i + 1}</TableCell>

                    {/* Student: avatar + gender badge, name, status, IC, intake */}
                    <TableCell className="py-2.5 align-top">
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10 rounded-full ring-2 ring-background">
                            <AvatarImage src={s.fileProfile || undefined} alt={name} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
                              {initials(s.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            title={gender === 'M' ? t('male') : gender === 'F' ? t('female') : undefined}
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-card',
                              gender === 'M' && 'bg-blue-500 text-white',
                              gender === 'F' && 'bg-rose-500 text-white',
                              gender === '-' && 'bg-muted text-muted-foreground'
                            )}
                          >
                            {gender}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => setViewUid(s.uid)}
                            title={name}
                            className="block w-full truncate text-left text-[13px] font-semibold uppercase text-primary hover:underline"
                          >
                            {name}
                          </button>
                          <p className="text-xs font-semibold">{displayValue(s.ic)}</p>
                          {s.academicYear && (
                            <p className="text-[11px] font-semibold italic text-amber-600 dark:text-amber-400">
                              {t('intake')} {s.academicYear}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Matric */}
                    <TableCell className="py-2.5 align-top">
                      <div className="space-y-1.5">
                        <div className="leading-tight">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t('systemNo')}</p>
                          <p className="break-all text-[13px] font-semibold text-rose-600 dark:text-rose-400">{s.uid}</p>
                        </div>
                        <div className="leading-tight">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t('matric')}</p>
                          <p className="break-all text-[13px] font-semibold text-primary">{displayValue(s.matric)}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Class */}
                    <TableCell className="py-2.5 align-top">
                      <p className={cn('truncate text-[13px]', !s.className && 'text-muted-foreground')} title={s.className ?? undefined}>
                        {s.className || t('noClass')}
                      </p>
                    </TableCell>

                    {/* Parents */}
                    <TableCell className="py-2.5 align-top">
                      <div className="space-y-1.5 text-xs">
                        {[
                          { person: s.father, color: 'text-blue-700 dark:text-blue-300' },
                          { person: s.mother, color: 'text-emerald-700 dark:text-emerald-300' },
                        ].map(({ person, color }, idx) => (
                          <div key={idx} className="min-w-0 leading-tight">
                            <p className={cn('truncate font-semibold', color)} title={person?.name ?? undefined}>
                              {displayValue(person?.name)}
                            </p>
                            <p className="truncate font-medium">{displayValue(person?.phone)}</p>
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    {/* Dates */}
                    <TableCell className="py-3 align-top text-xs">{fmtDate(s.birthDate)}</TableCell>
                    <TableCell className="py-3 align-top text-xs">{fmtDate(s.registerDate)}</TableCell>
                    <TableCell className="py-3 align-top text-xs">{fmtDate(s.endDate)}</TableCell>

                    {/* Status */}
                    <TableCell className="py-2.5 align-top">
                      <Badge className={cn('max-w-full truncate rounded-full border-0 text-[11px]', STATUS_TONE_CLASS[statusTone(s.status)])}>
                        {labelFor(s.status, t('statusUnknown'))}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 pr-4 align-top">
                      <div className="flex items-center justify-end gap-0.5">
                        <ButtonWithTooltip tooltip={t('view')} variant="ghost" size="icon-sm" onClick={() => setViewUid(s.uid)}>
                          <Eye className="h-4 w-4" />
                        </ButtonWithTooltip>
                        <ButtonWithTooltip tooltip={t('edit')} variant="ghost" size="icon-sm" onClick={() => openEdit(s.uid)}>
                          <Pencil className="h-4 w-4" />
                        </ButtonWithTooltip>
                        {ENABLE_DELETE && (
                          <ButtonWithTooltip
                            tooltip={t('delete')}
                            variant="ghost"
                            size="icon-sm"
                            className="hover:text-destructive"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </ButtonWithTooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        currentPage={pagination.current_page}
        totalPages={pagination.total_pages}
        totalItems={pagination.total_items}
        pageSize={pagination.page_size}
        onPageChange={setPage}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={setPageSize}
      />

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <StudentDetailDialog
        open={viewUid !== null}
        onOpenChange={(o) => !o && setViewUid(null)}
        uid={viewUid}
        onEdit={(student) => openEdit(student.uid, student)}
      />

      <StudentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        uid={formUid}
        initialData={formInitial}
        onSaved={fetchData}
        onDeleted={fetchData}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmDesc').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('delete')}
        cancelLabel={tCommon('cancel')}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
