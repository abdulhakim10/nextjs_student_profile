'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useStudentStore, EMPTY_STUDENT_FILTERS, DEFAULT_STUDENT_STATUS } from '@/stores/student.store';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { useTranslation } from '@/i18n';
import { PageHeader } from '@/components/shared/page-header';
import { BranchPill } from '@/components/shared/branch-pill';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';
import { AnimatedNumber } from '@/components/dashboard/animated-number';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStudentOverview, type CountRow } from '@/components/overview/use-student-overview';
import { displayValue, initials, isEmptyDate } from '@/components/students/student-helpers';
import { useStudentPhotos } from '@/components/students/use-student-photos';
import { formatDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import {
  Home,
  GraduationCap,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Layers,
  ArrowRight,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';

/* ── KPI tile ─────────────────────────────────────────────────────────── */

function StatTile({
  label,
  hint,
  value,
  icon: Icon,
  iconClass,
  loading,
}: {
  label: string;
  hint?: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
  loading: boolean;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-20" />
            ) : (
              <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums">
                <AnimatedNumber value={value} />
              </p>
            )}
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn('rounded-xl p-2.5', iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Panel + horizontal bar list ──────────────────────────────────────── */

function Panel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="h-full border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** One series → one hue. Rows are clickable and open the filtered student list. */
function BarList({
  rows,
  loading,
  emptyText,
  onSelect,
}: {
  rows: CountRow[];
  loading: boolean;
  emptyText: string;
  onSelect: (row: CountRow) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
    );
  }
  if (!rows.length || rows.every((r) => r.count === 0)) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  const sum = rows.reduce((s, r) => s + r.count, 0) || 1;
  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const pct = Math.round((r.count / sum) * 100);
        return (
          <li key={r.code}>
            <button
              type="button"
              onClick={() => onSelect(r)}
              title={`${r.label}: ${r.count.toLocaleString()} (${pct}%)`}
              className="group w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className={cn('truncate', r.count === 0 && 'text-muted-foreground')}>{r.label}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold">{r.count.toLocaleString()}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">{pct}%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 dark:bg-emerald-400"
                  style={{ width: `${r.count === 0 ? 0 : Math.max(2, (r.count / max) * 100)}%` }}
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function OverviewPage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const { t } = useTranslation('overview');
  const { t: tGreeting } = useTranslation('greeting');
  const {
    branches,
    selectedSid,
    setSelectedSid,
    loadingBranches,
    isHQ,
    isAll,
    allowAll,
    branchName,
    fetchBranches,
  } = useBranchSelector({ allowAll: true });

  const ready = !loadingBranches || Boolean(selectedSid);
  const { data, loading, error, reload } = useStudentOverview(selectedSid, ready);
  const busy = loading || !ready;
  const photoSrc = useStudentPhotos((data?.recent ?? []).map((s) => s.fileProfile));
  const year = String(new Date().getFullYear());

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? tGreeting('morning') : hour < 17 ? tGreeting('afternoon') : tGreeting('evening');

  /** Open the student list pre-filtered (branch follows the shared pill). */
  const openStudents = (filters: Partial<typeof EMPTY_STUDENT_FILTERS> = {}) => {
    const store = useStudentStore.getState();
    store.clearFilters();
    store.setFilters({ ...filters, search: '' });
    router.push('/students');
  };

  return (
    <MotionStagger className="space-y-6">
      <MotionCard>
        <PageHeader
          icon={Home}
          accent="primary"
          title={`${greeting}, ${userData?.user_name || 'Admin'}`}
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
            allowAll={allowAll}
            isAll={isAll}
          />
        </PageHeader>
      </MotionCard>

      {error && (
        <MotionCard>
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
              <span>{t('loadFailed')}</span>
              <Button size="sm" variant="outline" onClick={reload}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {t('retry')}
              </Button>
            </CardContent>
          </Card>
        </MotionCard>
      )}

      {/* KPIs */}
      <MotionCard>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label={t('activeStudents')}
            hint={t('activeHint')}
            value={data?.active ?? 0}
            icon={UserCheck}
            iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
            loading={busy}
          />
          <StatTile
            label={t('intakeThisYear').replace('{year}', year)}
            hint={t('intakeHint')}
            value={data?.intakeThisYear ?? 0}
            icon={UserPlus}
            iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
            loading={busy}
          />
          <StatTile
            label={t('formerStudents')}
            hint={t('formerHint')}
            value={data?.inactive ?? 0}
            icon={UserMinus}
            iconClass="bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
            loading={busy}
          />
          <StatTile
            label={t('totalRecords')}
            hint={t('totalHint')}
            value={data?.total ?? 0}
            icon={Users}
            iconClass="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
            loading={busy}
          />
        </div>
      </MotionCard>

      {/* Breakdowns */}
      <MotionCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel icon={GraduationCap} title={t('byStatus')} subtitle={t('byStatusHint')}>
            <BarList
              rows={data?.byStatus ?? []}
              loading={busy}
              emptyText={t('noData')}
              onSelect={(r) => openStudents({ status: r.code })}
            />
          </Panel>
          <Panel icon={Layers} title={t('byLevel')} subtitle={t('byLevelHint')}>
            <BarList
              rows={data?.byLevel ?? []}
              loading={busy}
              emptyText={t('noData')}
              onSelect={(r) => openStudents({ status: DEFAULT_STUDENT_STATUS, educationLevel: r.code })}
            />
          </Panel>
        </div>
      </MotionCard>

      {/* Latest students */}
      <MotionCard>
        <Panel
          icon={UserPlus}
          title={t('recentStudents')}
          subtitle={t('recentHint')}
          action={
            <Button size="sm" variant="ghost" onClick={() => openStudents()}>
              {t('viewAll')}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          }
        >
          {busy ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : data?.recent.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.recent.map((s) => (
                <button
                  key={s.uid}
                  type="button"
                  onClick={() => openStudents({ search: s.matric || s.name })}
                  className="flex items-center gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={photoSrc(s.fileProfile)} alt={s.name} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
                      {initials(s.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayValue(s.name)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {displayValue(s.matric)} · {displayValue(s.className)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {isEmptyDate(s.registerDate) ? '-' : formatDate(s.registerDate)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('noData')}</p>
          )}
        </Panel>
      </MotionCard>
    </MotionStagger>
  );
}
