'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { adminSettingsService } from '@/services/admin-settings.service';
import { userService } from '@/services/user.service';
import type { UserListItem, EmployeeProfileListItem } from '@/types';
import { Search, Check, Loader2, UserPlus } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/i18n';

interface StepAssignEmployeesProps {
  sid: string;
  groupCode: string;
  onComplete: () => void;
}

export function StepAssignEmployees({
  sid,
  groupCode,
  onComplete,
}: StepAssignEmployeesProps) {
  const { t } = useTranslation('admin');
  const [employees, setEmployees] = useState<UserListItem[]>([]);
  const [existingProfiles, setExistingProfiles] = useState<EmployeeProfileListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, profileRes] = await Promise.all([
        userService.fetchUsers({ branch: sid, pageLimit: 200 }),
        adminSettingsService.getEmployeeProfileList(sid),
      ]);

      if (empRes.success && empRes.data?.dataset) {
        // Only show active, non-deleted users
        setEmployees(
          empRes.data.dataset.filter((e) => e.isDelete !== 1 && e.statusName !== 'Inactive')
        );
      }
      if (profileRes.success && profileRes.data) {
        setExistingProfiles(profileRes.data);
      }
    } catch {
      toast.error(t('failedLoadEmployees'));
    } finally {
      setLoading(false);
    }
  }, [sid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const alreadyAssignedUids = new Set(existingProfiles.map((p) => p.uid));
  const hasExistingAssignments = existingProfiles.length > 0;

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Employees not yet assigned
  const unassignedEmployees = filteredEmployees.filter(
    (emp) => !alreadyAssignedUids.has(emp.uid)
  );

  const toggleSelect = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(unassignedEmployees.map((e) => e.uid)));
  };

  const handleAssign = async () => {
    if (selected.size === 0) {
      toast.error(t('selectEmployee'));
      return;
    }
    setSaving(true);
    const uids = Array.from(selected);
    let successCount = 0;
    let lastError = '';

    // Process in batches of 3 to avoid overwhelming the backend
    for (let i = 0; i < uids.length; i += 3) {
      const batch = uids.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map((uid) =>
          adminSettingsService.updateEmployeeProfile({
            uid: [uid],
            sid,
            attendance_group_code: groupCode,
            ot_policy_code: '',
          })
        )
      );
      for (const r of results) {
        if (r.status === 'fulfilled') {
          successCount++;
        } else {
          const err = r.reason as { response?: { data?: { message?: string } } };
          lastError = err?.response?.data?.message || String(r.reason);
        }
      }
    }

    setSaving(false);

    if (successCount === uids.length) {
      toast.success(`${successCount} employee${successCount > 1 ? 's' : ''} assigned`);
      onComplete();
    } else if (successCount > 0) {
      toast.success(`${successCount} of ${uids.length} employees assigned`);
      if (lastError) toast.error(lastError);
      onComplete();
    } else {
      toast.error(lastError || 'Failed to assign employees');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Add employees to this group</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select which employees should follow this group&apos;s schedule and rules. You can always change this later.
        </p>
      </div>

      {hasExistingAssignments && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <Check className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm">
            {existingProfiles.length} employee{existingProfiles.length > 1 ? 's' : ''} already assigned.
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Quick actions */}
      {unassignedEmployees.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.size} of {unassignedEmployees.length} selected
          </span>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select all
          </Button>
        </div>
      )}

      {/* Employee list */}
      <div className="space-y-1.5 max-h-[360px] overflow-y-auto rounded-lg border p-2">
        {unassignedEmployees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {employees.length === 0
              ? 'No employees found for this branch'
              : 'All employees are already assigned'}
          </div>
        ) : (
          unassignedEmployees.map((emp) => {
            const isSelected = selected.has(emp.uid);
            return (
              <button
                key={emp.uid}
                type="button"
                className={`flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
                onClick={() => toggleSelect(emp.uid)}
              >
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium">
                  {emp.name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.branchName}
                    {emp.position ? ` · ${emp.position}` : ''}
                  </p>
                </div>

                {/* Checkbox indicator */}
                <div
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground/30'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {hasExistingAssignments && (
          <Button variant="outline" onClick={onComplete}>
            Skip
          </Button>
        )}
        {unassignedEmployees.length > 0 && (
          <Button onClick={handleAssign} disabled={saving || selected.size === 0}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Assign {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        )}
        {hasExistingAssignments && unassignedEmployees.length === 0 && (
          <Button onClick={onComplete}>Continue</Button>
        )}
      </div>
    </div>
  );
}
