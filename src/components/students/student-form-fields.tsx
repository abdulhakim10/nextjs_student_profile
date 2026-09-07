'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Controller,
  useWatch,
  type Control,
  type FieldPath,
  type UseFormRegister,
  type FieldErrors,
} from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import { userService } from '@/services/user.service';
import { useFetchGuard } from '@/hooks/use-fetch-guard';
import { cn } from '@/lib/utils';
import type { UtilityListItem, YesNo } from '@/types';
import type { AddressPrefix, StudentFormValues } from './student-form-types';

export type FormPath = FieldPath<StudentFormValues>;

/* ── Layout ───────────────────────────────────────────────────────────── */

export function FormCard({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border/60 bg-card p-6 shadow-sm', className)}>
      {title && <h3 className="mb-5 text-lg font-semibold">{title}</h3>}
      {children}
    </div>
  );
}

export function Grid({ cols = 2, children, className }: { cols?: 1 | 2 | 3 | 4; children: ReactNode; className?: string }) {
  const colClass = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols];
  return <div className={cn('grid gap-5', colClass, className)}>{children}</div>;
}

export function FieldLabel({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex flex-wrap items-baseline gap-1.5">
      <span>{children}</span>
      {required && <span className="text-destructive">*</span>}
      {hint && <span className="text-xs font-normal text-muted-foreground">({hint})</span>}
    </Label>
  );
}

/** Reads a nested error message for a dotted path. */
function errorAt(errors: FieldErrors<StudentFormValues>, path: string): string | undefined {
  const node = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, errors);
  const msg = (node as { message?: unknown } | undefined)?.message;
  return typeof msg === 'string' ? msg : undefined;
}

/* ── Inputs ───────────────────────────────────────────────────────────── */

interface TextFieldProps {
  name: FormPath;
  label: ReactNode;
  register: UseFormRegister<StudentFormValues>;
  errors?: FieldErrors<StudentFormValues>;
  required?: boolean;
  requiredMessage?: string;
  hint?: string;
  type?: 'text' | 'email' | 'date' | 'number';
  placeholder?: string;
  readOnly?: boolean;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
  className?: string;
}

export function TextField({
  name,
  label,
  register,
  errors,
  required,
  requiredMessage,
  hint,
  type = 'text',
  placeholder,
  readOnly,
  inputMode,
  className,
}: TextFieldProps) {
  const error = errors ? errorAt(errors, name) : undefined;
  return (
    <div className={cn('space-y-2', className)}>
      <FieldLabel htmlFor={name} required={required} hint={hint}>{label}</FieldLabel>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        readOnly={readOnly}
        inputMode={inputMode}
        aria-invalid={!!error}
        className={cn(readOnly && 'bg-muted/40 text-muted-foreground')}
        {...register(name, required ? { required: requiredMessage || true } : undefined)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  register,
  hint,
  rows = 4,
  className,
}: {
  name: FormPath;
  label: ReactNode;
  register: UseFormRegister<StudentFormValues>;
  hint?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <FieldLabel htmlFor={name} hint={hint}>{label}</FieldLabel>
      <Textarea id={name} rows={rows} className="resize-y" {...register(name)} />
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: FormPath;
  label: ReactNode;
  control: Control<StudentFormValues>;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  requiredMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Keep the current value selectable even if it is not in `options`. */
  allowUnknown?: boolean;
}

export function SelectField({
  name,
  label,
  control,
  options,
  placeholder,
  required,
  requiredMessage,
  disabled,
  className,
  allowUnknown = true,
}: SelectFieldProps) {
  const { t } = useTranslation('students');
  return (
    <div className={cn('space-y-2', className)}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        rules={required ? { required: requiredMessage || true } : undefined}
        render={({ field, fieldState }) => {
          const current = typeof field.value === 'string' ? field.value : '';
          const list =
            allowUnknown && current && !options.some((o) => o.value === current)
              ? [{ value: current, label: current }, ...options]
              : options;
          return (
            <>
              <Select value={current || undefined} onValueChange={field.onChange} disabled={disabled}>
                <SelectTrigger className="w-full" aria-invalid={!!fieldState.error}>
                  <SelectValue placeholder={placeholder ?? t('selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {list.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error?.message && (
                <p className="text-xs text-destructive">{String(fieldState.error.message)}</p>
              )}
            </>
          );
        }}
      />
    </div>
  );
}

/** Yes / No radio pair with an optional companion input shown to the right. */
export function YesNoField({
  name,
  label,
  control,
  companion,
}: {
  name: FormPath;
  label: ReactNode;
  control: Control<StudentFormValues>;
  companion?: ReactNode;
}) {
  const { t } = useTranslation('students');
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-end">
      <div className="space-y-2">
        <Label>{label}</Label>
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <div className="flex h-9 items-center gap-8">
              {(['yes', 'no'] as YesNo[]).map((opt) => (
                <label key={opt} className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="h-4 w-4 accent-primary"
                    name={name}
                    value={opt}
                    checked={field.value === opt}
                    onChange={() => field.onChange(opt)}
                  />
                  {opt === 'yes' ? t('yes') : t('no')}
                </label>
              ))}
            </div>
          )}
        />
      </div>
      {companion}
    </div>
  );
}

/* ── Lookup hooks ─────────────────────────────────────────────────────── */

const names = (items: UtilityListItem[]) => items.map((i) => i.prm).filter((p): p is string => !!p);

let countryCache: string[] | null = null;

/** Country names from the utilities API (shared cache). */
export function useCountryOptions(): string[] {
  const [countries, setCountries] = useState<string[]>(countryCache ?? []);
  useEffect(() => {
    if (countryCache) return;
    userService
      .getCountryList()
      .then((res) => {
        countryCache = res.success && res.data ? names(res.data) : [];
        setCountries(countryCache);
      })
      .catch(() => setCountries([]));
  }, []);
  return countries;
}

/**
 * Generic dependent lookup: re-runs `fetcher` whenever `key` changes and
 * returns an empty list while `key` is falsy.
 */
function useDependentOptions(
  key: string,
  fetcher: (key: string) => Promise<{ success: boolean; data: UtilityListItem[] }>
): { options: string[]; loading: boolean } {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const guard = useFetchGuard();

  const load = useCallback(
    async (k: string) => {
      const id = guard.begin();
      if (!k) {
        setOptions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetcher(k);
        if (guard.isStale(id)) return;
        setOptions(res.success && res.data ? names(res.data) : []);
      } catch {
        if (!guard.isStale(id)) setOptions([]);
      } finally {
        if (!guard.isStale(id)) setLoading(false);
      }
    },
    [guard, fetcher]
  );

  useEffect(() => {
    load(key);
  }, [key, load]);

  return { options, loading };
}

const fetchStates = (country: string) => userService.getStateList(country);
const fetchDistricts = (state: string) => userService.getDistrictList(state);

export const toOptions = (list: string[]): SelectOption[] => list.map((v) => ({ value: v, label: v }));

/* ── Address ──────────────────────────────────────────────────────────── */

/**
 * Address block matching the staff module: Country → State → City /
 * District cascading dropdowns, then Line-1, Line-2 and Postcode.
 */
export function AddressBlock({
  prefix,
  control,
  register,
  title,
}: {
  prefix: AddressPrefix;
  control: Control<StudentFormValues>;
  register: UseFormRegister<StudentFormValues>;
  title?: ReactNode;
}) {
  const { t } = useTranslation('students');
  const country = useWatch({ control, name: `${prefix}.country` }) ?? '';
  const state = useWatch({ control, name: `${prefix}.state` }) ?? '';

  const countries = useCountryOptions();
  const { options: states, loading: statesLoading } = useDependentOptions(country, fetchStates);
  const fetchCities = useCallback(
    (st: string) => userService.getCityList(st, country),
    [country]
  );
  const { options: cities, loading: citiesLoading } = useDependentOptions(state, fetchCities);
  const { options: districts, loading: districtsLoading } = useDependentOptions(state, fetchDistricts);

  return (
    <div className="space-y-5">
      {title && <h4 className="text-base font-semibold">{title}</h4>}
      <Grid cols={3}>
        <SelectField
          name={`${prefix}.country`}
          label={t('country')}
          control={control}
          options={toOptions(countries)}
          placeholder={t('selectCountry')}
        />
        <SelectField
          name={`${prefix}.state`}
          label={t('state')}
          control={control}
          options={toOptions(states)}
          placeholder={t('selectState')}
          disabled={!country || statesLoading}
        />
        <SelectField
          name={`${prefix}.city`}
          label={t('city')}
          control={control}
          options={toOptions(cities)}
          placeholder={t('selectCity')}
          disabled={!state || citiesLoading}
        />
        <SelectField
          name={`${prefix}.district`}
          label={t('district')}
          control={control}
          options={toOptions(districts)}
          placeholder={t('selectDistrict')}
          disabled={!state || districtsLoading}
        />
        <TextField name={`${prefix}.line1`} label={t('line1')} register={register} />
        <TextField name={`${prefix}.line2`} label={t('line2')} register={register} />
        <TextField name={`${prefix}.postcode`} label={t('postcode')} register={register} inputMode="numeric" />
      </Grid>
    </div>
  );
}
