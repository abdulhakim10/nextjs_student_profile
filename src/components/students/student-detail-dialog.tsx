'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/i18n';
import { studentService } from '@/services/student.service';
import { toast } from '@/lib/toast';
import { useFetchGuard } from '@/hooks/use-fetch-guard';
import { formatDate } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import type { StudentDetail, StudentGuardian } from '@/types';
import {
  displayValue,
  formatAddress,
  initials,
  isEmptyDate,
  statusTone,
  STATUS_TONE_CLASS,
} from './student-helpers';
import { useStudentStatuses } from './use-student-statuses';
import { FLAG_KEYS } from './student-form-types';
import {
  X,
  Pencil,
  User,
  ShieldCheck,
  MapPin,
  Users,
  Phone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

interface StudentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string | null;
  onEdit: (student: StudentDetail) => void;
}

function fmtDate(d: string | null | undefined): string {
  return isEmptyDate(d) ? '-' : formatDate(d as string);
}

/* ── Small presentational helpers ─────────────────────────────────────── */

function Field({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm break-words">{value ?? '-'}</p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <header className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
      {children}
    </p>
  );
}

/* ── Guardian block (father / mother) ─────────────────────────────────── */

function GuardianSection({
  title,
  guardian,
  tone,
}: {
  title: string;
  guardian: StudentGuardian | undefined;
  tone: string;
}) {
  const { t } = useTranslation('students');
  if (!guardian) return null;
  return (
    <Section icon={User} title={title} tone={tone}>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t('name')} value={displayValue(guardian.name)} />
        <Field label={t('ic')} value={displayValue(guardian.ic)} />
        <Field label={t('tin')} value={displayValue(guardian.tin)} />
        <Field label={t('handphone')} value={displayValue(guardian.phone)} />
        <Field label={t('email')} value={displayValue(guardian.email)} />
        <Field label={t('nationality')} value={displayValue(guardian.nationality)} />
        <Field label={t('birthPlace')} value={displayValue(guardian.birthPlace)} />
      </div>
      <SubHeading>{t('jobInfo')}</SubHeading>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t('occupation')} value={displayValue(guardian.job?.occupation)} />
        <Field label={t('employer')} value={displayValue(guardian.job?.employer)} />
        <Field label={t('phone')} value={displayValue(guardian.job?.phone)} />
        <Field label={t('fax')} value={displayValue(guardian.job?.fax)} />
        <Field label={t('salary')} value={displayValue(guardian.job?.salary)} />
      </div>
      <SubHeading>{t('address')}</SubHeading>
      <p className="text-sm">{formatAddress(guardian.address)}</p>
      <SubHeading>{t('bankInfo')}</SubHeading>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label={t('bankName')} value={displayValue(guardian.bankInfo?.bankName)} />
        <Field label={t('bankAccount')} value={displayValue(guardian.bankInfo?.bankAccount)} />
      </div>
    </Section>
  );
}

/* ── Dialog ───────────────────────────────────────────────────────────── */

export function StudentDetailDialog({ open, onOpenChange, uid, onEdit }: StudentDetailDialogProps) {
  const { t } = useTranslation('students');
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const guard = useFetchGuard();

  const load = useCallback(
    async (targetUid: string) => {
      const id = guard.begin();
      setLoading(true);
      setStudent(null);
      try {
        const res = await studentService.getDetail(targetUid);
        if (guard.isStale(id)) return;
        if (res.success && res.data) setStudent(res.data);
        else toast.error(t('detailLoadFailed'));
      } catch {
        if (!guard.isStale(id)) toast.error(t('detailLoadFailed'));
      } finally {
        if (!guard.isStale(id)) setLoading(false);
      }
    },
    [guard, t]
  );

  useEffect(() => {
    if (open && uid) load(uid);
  }, [open, uid, load]);

  const { labelFor } = useStudentStatuses(student ? String(student.branch) : undefined);
  const statusLabel = student ? labelFor(student.status, t('statusUnknown')) : '';
  const genderLabel =
    student?.personal?.gender === '1' ? t('male') : student?.personal?.gender === '0' ? t('female') : '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl"
      >
        <DialogTitle className="sr-only">{t('detailTitle')}</DialogTitle>

        {/* Header */}
        <div className="relative shrink-0 overflow-hidden border-b border-border/60 bg-gradient-to-br from-emerald-500/10 via-card to-teal-500/5 px-6 py-5">
          <div aria-hidden className="pointer-events-none absolute -top-20 right-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            {loading || !student ? (
              <>
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </>
            ) : (
              <>
                <Avatar className="h-16 w-16 rounded-2xl ring-2 ring-background shadow-md">
                  <AvatarImage src={student.fileProfile || undefined} alt={student.name} />
                  <AvatarFallback className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-semibold text-white">
                    {initials(student.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-bold tracking-tight">{student.name}</h2>
                    <Badge className={cn('rounded-full border-0', STATUS_TONE_CLASS[statusTone(student.status)])}>
                      {statusLabel}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{t('systemNo')}: <span className="font-medium text-foreground">{displayValue(student.systemNo || student.uid)}</span></span>
                    <span>{t('matric')}: <span className="font-medium text-foreground">{displayValue(student.matric)}</span></span>
                    <span>{t('ic')}: <span className="font-medium text-foreground">{displayValue(student.ic)}</span></span>
                    <span>{t('course')}: <span className="font-medium text-foreground">{displayValue(student.course)}</span></span>
                  </div>
                </div>
              </>
            )}
            <div className="flex shrink-0 items-center gap-2">
              {student && (
                <Button size="sm" onClick={() => onEdit(student)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {t('edit')}
                </Button>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="icon" aria-label={t('close')}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Quick info rail */}
          <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border/60 bg-muted/20 p-5 md:block">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('systemInfo')}</p>
            {loading || !student ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  [t('registerDate'), fmtDate(student.registerDate)],
                  [t('endDate'), fmtDate(student.endDate)],
                  [t('registerNo'), displayValue(student.registerNo)],
                  [t('className'), displayValue(student.className)],
                  [t('schoolAccount'), displayValue(student.schoolAccount)],
                  [t('sponsored'), displayValue(student.sponsored)],
                  [t('mentor'), displayValue(student.mentor)],
                  [t('billTo'), displayValue(student.billTo)],
                  [t('branch'), displayValue(student.branch)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border/50 bg-card px-3 py-2">
                    <dt className="text-[11px] text-muted-foreground">{label}</dt>
                    <dd className="font-medium break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </aside>

          {/* Details */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {loading || !student ? (
              <>
                <Skeleton className="h-56 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </>
            ) : (
              <>
                <Section icon={ShieldCheck} title={t('personalInfo')} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label={t('gender')} value={genderLabel} />
                    <Field label={t('race')} value={displayValue(student.personal?.race)} />
                    <Field label={t('religion')} value={displayValue(student.personal?.religion)} />
                    <Field label={t('birthCertNo')} value={displayValue(student.personal?.birthCertNo)} />
                    <Field label={t('birthDate')} value={fmtDate(student.personal?.birthDate)} />
                    <Field label={t('birthPlace')} value={displayValue(student.personal?.birthPlace)} />
                    <Field label={t('phone')} value={displayValue(student.personal?.phone)} />
                    <Field label={t('parentPhone')} value={displayValue(student.personal?.parentPhone)} />
                    <Field label={t('email')} value={displayValue(student.personal?.email)} />
                    <Field label={t('nationality')} value={displayValue(student.personal?.nationality)} />
                    <Field label={t('transportation')} value={displayValue(student.personal?.transportation)} />
                    <Field label={t('illnessAllergic')} value={displayValue(student.personal?.illnessAllergic)} />
                    <Field label={t('previousSchool')} value={displayValue(student.personal?.previousSchool)} />
                    <Field label={t('otherInfo')} value={displayValue(student.personal?.otherInfo)} className="sm:col-span-2" />
                  </div>
                  <SubHeading>{t('address')}</SubHeading>
                  <p className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    {formatAddress(student.personal?.address)}
                  </p>
                  <SubHeading>{t('additionalInfo')}</SubHeading>
                  <div className="flex flex-wrap gap-2">
                    {FLAG_KEYS.map((key) => {
                      const on = Boolean(student.personal?.[key]);
                      return (
                        <span
                          key={key}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
                            on
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'border-border/60 bg-muted/40 text-muted-foreground'
                          )}
                        >
                          {on && <Sparkles className="h-3 w-3" />}
                          {t(key)}
                        </span>
                      );
                    })}
                  </div>
                </Section>

                <GuardianSection
                  title={t('fatherInfo')}
                  guardian={student.father}
                  tone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                />
                <GuardianSection
                  title={t('motherInfo')}
                  guardian={student.mother}
                  tone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
                />

                <Section icon={Phone} title={t('emergencyContact')} tone="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label={t('name')} value={displayValue(student.emergencyContact?.name)} />
                    <Field label={t('relation')} value={displayValue(student.emergencyContact?.relation)} />
                    <Field label={t('handphone')} value={displayValue(student.emergencyContact?.phone)} />
                    <Field label={t('email')} value={displayValue(student.emergencyContact?.email)} />
                    <Field label={t('officePhone')} value={displayValue(student.emergencyContact?.officePhone)} />
                    <Field label={t('fax')} value={displayValue(student.emergencyContact?.fax)} />
                    <Field label={t('address')} value={formatAddress(student.emergencyContact?.address)} className="sm:col-span-2 lg:col-span-3" />
                  </div>
                </Section>

                <Section icon={Users} title={t('siblingsInfo')} tone="bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  {student.siblings && student.siblings.length > 0 ? (
                    <div className="grid grid-cols-[2fr_2fr_1fr_1.3fr_1.3fr] gap-x-6 gap-y-2 text-sm">
                      {[t('siblingName'), t('siblingSchool'), t('siblingBirthYear'), t('siblingIc'), t('siblingRelation')].map((h) => (
                        <p key={h} className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{h}</p>
                      ))}
                      {student.siblings.map((s, i) => (
                        <div key={i} className="contents">
                          <p>{displayValue(s.name)}</p>
                          <p>{displayValue(s.school)}</p>
                          <p>{displayValue(s.birthYear)}</p>
                          <p>{displayValue(s.ic)}</p>
                          <p>{displayValue(s.relation)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('noSiblings')}</p>
                  )}
                </Section>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
