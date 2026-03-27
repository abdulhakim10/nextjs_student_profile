'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { adminSettingsService } from '@/services/admin-settings.service';
import type {
  EmployeeProfileListItem,
  EmployeeProfileItem,
  EmployeeProfilePayload,
  AttendanceGroupItem,
  WorkingPolicyItem,
  UserListItem,
} from '@/types';

interface EmployeeProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  staff?: UserListItem | null;
  profile?: EmployeeProfileListItem | null;
  onSubmit: (payload: EmployeeProfilePayload) => Promise<void>;
}

interface FormState {
  attendance_group_code: string;
  ot_policy_code: string;
  override_schedule_enabled: boolean;
}

const defaultForm: FormState = {
  attendance_group_code: '',
  ot_policy_code: '',
  override_schedule_enabled: false,
};

export function EmployeeProfileFormDialog({
  open,
  onOpenChange,
  sid,
  staff,
  profile,
  onSubmit,
}: EmployeeProfileFormDialogProps) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const [groups, setGroups] = useState<AttendanceGroupItem[]>([]);
  const [workingPolicies, setWorkingPolicies] = useState<WorkingPolicyItem[]>([]);

  const isEdit = !!profile;

  // Load dropdown data + individual profile when dialog opens
  useEffect(() => {
    if (!open || !sid) return;

    let cancelled = false;
    setLoadingDropdowns(true);
    setError('');

    const groupsPromise = adminSettingsService.getGroupList(sid);
    const policiesPromise = adminSettingsService.getWorkingPolicyList(sid);
    const profilePromise = profile && staff?.uid
      ? adminSettingsService.getEmployeeProfile(staff.uid, sid).catch(() => null)
      : Promise.resolve(null);

    Promise.all([groupsPromise, policiesPromise, profilePromise])
      .then(([groupRes, policyRes, profileDetail]) => {
        if (cancelled) return;
        setGroups(groupRes.data ?? []);
        setWorkingPolicies(policyRes.data ?? []);

        // Initialize form with profile data including OT policy from detail endpoint
        const detail: EmployeeProfileItem | undefined = profileDetail?.data;
        setForm({
          attendance_group_code: profile?.attendanceGroupCode || '',
          ot_policy_code: detail?.override?.otPolicyCode ?? '',
          override_schedule_enabled: !!detail?.overrideScheduleEnabled,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('failedLoadDropdown'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDropdowns(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sid, profile, staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!staff?.uid) {
      setError(t('noEmployeeSelected'));
      return;
    }

    if (!form.attendance_group_code) {
      setError(t('attendanceGroupRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload: EmployeeProfilePayload = {
        uid: [staff.uid],
        sid,
        attendance_group_code: form.attendance_group_code,
        ot_policy_code: form.ot_policy_code || undefined,
        override_schedule_enabled: form.override_schedule_enabled,
      };

      await onSubmit(payload);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedSaveProfile'));
    } finally {
      setSaving(false);
    }
  };

  const renderDropdownSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('editProfile') : t('assignProfile')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Staff Info (read-only) */}
          {staff && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <Avatar className="h-10 w-10 rounded-xl">
                <AvatarImage src={staff.profileImage} alt={staff.name} />
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/80 to-primary/40 text-white text-sm font-medium">
                  {staff.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-none">{staff.name}</p>
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {staff.uid} — {staff.email}
                </p>
              </div>
            </div>
          )}

          {loadingDropdowns ? (
            <div className="space-y-4">
              {renderDropdownSkeleton()}
              {renderDropdownSkeleton()}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>{t('attendanceGroupLabel')} *</Label>
                <Select
                  value={form.attendance_group_code}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, attendance_group_code: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectAttendanceGroup')} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.code} value={g.code}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('otPolicyOverride')}</Label>
                <Select
                  value={form.ot_policy_code || '__none__'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, ot_policy_code: v === '__none__' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectOtPolicy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('noneGroupDefault')}</SelectItem>
                    {workingPolicies.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="ep-override-sched">Override Schedule</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable per-date schedule for this employee (e.g. security guards)
                  </p>
                </div>
                <Switch
                  id="ep-override-sched"
                  checked={form.override_schedule_enabled}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, override_schedule_enabled: v }))
                  }
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={saving || loadingDropdowns}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? t('update') : t('assign')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
