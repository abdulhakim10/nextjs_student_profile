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
import { cn } from '@/lib/utils';
import type { StudentDetail } from '@/types';
import { initials, statusTone, STATUS_TONE_CLASS } from './student-helpers';
import { toFormValues, toPayload, type StudentFormValues } from './student-form-types';
import { useStudentStatuses } from './use-student-statuses';
import {
  AdministrationTab,
  StudentInfoTab,
  GuardianTab,
  SiblingsTab,
  EmergencyTab,
  VaccineTab,
} from './student-form-tabs';
import {
  X,
  Settings2,
  ShieldCheck,
  User,
  UserRound,
  Users,
  Phone,
  Syringe,
  Loader2,
  Upload,
  type LucideIcon,
} from 'lucide-react';

type TabKey = 'administration' | 'student' | 'father' | 'mother' | 'siblings' | 'emergency' | 'vaccine';

type TabLabelKey =
  | 'administration'
  | 'studentInfo'
  | 'fatherInfo'
  | 'motherInfo'
  | 'siblingsInfo'
  | 'emergencyContact'
  | 'vaccine';

const TABS: { key: TabKey; icon: LucideIcon; labelKey: TabLabelKey }[] = [
  { key: 'administration', icon: Settings2, labelKey: 'administration' },
  { key: 'student', icon: ShieldCheck, labelKey: 'studentInfo' },
  { key: 'father', icon: User, labelKey: 'fatherInfo' },
  { key: 'mother', icon: UserRound, labelKey: 'motherInfo' },
  { key: 'siblings', icon: Users, labelKey: 'siblingsInfo' },
  { key: 'emergency', icon: Phone, labelKey: 'emergencyContact' },
  { key: 'vaccine', icon: Syringe, labelKey: 'vaccine' },
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
  vaccine: 'vaccine',
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<StudentFormValues>({ defaultValues: toFormValues(null) });
  const { reset, handleSubmit, watch, formState: { isSubmitting } } = form;

  const targetUid = initialData?.uid ?? uid ?? null;
  const student = initialData ?? loaded;

  useEffect(() => {
    if (!open) return;
    setTab('administration');
    setImagePreview(null);

    if (mode === 'create') {
      setLoaded(null);
      reset(toFormValues(null));
      return;
    }
    if (initialData) {
      setLoaded(null);
      reset(toFormValues(initialData));
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
          reset(toFormValues(res.data));
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

  const onSubmit = async (values: StudentFormValues) => {
    try {
      const payload = toPayload(values, targetUid ?? undefined);
      const res =
        mode === 'edit' && targetUid
          ? await studentService.update(targetUid, payload)
          : await studentService.create(payload);
      if (!res.success) throw new Error(res.message);
      toast.success(t('saved'));
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(t('saveFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
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
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const watchedName = watch('name');
  const watchedStatus = watch('status');
  const watchedBranch = watch('branch');
  const displayName = watchedName || student?.name || t('createTitle');
  const avatarSrc = imagePreview ?? student?.fileProfile ?? undefined;
  const systemNo = student?.systemNo || targetUid || '';

  const { statuses, labelFor } = useStudentStatuses(watchedBranch || (student ? String(student.branch) : undefined));

  const tabContent: Record<TabKey, () => ReactNode> = {
    administration: () => <AdministrationTab form={form} statuses={statuses} systemNo={systemNo} />,
    student: () => <StudentInfoTab form={form} />,
    father: () => <GuardianTab form={form} prefix="father" title={t('fatherInfo')} />,
    mother: () => <GuardianTab form={form} prefix="mother" title={t('motherInfo')} />,
    siblings: () => <SiblingsTab form={form} />,
    emergency: () => <EmergencyTab form={form} />,
    vaccine: () => <VaccineTab form={form} />,
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
          <nav className="flex shrink-0 items-stretch border-b border-border/60 bg-muted/20">
            {TABS.map(({ key, icon: Icon, labelKey }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs lg:flex-row lg:gap-2 lg:text-sm',
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
                {student?.course && (
                  <p><span className="text-muted-foreground">{t('course')}:</span> {student.course}</p>
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
