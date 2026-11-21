'use client';

import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CalendarRange,
  GraduationCap,
  Layers,
  RefreshCw,
  School,
  Cake,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { BranchPill } from '@/components/shared/branch-pill';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';
import { AnimatedNumber } from '@/components/dashboard/animated-number';
import { useStudentAnalytics, type Datum } from '@/components/dashboard/use-student-analytics';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

/* Chart colors come from --viz-* tokens in globals.css (light + dark steps). */
const SERIES = 'var(--viz-1)';
const TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };

/* ── Building blocks ──────────────────────────────────────────────────── */

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn('border-border/60 shadow-sm', className)}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Datum; value?: number | string }>;
  unit: string;
}) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{d.label}</p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">{d.value.toLocaleString()}</span> {unit}
      </p>
    </div>
  );
}

function Empty({ text, height = 220 }: { text: string; height?: number }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
      {text}
    </div>
  );
}

/** Vertical columns — for ordered categories (years, months, ages). */
function ColumnChart({ data, unit, emptyText, height = 240 }: { data: Datum[]; unit: string; emptyText: string; height?: number }) {
  if (!data.length || data.every((d) => d.value === 0)) return <Empty text={emptyText} height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
        <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.6 }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey="value" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars — for named categories (class, level, status). */
function RankedBarChart({ data, unit, emptyText }: { data: Datum[]; unit: string; emptyText: string }) {
  if (!data.length || data.every((d) => d.value === 0)) return <Empty text={emptyText} />;
  const height = Math.max(160, data.length * 34 + 16);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={6}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={120}
          tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
        />
        <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.6 }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey="value" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList dataKey="value" position="right" style={{ fill: 'var(--foreground)', fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Two-part 100% bar with a legend that carries name, share and count. */
function GenderSplit({ male, female, unknown, labels }: {
  male: number;
  female: number;
  unknown: number;
  labels: { male: string; female: string; unknown: string; empty: string };
}) {
  const total = male + female;
  if (total === 0) return <Empty text={labels.empty} height={120} />;
  const parts = [
    { key: 'm', label: labels.male, value: male, color: 'var(--viz-1)' },
    { key: 'f', label: labels.female, value: female, color: 'var(--viz-2)' },
  ];
  return (
    <div className="space-y-5">
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full">
        {parts.map((p) =>
          p.value > 0 ? (
            <div
              key={p.key}
              title={`${p.label}: ${p.value.toLocaleString()} (${Math.round((p.value / total) * 100)}%)`}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
            />
          ) : null
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {parts.map((p) => (
          <div key={p.key} className="rounded-xl border border-border/60 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              {p.label}
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{Math.round((p.value / total) * 100)}%</p>
            <p className="text-xs text-muted-foreground tabular-nums">{p.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
      {unknown > 0 && (
        <p className="text-xs text-muted-foreground">
          {labels.unknown}: {unknown.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, loading, decimals = 0 }: {
  label: string;
  value: number | null;
  icon: LucideIcon;
  loading: boolean;
  decimals?: number;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums">
              {value === null ? '-' : decimals ? value.toFixed(decimals) : <AnimatedNumber value={value} />}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { t, locale } = useTranslation('analytics');
  const { t: tNav } = useTranslation('navigation');
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
  const { data, loading, error, reload } = useStudentAnalytics(selectedSid, ready, {
    noClass: t('noClass'),
    other: t('other'),
    unknown: t('unknown'),
    locale: locale === 'ms' ? 'ms-MY' : 'en-GB',
  });
  const busy = loading || !ready;
  const unit = t('students');
  const empty = t('noData');
  const last12 = data?.byRegisterMonth.reduce((s, d) => s + d.value, 0) ?? 0;

  const skeleton = <Skeleton className="h-[220px] w-full rounded-xl" />;

  return (
    <MotionStagger className="space-y-6">
      <MotionCard>
        <PageHeader icon={BarChart3} accent="blue" title={tNav('dashboard')} subtitle={t('subtitle')}>
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

      {data?.truncated && (
        <p className="text-xs text-muted-foreground">
          {t('truncated').replace('{n}', data.sampled.toLocaleString()).replace('{total}', data.activeCount.toLocaleString())}
        </p>
      )}

      <MotionCard>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile label={t('activeStudents')} value={data?.activeCount ?? 0} icon={UserCheck} loading={busy} />
          <StatTile label={t('registered12m')} value={last12} icon={UserPlus} loading={busy} />
          <StatTile label={t('classes')} value={data?.classCount ?? 0} icon={School} loading={busy} />
          <StatTile label={t('averageAge')} value={data?.averageAge ?? null} icon={Cake} loading={busy} decimals={1} />
        </div>
      </MotionCard>

      <MotionCard>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard icon={CalendarRange} title={t('byIntake')} subtitle={t('activeOnly')} className="lg:col-span-2">
            {busy ? skeleton : <ColumnChart data={data?.byIntake ?? []} unit={unit} emptyText={empty} />}
          </ChartCard>
          <ChartCard icon={Users} title={t('gender')} subtitle={t('activeOnly')}>
            {busy ? skeleton : (
              <GenderSplit
                male={data?.male ?? 0}
                female={data?.female ?? 0}
                unknown={data?.unknownGender ?? 0}
                labels={{ male: t('male'), female: t('female'), unknown: t('genderUnknown'), empty }}
              />
            )}
          </ChartCard>
        </div>
      </MotionCard>

      <MotionCard>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard icon={UserPlus} title={t('byRegisterMonth')} subtitle={t('byRegisterMonthHint')} className="lg:col-span-2">
            {busy ? skeleton : <ColumnChart data={data?.byRegisterMonth ?? []} unit={unit} emptyText={empty} />}
          </ChartCard>
          <ChartCard icon={Layers} title={t('byLevel')} subtitle={t('activeOnly')}>
            {busy ? skeleton : <RankedBarChart data={data?.byLevel ?? []} unit={unit} emptyText={empty} />}
          </ChartCard>
        </div>
      </MotionCard>

      <MotionCard>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard icon={School} title={t('byClass')} subtitle={t('byClassHint')}>
            {busy ? skeleton : <RankedBarChart data={data?.byClass ?? []} unit={unit} emptyText={empty} />}
          </ChartCard>
          <ChartCard icon={Cake} title={t('byAge')} subtitle={t('activeOnly')}>
            {busy ? skeleton : <ColumnChart data={data?.byAge ?? []} unit={unit} emptyText={empty} />}
          </ChartCard>
          <ChartCard icon={GraduationCap} title={t('byStatus')} subtitle={t('byStatusHint')}>
            {busy ? skeleton : <RankedBarChart data={data?.byStatus ?? []} unit={t('records')} emptyText={empty} />}
          </ChartCard>
        </div>
      </MotionCard>
    </MotionStagger>
  );
}
