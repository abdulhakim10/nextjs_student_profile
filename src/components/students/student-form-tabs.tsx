'use client';

import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/i18n';
import { userService } from '@/services/user.service';
import { cn } from '@/lib/utils';
import type { BranchListItem, StudentStatusItem } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import {
  AddressBlock,
  FormCard,
  Grid,
  SelectField,
  TextField,
  YesNoField,
  toOptions,
  useCountryOptions,
} from './student-form-fields';
import {
  EMPTY_SIBLING,
  FLAG_KEYS,
  type GuardianPrefix,
  type StudentFormValues,
} from './student-form-types';

interface TabProps {
  form: UseFormReturn<StudentFormValues>;
}

/* ── 1. Administration ─────────────────────────────────────────────────── */

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

  return (
    <FormCard title={t('administration')}>
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-5">
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
          <Grid cols={2}>
            <TextField name="academicYear" label={t('intake')} register={register} inputMode="numeric" />
            <SelectField name="status" label={t('status')} control={control} options={statusOptions} />
            <TextField name="registerDate" label={t('registeredOn')} register={register} type="date" />
            <TextField name="endDate" label={t('endDate')} register={register} type="date" />
            <TextField name="ic" label={t('ic')} register={register} />
            <TextField name="passportExpiry" label={t('passportExpiry')} register={register} type="date" />
            <TextField name="visaNo" label={t('visaNo')} register={register} />
            <TextField name="visaExpiry" label={t('visaExpiry')} register={register} type="date" />
          </Grid>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <TextField name="schoolAccount" label={t('schoolAccount')} register={register} errors={errors} />
          <TextField name="registerNo" label={t('registerNo')} register={register} />
          <TextField name="personal.otherInfo" label={t('otherInfo')} register={register} />
          <TextField name="sponsored" label={t('sponsored')} register={register} />
          <TextField name="billTo" label={t('billTo')} register={register} />

          <div className="grid gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-3">
            {FLAG_KEYS.map((key) => (
              <Controller
                key={key}
                control={control}
                name={`personal.flags.${key}`}
                render={({ field }) => (
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                      field.value ? 'border-primary/40 bg-primary/5' : 'border-border/60 hover:bg-muted/40'
                    )}
                  >
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                    <span>{t(key)}</span>
                  </label>
                )}
              />
            ))}
          </div>
        </div>
      </div>
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
      <Grid cols={3}>
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
        <TextField name="personal.birthDate" label={t('birthDate')} register={register} type="date" />
        <TextField name="personal.birthPlace" label={t('birthPlace')} register={register} />
        <TextField name="personal.birthCertNo" label={t('birthCertNo')} register={register} />
        <SelectField
          name="personal.nationality"
          label={t('nationality')}
          control={control}
          options={toOptions(countries)}
        />
        <TextField name="personal.transportation" label={t('transportation')} register={register} />
        <TextField name="personal.previousSchool" label={t('previousSchool')} register={register} className="sm:col-span-2" />
        <TextField name="personal.illnessAllergic" label={t('illnessAllergic')} register={register} className="sm:col-span-2" />
        <TextField name="personal.phone" label={t('houseTelephone')} register={register} inputMode="tel" />
        <TextField name="personal.parentPhone" label={t('parentPhone')} register={register} inputMode="tel" />
        <TextField name="personal.email" label={t('emailStudent')} register={register} type="email" />
      </Grid>
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
        <TextField name={`${prefix}.academicStatus`} label={t('academicStatus')} register={register} />
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

export function SiblingsTab({ form }: TabProps) {
  const { t } = useTranslation('students');
  const { register, control } = form;
  const siblings = useFieldArray({ control, name: 'siblings' });

  return (
    <FormCard title={t('siblingsInfo')}>
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[2fr_2fr_1fr_1.3fr_1.3fr_40px] gap-3 px-1 pb-2 text-sm font-semibold">
            <span>{t('siblingName')}</span>
            <span>{t('siblingSchool')}</span>
            <span>{t('siblingBirthYear')}</span>
            <span>{t('siblingIc')}</span>
            <span>{t('siblingRelation')}</span>
            <span />
          </div>
          <div className="space-y-2">
            {siblings.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[2fr_2fr_1fr_1.3fr_1.3fr_40px] items-center gap-3">
                <Input {...register(`siblings.${i}.name`)} />
                <Input {...register(`siblings.${i}.school`)} />
                <Input inputMode="numeric" maxLength={4} {...register(`siblings.${i}.birthYear`)} />
                <Input {...register(`siblings.${i}.ic`)} />
                <Input {...register(`siblings.${i}.relation`)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('remove')}
                  disabled={siblings.fields.length === 1}
                  onClick={() => siblings.remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
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
        <TextField name="emergencyContact.telephone" label={t('telephone')} register={register} inputMode="tel" />
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
