'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
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
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useTranslation } from '@/i18n';
import { studentService } from '@/services/student.service';
import { toast } from '@/lib/toast';
import { isAxiosError } from 'axios';
import { cn } from '@/lib/utils';
import type { StudentDetail } from '@/types';
import { initials, schoolName, statusTone, STATUS_TONE_CLASS } from './student-helpers';
import { useStudentPhotos } from './use-student-photos';
import { toFormValues, toPayload, type StudentFormValues } from './student-form-types';
import {
  acceptSection,
  buildMainForm,
  buildSectionBody,
  changedSections,
  type ProfileSection,
} from './student-profile-sections';
import { useStudentStatuses } from './use-student-statuses';
import {
  AdministrationTab,
  StudentInfoTab,
  GuardianTab,
  SiblingsTab,
  EmergencyTab,
  CustomFieldsTab,
} from './student-form-tabs';
import {
  X,
  Settings2,
  ShieldCheck,
  User,
  UserRound,
  Users,
  Phone,
  ListPlus,
  Loader2,
  Upload,
  type LucideIcon,
} from 'lucide-react';

// Vaccine isn't saveable by the profile API, so it has no edit tab (still shown in the view).
type TabKey = 'administration' | 'student' | 'father' | 'mother' | 'siblings' | 'emergency' | 'custom';

type TabLabelKey =
  | 'administration'
  | 'studentInfo'
  | 'fatherInfo'
  | 'motherInfo'
  | 'siblingsInfo'
  | 'emergencyContact'
  | 'otherInformation';

const TABS: { key: TabKey; icon: LucideIcon; labelKey: TabLabelKey }[] = [
  { key: 'administration', icon: Settings2, labelKey: 'administration' },
  { key: 'student', icon: ShieldCheck, labelKey: 'studentInfo' },
  { key: 'father', icon: User, labelKey: 'fatherInfo' },
  { key: 'mother', icon: UserRound, labelKey: 'motherInfo' },
  { key: 'siblings', icon: Users, labelKey: 'siblingsInfo' },
  { key: 'emergency', icon: Phone, labelKey: 'emergencyContact' },
  { key: 'custom', icon: ListPlus, labelKey: 'otherInformation' },
];

/** Which tab owns each top-level field — used to jump to the first validation error. */
const FIELD_TAB: Record<string, TabKey> = {
  branch: 'administration',
  matric: 'administration',
  status: 'administration',
  ic: 'administration',
  name: 'student',
  personal: 'student',
  father: 'father',
  mother: 'mother',
  siblings: 'siblings',
  emergencyContact: 'emergency',
  customFields: 'custom',
};

/** Delete is hidden for now; flip to true to show the footer button again. */
const ENABLE_DELETE = false;

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  /** Edit mode: uid to load when `initialData` is not supplied */
  uid?: string | null;
  /** Edit mode: preloaded detail (skips the fetch) */
  initialData?: StudentDetail | null;
  onSaved: () => void;
  onDeleted: () => void;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  mode,
  uid,
  initialData,
  onSaved,
  onDeleted,
}: StudentFormDialogProps) {
  const { t } = useTranslation('students');
  const { t: tCommon } = useTranslation('common');

  const [tab, setTab] = useState<TabKey>('administration');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<StudentDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  /** Values as last loaded/saved — the diff against it decides which sections to send. */
  const baselineRef = useRef<StudentFormValues | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<StudentFormValues>({ defaultValues: toFormValues(null) });
  const { reset, handleSubmit, watch, formState: { isSubmitting } } = form;

  const targetUid = initialData?.uid ?? uid ?? null;
  const student = initialData ?? loaded;

  useEffect(() => {
    if (!open) return;
    setTab('administration');
    setImagePreview(null);
    setImageFile(null);

    if (mode === 'create') {
      setLoaded(null);
      baselineRef.current = null;
      reset(toFormValues(null));
      return;
    }
    if (initialData) {
      setLoaded(null);
      baselineRef.current = toFormValues(initialData);
      reset(baselineRef.current);
      return;
    }
    if (!uid) return;

    let cancelled = false;
    setLoading(true);
    studentService
      .getDetail(uid)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setLoaded(res.data);
          baselineRef.current = toFormValues(res.data);
          reset(baselineRef.current);
        } else {
          toast.error(t('detailLoadFailed'));
        }
      })
      .catch(() => {
        if (!cancelled) toast.error(t('detailLoadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, uid, initialData, reset, t]);

  /** Readable reason from an API error (message + field errors). */
  const errorText = (err: unknown): string => {
    if (isAxiosError(err)) {
      const data = err.response?.data as { message?: string; errors?: Array<{ message?: string }> } | undefined;
      const details = (data?.errors ?? []).map((e) => e.message).filter(Boolean).join('; ');
      return [data?.message, details].filter(Boolean).join(' — ') || err.message;
    }
    return err instanceof Error ? err.message : String(err);
  };

  const SECTION_LABEL: Record<ProfileSection, Parameters<typeof t>[0]> = {
    main: 'administration',
    personal: 'studentInfo',
    address: 'billingAddress',
    father: 'fatherInfo',
    mother: 'motherInfo',
    emergencyContact: 'emergencyContact',
    siblings: 'siblingsInfo',
    customFields: 'otherInformation',
  };

  /** Edit: send only the changed sections, one endpoint each, in order. */
  const saveSections = async (values: StudentFormValues, uid: string) => {
    let baseline = baselineRef.current ?? toFormValues(student);
    const sections = changedSections(baseline, values, Boolean(imageFile));
    if (!sections.length) {
      toast.info(t('noChanges'));
      onOpenChange(false);
      return;
    }

    const failed: Array<{ section: ProfileSection; reason: string }> = [];
    let savedAny = false;
    // sequential: `main` can change branch / IC that later sections are checked against
    for (const section of sections) {
      try {
        const res =
          section === 'main'
            ? await studentService.updateProfileMain(buildMainForm(uid, values, imageFile, baseline))
            : await studentService.updateProfileSection(
                section,
                buildSectionBody(section, uid, values, {
                  originalGender: student?.personal?.gender,
                  baselineCustomFields: baseline.customFields,
                })
              );
        if (res && res.success === false) throw new Error(res.message);
        baseline = acceptSection(baseline, values, section);
        if (section === 'main') setImageFile(null);
        savedAny = true;
      } catch (err) {
        failed.push({ section, reason: errorText(err) });
      }
    }
    baselineRef.current = baseline;

    if (savedAny) onSaved();
    if (!failed.length) {
      toast.success(t('saved'));
      onOpenChange(false);
      return;
    }
    // keep the dialog open; the next Save re-sends only what failed
    toast.error(
      t('saveFailedSections').replace('{sections}', failed.map((f) => t(SECTION_LABEL[f.section])).join(', ')),
      { description: failed.map((f) => `${t(SECTION_LABEL[f.section])}: ${f.reason}`).join('\n') }
    );
  };

  const onSubmit = async (values: StudentFormValues) => {
    if (mode === 'edit' && targetUid) {
      await saveSections(values, targetUid);
      return;
    }
    try {
      // Create still uses the single create endpoint (not part of the profile API)
      const res = await studentService.create(toPayload(values));
      if (!res.success) throw new Error(res.message);
      toast.success(t('saved'));
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(t('saveFailed'), { description: errorText(err) });
    }
  };

  /** On validation failure, switch to the tab holding the first invalid field. */
  const onInvalid = (errors: Record<string, unknown>) => {
    const first = Object.keys(errors)[0];
    const target = first ? FIELD_TAB[first] : undefined;
    if (target) setTab(target);
  };

  const handleDelete = async () => {
    if (!targetUid) return;
    setDeleting(true);
    try {
      const res = await studentService.delete(targetUid);
      if (!res.success) throw new Error(res.message);
      toast.success(t('deleted'));
      setConfirmDelete(false);
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast.error(t('deleteFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const photoSrc = useStudentPhotos([student?.fileProfile]);
  const watchedName = watch('name');
  const watchedStatus = watch('status');
  const watchedBranch = watch('branch');
  const displayName = watchedName || student?.name || t('createTitle');
  const avatarSrc = imagePreview ?? photoSrc(student?.fileProfile, student?.schLogo);
  const systemNo = student?.systemNo || targetUid || '';

  const { statuses, labelFor } = useStudentStatuses(watchedBranch || (student ? String(student.branch) : undefined));

  const tabContent: Record<TabKey, () => ReactNode> = {
    administration: () => <AdministrationTab form={form} statuses={statuses} systemNo={systemNo} />,
    student: () => <StudentInfoTab form={form} />,
    father: () => <GuardianTab form={form} prefix="father" title={t('fatherInfo')} />,
    mother: () => <GuardianTab form={form} prefix="mother" title={t('motherInfo')} />,
    siblings: () => <SiblingsTab form={form} />,
    emergency: () => <EmergencyTab form={form} />,
    custom: () => <CustomFieldsTab form={form} fields={student?.customFields ?? []} />,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">
            {mode === 'create' ? t('createTitle') : t('editTitle')}
          </DialogTitle>

          {/* ── Header: identity + close ─────────────────────────────── */}
          <div className="flex h-16 shrink-0 items-center gap-4 border-b border-border/60 bg-card px-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0 rounded-full ring-2 ring-background">
                <AvatarImage src={avatarSrc} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t('userId')}: {targetUid ?? '-'}
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label={t('close')}>
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────── */}
          <nav className="grid shrink-0 grid-cols-7 border-b border-border/60 bg-muted/20">
            {TABS.map(({ key, icon: Icon, labelKey }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    'relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs xl:flex-row xl:gap-2 xl:text-sm',
                    active ? 'bg-card text-primary' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-normal">{t(labelKey)}</span>
                  {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
                </button>
              );
            })}
          </nav>

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div className="flex min-h-0 flex-1">
            <aside className="hidden w-60 shrink-0 flex-col items-center gap-5 overflow-y-auto border-r border-border/60 bg-muted/20 p-6 md:flex">
              <Avatar className="h-36 w-36 rounded-full ring-4 ring-background shadow-md">
                <AvatarImage src={avatarSrc} alt={displayName} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-4xl font-semibold text-white">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              <Button type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {t('uploadImage')}
              </Button>

              <div className="w-full space-y-2 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('quickInfo')}</p>
                <p><span className="text-muted-foreground">{t('role')}:</span> {t('roleStudent')}</p>
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('status')}:</span>
                  <Badge className={cn('rounded-full border-0', STATUS_TONE_CLASS[statusTone(watchedStatus)])}>
                    {watchedStatus ? labelFor(watchedStatus, t('statusUnknown')) : '-'}
                  </Badge>
                </p>
                {student?.matric && (
                  <p><span className="text-muted-foreground">{t('matric')}:</span> {student.matric}</p>
                )}
                {schoolName(student) && (
                  <p><span className="text-muted-foreground">{t('school')}:</span> {schoolName(student)}</p>
                )}
              </div>

            </aside>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto bg-muted/10 p-5 sm:p-6">
                {loading ? (
                  <div className="space-y-5">
                    <Skeleton className="h-64 w-full rounded-2xl" />
                    <Skeleton className="h-48 w-full rounded-2xl" />
                  </div>
                ) : (
                  tabContent[tab]()
                )}
              </div>

              <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border/60 bg-card px-6 py-4">
                {ENABLE_DELETE && mode === 'edit' && targetUid && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isSubmitting}
                  >
                    {t('delete')}
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting || loading}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    t('submit')
                  )}
                </Button>
              </footer>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmDesc').replace('{name}', displayName)}
        confirmLabel={t('delete')}
        cancelLabel={tCommon('cancel')}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
