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
import type { StudentAddress, StudentCustomField, StudentDetail, StudentGuardian } from '@/types';
import {
  cleanLabel,
  displayValue,
  genderCode,
  humanize,
  initials,
  isBlank,
  isEmptyDate,
  parseVaccine,
  schoolName,
  unpack,
  statusTone,
  STATUS_TONE_CLASS,
} from './student-helpers';
import { useStudentStatuses } from './use-student-statuses';
import { useStudentPhotos } from './use-student-photos';
import { FLAG_KEYS } from './student-form-types';
import {
  X,
  Pencil,
  User,
  IdCard,
  MapPin,
  Users,
  Phone,
  Sparkles,
  Briefcase,
  Landmark,
  Contact,
  ClipboardList,
  BadgeCheck,
  Syringe,
  FileText,
  ListPlus,
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

const TONE = {
  personal: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  father: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  mother: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  emergency: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  siblings: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  other: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  registration: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
};

/* ── Small presentational helpers ─────────────────────────────────────── */

function Field({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm break-words">{value ?? '-'}</p>
    </div>
  );
}

/** Top-level block on the single-page view (Personal, Father, Mother…). */
function Group({
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
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tone)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <div className="h-px flex-1 bg-border/60" />
      </div>
      {children}
    </section>
  );
}

function Section({
  icon: Icon,
  title,
  tone = 'bg-muted text-muted-foreground',
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('rounded-2xl border border-border/60 bg-card shadow-sm', className)}>
      <header className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Responsive field grid. `cols` is the max column count on wide screens. */
function FieldGrid({ cols = 3, children }: { cols?: 2 | 3; children: ReactNode }) {
  return (
    <div className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', cols === 3 && 'xl:grid-cols-3')}>
      {children}
    </div>
  );
}

/** Address broken into its parts instead of one comma-joined line. */
function AddressFields({ address }: { address: StudentAddress | undefined }) {
  const { t } = useTranslation('students');
  const street = [address?.line1, address?.line2, address?.line3]
    .map((l) => (l ?? '').trim())
    .filter((l) => l && l !== 'None' && l !== 'null');
  return (
    <div className="space-y-4">
      <Field
        label={t('street')}
        value={
          street.length ? (
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {street.map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </span>
            </span>
          ) : (
            '-'
          )
        }
      />
      <FieldGrid>
        <Field label={t('postcode')} value={displayValue(address?.postcode)} />
        <Field label={t('city')} value={displayValue(address?.city)} />
        {address?.district !== undefined && (
          <Field label={t('district')} value={displayValue(address.district)} />
        )}
        <Field label={t('state')} value={humanize(address?.state)} />
        <Field label={t('country')} value={humanize(address?.country)} />
      </FieldGrid>
    </div>
  );
}

/* ── Custom fields ────────────────────────────────────────────────────── */

type ExtraSection = 'student' | 'father' | 'mother' | 'emergency' | 'other';

const SECTION_MAP: Record<string, ExtraSection> = {
  student_profile: 'student',
  guardian_father: 'father',
  guardian_mother: 'mother',
  emergency_contact: 'emergency',
};

/**
 * Buckets the school's custom fields by the part of the profile they belong
 * to, dropping empty ones and duplicates (the legacy "others" answers and
 * the new "custom_fields" definitions often repeat the same question).
 */
function groupCustomFields(fields: StudentCustomField[] | undefined) {
  const out: Record<ExtraSection, StudentCustomField[]> = {
    student: [], father: [], mother: [], emergency: [], other: [],
  };
  const seen = new Set<string>();
  for (const f of fields ?? []) {
    if (isBlank(f.value) || unpack(String(f.value)) === '-') continue;
    const bucket = SECTION_MAP[f.section] ?? 'other';
    const key = `${bucket}|${cleanLabel(f.label).toLowerCase()}|${unpack(String(f.value)).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out[bucket].push(f);
  }
  return out;
}

function ExtraFields({ fields }: { fields: StudentCustomField[] }) {
  return (
    <FieldGrid>
      {fields.map((f) => (
        <Field
          key={`${f.section}.${f.name}`}
          label={cleanLabel(f.label) || humanize(f.name)}
          value={unpack(String(f.value))}
          className={f.type === 'textarea' || String(f.value).length > 60 ? 'sm:col-span-2' : undefined}
        />
      ))}
    </FieldGrid>
  );
}

/* ── Guardian tab (father / mother) ───────────────────────────────────── */

function GuardianTab({
  guardian,
  tone,
  extra = [],
}: {
  guardian: StudentGuardian | undefined;
  tone: string;
  extra?: StudentCustomField[];
}) {
  const { t } = useTranslation('students');
  if (!guardian) {
    return <p className="text-sm text-muted-foreground">{t('notAvailable')}</p>;
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section icon={IdCard} title={t('identity')} tone={tone}>
        <FieldGrid cols={2}>
          <Field label={t('name')} value={displayValue(guardian.name)} className="sm:col-span-2" />
          <Field label={t('ic')} value={displayValue(guardian.ic)} />
          <Field label={t('tin')} value={displayValue(guardian.tin)} />
          <Field label={t('nationality')} value={humanize(guardian.nationality)} />
          <Field label={t('birthPlace')} value={displayValue(guardian.birthPlace)} />
        </FieldGrid>
      </Section>
      <Section icon={Contact} title={t('contactInfo')} tone={tone}>
        <FieldGrid cols={2}>
          <Field label={t('handphone')} value={displayValue(guardian.phone)} />
          <Field label={t('email')} value={displayValue(guardian.email)} />
        </FieldGrid>
      </Section>
      <Section icon={Briefcase} title={t('employment')} tone={tone}>
        <FieldGrid cols={2}>
          <Field label={t('occupation')} value={displayValue(guardian.job?.occupation)} />
          <Field label={t('employer')} value={displayValue(guardian.job?.employer)} />
          <Field label={t('officePhone')} value={displayValue(guardian.job?.phone)} />
          <Field label={t('fax')} value={displayValue(guardian.job?.fax)} />
          <Field label={t('salary')} value={displayValue(guardian.job?.salary)} />
        </FieldGrid>
      </Section>
      <Section icon={Landmark} title={t('bankInfo')} tone={tone}>
        <FieldGrid cols={2}>
          <Field label={t('bankName')} value={displayValue(guardian.bankInfo?.bankName)} />
          <Field label={t('bankAccount')} value={displayValue(guardian.bankInfo?.bankAccount)} />
        </FieldGrid>
      </Section>
      <Section icon={MapPin} title={t('address')} tone={tone} className="lg:col-span-2">
        <AddressFields address={guardian.address} />
      </Section>
      {extra.length > 0 && (
        <Section icon={ListPlus} title={t('moreDetails')} tone={tone} className="lg:col-span-2">
          <ExtraFields fields={extra} />
        </Section>
      )}
    </div>
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
  const statusLabel = student
    ? (!isBlank(student.statusName) ? String(student.statusName) : labelFor(student.status, t('statusUnknown')))
    : '';
  const gender = genderCode(student?.personal?.gender);
  const genderLabel = gender === 'M' ? t('male') : gender === 'F' ? t('female') : '-';
  const photoSrc = useStudentPhotos([student?.fileProfile]);
  const extra = groupCustomFields(student?.customFields);
  /** P1 = Father, P2 = Mother; any other value is shown as-is */
  const billToLabel = (code: string | undefined) => {
    const c = String(code ?? '').trim().toUpperCase();
    return c === 'P1' ? t('father') : c === 'P2' ? t('mother') : displayValue(code);
  };
  const vaccine = parseVaccine(student?.vaccine);
  const hasVaccine = Object.values(vaccine).some((v) => !isBlank(v));
  const reg = student?.registration;
  const yn = (v: string) => (v === 'yes' ? t('yes') : v === 'no' ? t('no') : '-');
  const withInfo = (answer: string, info: string) =>
    isBlank(info) ? yn(answer) : `${yn(answer)} — ${info}`;
  const medical = reg?.medicalInfo
    ? ([
        ['medConditions', reg.medicalInfo.conditions],
        ['medAllergies', reg.medicalInfo.allergies],
        ['medMedications', reg.medicalInfo.medications],
        ['medSpecialNeeds', reg.medicalInfo.specialNeeds],
      ] as const).filter(([, v]) => !isBlank(v))
    : [];

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
                  <AvatarImage src={photoSrc(student.fileProfile, student.schLogo)} alt={student.name} className="object-cover" />
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
                    <span>{t('school')}: <span className="font-medium text-foreground">{displayValue(schoolName(student))}</span></span>
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
                  [t('billTo'), billToLabel(student.billTo)],
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
          <div className="min-w-0 flex-1 overflow-y-auto">
            {loading || !student ? (
              <div className="space-y-5 p-5 sm:p-6">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ) : (
              <div className="space-y-10 p-5 sm:p-6">
                  <Group icon={User} title={t('personalInfo')} tone={TONE.personal}>
                    <div className="grid gap-5 lg:grid-cols-2">
                      <Section icon={IdCard} title={t('identity')} tone={TONE.personal}>
                        <FieldGrid cols={2}>
                          <Field label={t('gender')} value={genderLabel} />
                          <Field label={t('nationality')} value={humanize(student.personal?.nationality)} />
                          <Field label={t('race')} value={humanize(student.personal?.race)} />
                          <Field label={t('religion')} value={humanize(student.personal?.religion)} />
                          <Field label={t('birthCertNo')} value={displayValue(student.personal?.birthCertNo)} />
                          <Field label={t('birthDate')} value={fmtDate(student.personal?.birthDate)} />
                          <Field label={t('birthPlace')} value={displayValue(student.personal?.birthPlace)} />
                          <Field label={t('bloodType')} value={displayValue(student.personal?.bloodType)} />
                        </FieldGrid>
                      </Section>
                      <Section icon={Contact} title={t('contactInfo')} tone={TONE.personal}>
                        <FieldGrid cols={2}>
                          <Field label={t('phone')} value={displayValue(student.personal?.phone)} />
                          <Field label={t('parentPhone')} value={displayValue(student.personal?.parentPhone)} />
                          <Field label={t('email')} value={displayValue(student.personal?.email)} className="sm:col-span-2" />
                        </FieldGrid>
                      </Section>
                      <Section icon={MapPin} title={t('address')} tone={TONE.personal} className="lg:col-span-2">
                        <AddressFields address={student.personal?.address} />
                      </Section>
                      <Section icon={ClipboardList} title={t('otherDetails')} tone={TONE.personal} className="lg:col-span-2">
                        <FieldGrid>
                          <Field label={t('transportation')} value={displayValue(student.personal?.transportation)} />
                          <Field label={t('illnessAllergic')} value={displayValue(student.personal?.illnessAllergic)} />
                          <Field label={t('previousSchool')} value={displayValue(student.personal?.previousSchool)} />
                          <Field label={t('otherInfo')} value={displayValue(student.personal?.otherInfo)} className="sm:col-span-2 xl:col-span-3" />
                        </FieldGrid>
                      </Section>
                      {extra.student.length > 0 && (
                        <Section icon={ListPlus} title={t('moreDetails')} tone={TONE.personal} className="lg:col-span-2">
                          <ExtraFields fields={extra.student} />
                        </Section>
                      )}
                      <Section icon={BadgeCheck} title={t('additionalInfo')} tone={TONE.personal} className="lg:col-span-2">
                        <div className="flex flex-wrap gap-2">
                          {[...FLAG_KEYS]
                            .sort((a, b) => Number(Boolean(student.personal?.[b])) - Number(Boolean(student.personal?.[a])))
                            .map((key) => {
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
                    </div>
                  </Group>

                  <Group icon={User} title={t('fatherInfo')} tone={TONE.father}>
                    <GuardianTab guardian={student.father} tone={TONE.father} extra={extra.father} />
                  </Group>

                  <Group icon={User} title={t('motherInfo')} tone={TONE.mother}>
                    <GuardianTab guardian={student.mother} tone={TONE.mother} extra={extra.mother} />
                  </Group>

                  <Group icon={Phone} title={t('emergencyContact')} tone={TONE.emergency}>
                    <div className="grid gap-5 lg:grid-cols-2">
                      <Section icon={Contact} title={t('contactInfo')} tone={TONE.emergency} className="lg:col-span-2">
                        <FieldGrid>
                          <Field label={t('name')} value={displayValue(student.emergencyContact?.name)} />
                          <Field label={t('relation')} value={humanize(student.emergencyContact?.relation)} />
                          <Field label={t('email')} value={displayValue(student.emergencyContact?.email)} />
                          <Field label={t('handphone')} value={displayValue(student.emergencyContact?.phone)} />
                          <Field label={t('officePhone')} value={displayValue(student.emergencyContact?.officePhone)} />
                          <Field label={t('fax')} value={displayValue(student.emergencyContact?.fax)} />
                        </FieldGrid>
                      </Section>
                      <Section icon={MapPin} title={t('address')} tone={TONE.emergency} className="lg:col-span-2">
                        <AddressFields address={student.emergencyContact?.address} />
                      </Section>
                      {extra.emergency.length > 0 && (
                        <Section icon={ListPlus} title={t('moreDetails')} tone={TONE.emergency} className="lg:col-span-2">
                          <ExtraFields fields={extra.emergency} />
                        </Section>
                      )}
                    </div>
                  </Group>

                  <Group icon={Users} title={t('siblingsInfo')} tone={TONE.siblings}>
                    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                      {student.siblings && student.siblings.length > 0 ? (
                        <div className="overflow-x-auto">
                          <div className="grid min-w-[560px] grid-cols-[2fr_2fr_1fr_1.3fr_1.3fr] gap-x-6 gap-y-2 text-sm">
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
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('noSiblings')}</p>
                      )}
                    </div>
                  </Group>

                  {extra.other.length > 0 && (
                    <Group icon={ClipboardList} title={t('otherInformation')} tone={TONE.other}>
                      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                        <ExtraFields fields={extra.other} />
                      </div>
                    </Group>
                  )}

                  {hasVaccine && (
                    <Group icon={Syringe} title={t('vaccine')} tone={TONE.other}>
                      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                        <FieldGrid>
                          <Field label={t('mySejahtera')} value={withInfo(vaccine.mySejahtera, vaccine.mySejahteraId)} />
                          <Field label={t('vaccineStatus')} value={withInfo(vaccine.vaccinated, vaccine.notVaccinatedReason)} />
                          <Field label={t('dose1')} value={withInfo(vaccine.dose1, vaccine.dose1Info)} />
                          <Field label={t('dose2')} value={withInfo(vaccine.dose2, vaccine.dose2Info)} />
                          <Field label={t('boosterDose')} value={withInfo(vaccine.booster, vaccine.boosterInfo)} />
                        </FieldGrid>
                      </div>
                    </Group>
                  )}

                  {reg && (
                    <Group icon={FileText} title={t('registration')} tone={TONE.registration}>
                      <div className="grid gap-5 lg:grid-cols-2">
                        <Section icon={FileText} title={t('application')} tone={TONE.registration} className="lg:col-span-2">
                          <FieldGrid>
                            <Field label={t('applicationNo')} value={displayValue(reg.applicationNumber)} />
                            <Field label={t('registrationStatus')} value={humanize(reg.status)} />
                            <Field label={t('registrationForm')} value={displayValue(reg.config?.name)} />
                            <Field label={t('registrationType')} value={humanize(reg.registrationType)} />
                            <Field label={t('academicYear')} value={displayValue(reg.academicYear)} />
                            <Field label={t('submittedAt')} value={fmtDate(reg.submittedAt?.slice(0, 10))} />
                            <Field label={t('syncedAt')} value={fmtDate(reg.syncedAt?.slice(0, 10))} />
                          </FieldGrid>
                        </Section>
                        {medical.length > 0 && (
                          <Section icon={Syringe} title={t('medicalInfo')} tone={TONE.registration} className="lg:col-span-2">
                            <FieldGrid>
                              {medical.map(([key, value]) => (
                                <Field key={key} label={t(key)} value={displayValue(value)} />
                              ))}
                            </FieldGrid>
                          </Section>
                        )}
                      </div>
                    </Group>
                  )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
