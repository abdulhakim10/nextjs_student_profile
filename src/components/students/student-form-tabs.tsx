'use client';

import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import { userService } from '@/services/user.service';
import { cn } from '@/lib/utils';
import type { BranchListItem, StudentCustomField, StudentStatusItem } from '@/types';
import { Check, Plus, X } from 'lucide-react';
import { useStudentLevels } from './use-student-levels';
import { cleanLabel, humanize } from './student-helpers';
import {
  AddressBlock,
  FieldLabel,
  FormCard,
  Grid,
  SelectField,
  TextAreaField,
  TextField,
  YesNoField,
  toOptions,
  useCountryOptions,
} from './student-form-fields';
import {
  customFieldKey,
  EMPTY_SIBLING,
  FLAG_KEYS,
  type GuardianPrefix,
  type StudentFormValues,
} from './student-form-types';

interface TabProps {
  form: UseFormReturn<StudentFormValues>;
}

/* ── 1. Administration ─────────────────────────────────────────────────── */

/** Titled block inside a form card, separated by a hairline. */
function SubGroup({ title, first, children }: { title: string; first?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn(!first && 'mt-8 border-t border-border/60 pt-6')}>
      <h4 className="mb-4 text-sm font-semibold">{title}</h4>
      {children}
    </section>
  );
}

export function AdministrationTab({
  form,
  statuses,
  systemNo,
}: TabProps & { statuses: StudentStatusItem[]; systemNo: string }) {
  const { t } = useTranslation('students');
  const { register, control, formState: { errors } } = form;
  const [branches, setBranches] = useState<BranchListItem[]>([]);

  useEffect(() => {
    userService
      .getBranchList()
      .then((res) => setBranches(res.success && res.data ? res.data : []))
      .catch(() => setBranches([]));
  }, []);

  const statusOptions = statuses.map((s) => ({ value: String(s.status), label: s.statusName }));
  const flags = useWatch({ control, name: 'personal.flags' });
  const selectedFlags = FLAG_KEYS.filter((k) => flags?.[k]).length;
  const branch = useWatch({ control, name: 'branch' });
  const { levels } = useStudentLevels(branch || undefined);
  const levelOptions = levels.map((l) => ({ value: l.educationLevel, label: l.educationLevelName }));

  return (
    <FormCard title={t('administration')}>
      {/* Full-width groups, each an even grid — no column can end early */}
      <SubGroup title={t('enrollment')} first>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            name="branch"
            label={t('school')}
            control={control}
            options={branches.map((b) => ({ value: b.sid, label: b.name }))}
          />
          <div className="space-y-2">
            <Label htmlFor="systemNo">{t('systemNo')}</Label>
            <Input id="systemNo" value={systemNo} readOnly className="bg-muted/40 text-muted-foreground" />
          </div>
          <TextField name="matric" label={t('matric')} register={register} />
          <TextField name="academicYear" label={t('intake')} register={register} inputMode="numeric" />
          <SelectField name="educationLevel" label={t('educationLevel')} control={control} options={levelOptions} />
          <SelectField name="status" label={t('status')} control={control} options={statusOptions} />
          <TextField name="registerNo" label={t('registerNo')} register={register} />
          <TextField name="registerDate" label={t('registeredOn')} register={register} type="date" />
          <TextField name="endDate" label={t('endDate')} register={register} type="date" />
        </div>
      </SubGroup>

      <SubGroup title={t('identityTravel')}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField name="ic" label={t('ic')} register={register} />
          <TextField name="passportExpiry" label={t('passportExpiry')} register={register} type="date" />
          <TextField name="visaNo" label={t('visaNo')} register={register} />
          <TextField name="visaExpiry" label={t('visaExpiry')} register={register} type="date" />
        </div>
      </SubGroup>

      <SubGroup title={t('accountBilling')}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField name="schoolAccount" label={t('schoolAccount')} register={register} errors={errors} />
          <TextField name="sponsored" label={t('sponsored')} register={register} />
          <SelectField
            name="billTo"
            label={t('billTo')}
            control={control}
            options={[
              { value: 'P1', label: t('father') },
              { value: 'P2', label: t('mother') },
            ]}
          />
          <TextField name="personal.otherInfo" label={t('otherInfo')} register={register} />
        </div>
      </SubGroup>

      {/* Flags — full width, even tiles, with a selected count */}
      <section className="mt-8 border-t border-border/60 pt-6" aria-labelledby="admin-flags-title">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h4 id="admin-flags-title" className="text-sm font-semibold">{t('additionalInfo')}</h4>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('flagsSelected').replace('{n}', String(selectedFlags)).replace('{total}', String(FLAG_KEYS.length))}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {FLAG_KEYS.map((key) => (
            <Controller
              key={key}
              control={control}
              name={`personal.flags.${key}`}
              render={({ field }) => {
                const on = Boolean(field.value);
                return (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => field.onChange(!on)}
                    title={t(key)}
                    className={cn(
                      'group flex h-11 w-full items-center gap-2.5 rounded-lg border px-3 text-left text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                      on
                        ? 'border-primary/50 bg-primary/10 font-medium text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 bg-background'
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="truncate">{t(key)}</span>
                  </button>
                );
              }}
            />
          ))}
        </div>
      </section>
    </FormCard>
  );
}

/* ── 2. Student Information ────────────────────────────────────────────── */

export function StudentInfoTab({ form }: TabProps) {
  const { t } = useTranslation('students');
  const { register, control, formState: { errors } } = form;
  const countries = useCountryOptions();

  return (
    <FormCard title={t('studentInfo')}>
      {/* Groups of whole rows — no wide field leaves a hole */}
      <SubGroup title={t('identity')} first>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            name="name"
            label={t('name')}
            register={register}
            errors={errors}
            required
            requiredMessage={t('nameRequired')}
            className="sm:col-span-2"
          />
          <SelectField
            name="personal.gender"
            label={t('gender')}
            control={control}
            options={[
              { value: '1', label: t('male') },
              { value: '0', label: t('female') },
            ]}
            allowUnknown={false}
          />
          <TextField name="personal.race" label={t('race')} register={register} />
          <TextField name="personal.religion" label={t('religion')} register={register} />
          <SelectField
            name="personal.nationality"
            label={t('nationality')}
            control={control}
            options={toOptions(countries)}
          />
          <TextField name="personal.birthDate" label={t('birthDate')} register={register} type="date" />
          <TextField name="personal.birthPlace" label={t('birthPlace')} register={register} />
          <TextField name="personal.birthCertNo" label={t('birthCertNo')} register={register} />
        </div>
      </SubGroup>

      <SubGroup title={t('contactHealth')}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TextField name="personal.phone" label={t('houseTelephone')} register={register} inputMode="tel" />
          <TextField name="personal.email" label={t('emailStudent')} register={register} type="email" />
          <TextField name="personal.bloodType" label={t('bloodType')} register={register} />
          <TextField name="personal.transportation" label={t('transportation')} register={register} />
          <TextField name="personal.previousSchool" label={t('previousSchool')} register={register} />
          <TextField name="personal.illnessAllergic" label={t('illnessAllergic')} register={register} />
        </div>
      </SubGroup>

      <div className="mt-8 border-t border-border/60 pt-6">
        <AddressBlock prefix="personal.address" control={control} register={register} title={t('billingAddress')} />
      </div>
    </FormCard>
  );
}

/* ── 3 & 4. Father / Mother ────────────────────────────────────────────── */

export function GuardianTab({ form, prefix, title }: TabProps & { prefix: GuardianPrefix; title: string }) {
  const { t } = useTranslation('students');
  const { register, control, formState: { errors } } = form;
  const countries = useCountryOptions();
  const isFather = prefix === 'father';

  return (
    <FormCard title={title}>
      <Grid cols={3}>
        <TextField
          name={`${prefix}.name`}
          label={t('name')}
          register={register}
          errors={errors}
          required={isFather}
          requiredMessage={t('fieldRequired')}
        />
        <TextField
          name={`${prefix}.ic`}
          label={t('icNumber')}
          hint={t('icHint')}
          register={register}
          errors={errors}
          required={isFather}
          requiredMessage={t('fieldRequired')}
        />
        <TextField
          name={`${prefix}.tin`}
          label={t('tin')}
          register={register}
          errors={errors}
          required
          requiredMessage={t('fieldRequired')}
        />
        <SelectField
          name={`${prefix}.nationality`}
          label={t('nationality')}
          control={control}
          options={toOptions(countries)}
          required={isFather}
          requiredMessage={t('fieldRequired')}
        />
        <TextField name={`${prefix}.birthPlace`} label={t('birthPlace')} register={register} />
        <TextField name={`${prefix}.phone`} label={t('handphone')} register={register} inputMode="tel" />
        <TextField name={`${prefix}.email`} label={t('email')} register={register} type="email" />
        <TextField name={`${prefix}.job.phone`} label={t('officePhone')} register={register} inputMode="tel" />
        <TextField name={`${prefix}.job.fax`} label={t('fax')} register={register} />
        <TextField name={`${prefix}.job.occupation`} label={t('occupation')} register={register} />
        <TextField name={`${prefix}.job.employer`} label={t('employer')} register={register} />
        <TextField name={`${prefix}.job.salary`} label={t('salaryRm')} register={register} inputMode="decimal" />
        <TextField name={`${prefix}.bankInfo.bankName`} label={t('bankName')} register={register} />
        <TextField name={`${prefix}.bankInfo.bankAccount`} label={t('bankAccount')} register={register} />
      </Grid>
      <div className="mt-8 border-t border-border/60 pt-6">
        <AddressBlock prefix={`${prefix}.address`} control={control} register={register} title={t('address')} />
      </div>
    </FormCard>
  );
}

/* ── 5. Siblings ───────────────────────────────────────────────────────── */

/** minmax(0, …) lets the inputs shrink with the card instead of overflowing it. */
const SIBLING_COLS =
  'md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_2rem] md:gap-3';

export function SiblingsTab({ form }: TabProps) {
  const { t } = useTranslation('students');
  const { register, control, getValues, formState: { errors } } = form;
  const siblings = useFieldArray({ control, name: 'siblings' });
  const siblingColumns = [
    ['name', t('siblingName')],
    ['school', t('siblingSchool')],
    ['birthYear', t('siblingBirthYear')],
    ['ic', t('siblingIc')],
    ['relation', t('siblingRelation')],
  ] as const;

  return (
    <FormCard title={t('siblingsInfo')}>
      <div className="rounded-xl border border-border/70">
        <div className={cn(SIBLING_COLS, 'hidden rounded-t-xl border-b border-border/70 bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid')}>
          {siblingColumns.map(([, label]) => <span key={label}>{label}</span>)}
          <span className="sr-only">{t('remove')}</span>
        </div>
        {siblings.fields.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t('noSiblings')}</p>
        ) : (
          siblings.fields.map((f, i) => (
            <div
              key={f.id}
              className={cn(SIBLING_COLS, 'relative grid gap-3 border-b border-border/70 py-3 pl-4 pr-12 last:border-b-0 md:items-center md:pr-4')}
            >
              {siblingColumns.map(([field, label]) => (
                <div key={field} className="min-w-0 space-y-1 md:space-y-0">
                  <Label className="text-xs text-muted-foreground md:sr-only">{label}</Label>
                  <Input
                    aria-label={label}
                    aria-invalid={field === 'name' && Boolean(errors.siblings?.[i]?.name)}
                    {...(field === 'birthYear' ? { inputMode: 'numeric' as const, maxLength: 4 } : {})}
                    {...register(
                      `siblings.${i}.${field}`,
                      field === 'name'
                        ? {
                            // the API requires a name on every sibling it saves
                            validate: (val) => {
                              const row = getValues(`siblings.${i}`);
                              const hasOther = Boolean(row.school || row.birthYear || row.ic || row.relation);
                              return !hasOther || Boolean(String(val).trim()) || t('siblingNameRequired');
                            },
                          }
                        : undefined
                    )}
                  />
                  {field === 'name' && errors.siblings?.[i]?.name?.message && (
                    <p className="text-xs text-destructive">{String(errors.siblings[i]?.name?.message)}</p>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${t('remove')} ${i + 1}`}
                title={t('remove')}
                onClick={() => siblings.remove(i)}
                className="absolute right-2 top-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:static md:justify-self-center"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => siblings.append({ ...EMPTY_SIBLING })}>
        <Plus className="mr-1.5 h-4 w-4" />
        {t('addRow')}
      </Button>
    </FormCard>
  );
}

/* ── 6. Emergency Contact ──────────────────────────────────────────────── */

export function EmergencyTab({ form }: TabProps) {
  const { t } = useTranslation('students');
  const { register, control } = form;

  return (
    <FormCard title={t('emergencyContact')}>
      <Grid cols={3}>
        <TextField name="emergencyContact.name" label={t('name')} register={register} />
        <TextField name="emergencyContact.ic" label={t('icNumber')} hint={t('icHint')} register={register} />
        <TextField name="emergencyContact.relation" label={t('relation')} register={register} />
        <TextField name="emergencyContact.email" label={t('email')} register={register} type="email" />
        <TextField name="emergencyContact.officePhone" label={t('officePhone')} register={register} inputMode="tel" />
        <TextField name="emergencyContact.phone" label={t('hp')} register={register} inputMode="tel" />
        <TextField name="emergencyContact.fax" label={t('fax')} register={register} />
      </Grid>
      <div className="mt-8 border-t border-border/60 pt-6">
        <AddressBlock prefix="emergencyContact.address" control={control} register={register} title={t('address')} />
      </div>
    </FormCard>
  );
}

/* ── 7. Vaccine ────────────────────────────────────────────────────────── */

export function VaccineTab({ form }: TabProps) {
  const { t } = useTranslation('students');
  const { register, control } = form;
  const mySejahtera = useWatch({ control, name: 'vaccine.mySejahtera' });
  const vaccinated = useWatch({ control, name: 'vaccine.vaccinated' });
  const dose1 = useWatch({ control, name: 'vaccine.dose1' });
  const dose2 = useWatch({ control, name: 'vaccine.dose2' });
  const booster = useWatch({ control, name: 'vaccine.booster' });

  return (
    <FormCard title={t('vaccine')}>
      <div className="space-y-7">
        <YesNoField
          name="vaccine.mySejahtera"
          label={t('mySejahteraId')}
          control={control}
          companion={
            <Input
              placeholder={t('mySejahteraPlaceholder')}
              disabled={mySejahtera !== 'yes'}
              {...register('vaccine.mySejahteraId')}
            />
          }
        />
        <YesNoField
          name="vaccine.vaccinated"
          label={t('vaccineStatus')}
          control={control}
          companion={
            <Input
              placeholder={t('vaccineReasonPlaceholder')}
              disabled={vaccinated !== 'no'}
              {...register('vaccine.notVaccinatedReason')}
            />
          }
        />
        <YesNoField
          name="vaccine.dose1"
          label={t('dose1')}
          control={control}
          companion={
            <Input placeholder={t('vaccineInfoPlaceholder')} disabled={dose1 !== 'yes'} {...register('vaccine.dose1Info')} />
          }
        />
        <YesNoField
          name="vaccine.dose2"
          label={t('dose2')}
          control={control}
          companion={
            <Input placeholder={t('vaccineInfoPlaceholder')} disabled={dose2 !== 'yes'} {...register('vaccine.dose2Info')} />
          }
        />
        <YesNoField
          name="vaccine.booster"
          label={t('boosterDose')}
          control={control}
          companion={
            <Input placeholder={t('vaccineInfoPlaceholder')} disabled={booster !== 'yes'} {...register('vaccine.boosterInfo')} />
          }
        />
      </div>
    </FormCard>
  );
}

/* ── 7. Custom fields ──────────────────────────────────────────────────── */

const CUSTOM_SECTION_ORDER = [
  'student_profile',
  'guardian_father',
  'guardian_mother',
  'emergency_contact',
  'custom_fields',
  'others',
] as const;

const CUSTOM_SECTION_LABEL: Record<string, string> = {
  student_profile: 'studentInfo',
  guardian_father: 'fatherInfo',
  guardian_mother: 'motherInfo',
  emergency_contact: 'emergencyContact',
  custom_fields: 'registrationForm',
  others: 'legacyFields',
};

/**
 * The school's own fields, rendered from the details API's `customFields`
 * definitions (type, options). Saved via PUT /profile/custom-fields —
 * only changed values are sent. `required` is shown but not enforced: much
 * existing data predates those rules and would otherwise block every save.
 */
export function CustomFieldsTab({ form, fields }: TabProps & { fields: StudentCustomField[] }) {
  const { t } = useTranslation('students');
  const { register, control } = form;

  const groups = CUSTOM_SECTION_ORDER.map((section) => ({
    section,
    fields: fields.filter((f) => f.section === section),
  }))
    .concat([{ section: 'other' as never, fields: fields.filter((f) => !(CUSTOM_SECTION_ORDER as readonly string[]).includes(f.section)) }])
    .filter((g) => g.fields.length > 0);

  if (!groups.length) {
    return (
      <FormCard title={t('otherInformation')}>
        <p className="text-sm text-muted-foreground">{t('noCustomFields')}</p>
      </FormCard>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <FormCard key={g.section} title={t(CUSTOM_SECTION_LABEL[g.section] ?? 'otherInformation')}>
          <Grid cols={2}>
            {g.fields.map((f) => {
              const name = `customFields.${customFieldKey(f.section, f.name)}` as const;
              const label = (
                <>
                  {cleanLabel(f.label) || humanize(f.name)}
                  {f.required && <span className="ml-0.5 text-destructive">*</span>}
                </>
              );
              const options = (f.options ?? []).map((o) => ({ value: o, label: o }));
              if (f.type === 'select' && options.length) {
                return <SelectField key={name} name={name} label={label} control={control} options={options} />;
              }
              if (f.type === 'radio' && options.length) {
                return (
                  <Controller
                    key={name}
                    control={control}
                    name={name}
                    render={({ field }) => (
                      <div className="space-y-2 sm:col-span-2">
                        <FieldLabel>{label}</FieldLabel>
                        <div role="radiogroup" className="flex flex-wrap gap-2">
                          {options.map((o) => {
                            const on = field.value === o.value;
                            return (
                              <button
                                key={o.value}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => field.onChange(on ? '' : o.value)}
                                className={cn(
                                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                                  on
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:bg-muted'
                                )}
                              >
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  />
                );
              }
              if (f.type === 'textarea') {
                return <TextAreaField key={name} name={name} label={label} register={register} className="sm:col-span-2" />;
              }
              return <TextField key={name} name={name} label={label} register={register} />;
            })}
          </Grid>
        </FormCard>
      ))}
    </div>
  );
}
