'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { adminSettingsService } from '@/services/admin-settings.service';
import type { AttendanceGroupItem } from '@/types';

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  selectedCount: number;
  onSubmit: (attendanceGroupCode: string) => Promise<void>;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  sid,
  selectedCount,
  onSubmit,
}: BulkAssignDialogProps) {
  const [groupCode, setGroupCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groups, setGroups] = useState<AttendanceGroupItem[]>([]);

  useEffect(() => {
    if (!open || !sid) return;

    let cancelled = false;
    setLoadingGroups(true);

    adminSettingsService
      .getGroupList(sid)
      .then((res) => {
        if (!cancelled) setGroups(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load groups.');
      })
      .finally(() => {
        if (!cancelled) setLoadingGroups(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sid]);

  useEffect(() => {
    if (open) {
      setGroupCode('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!groupCode) {
      setError('Please select an attendance group.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(groupCode);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign profiles.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Assign Attendance Group</DialogTitle>
          <DialogDescription>
            Assign an attendance group to {selectedCount} selected staff member{selectedCount !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingGroups ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Attendance Group *</Label>
              <Select value={groupCode} onValueChange={setGroupCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select attendance group" />
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
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loadingGroups || !groupCode}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Assigning...' : `Assign to ${selectedCount} staff`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
