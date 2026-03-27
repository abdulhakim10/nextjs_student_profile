'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import type {
  DayTypeItem,
  DayTypePayload,
  DayTypeUpdatePayload,
} from '@/types/admin-settings';

interface DayTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  item?: DayTypeItem | null;
  onSubmit: (payload: DayTypePayload | DayTypeUpdatePayload) => Promise<void>;
}

interface FormState {
  name: string;
  description: string;
  level: string;
  isWorkingDay: boolean;
  isPaid: boolean;
  allowOvertime: boolean;
  isActive: boolean;
}

const defaultForm: FormState = {
  name: '',
  description: '',
  level: '0',
  isWorkingDay: true,
  isPaid: true,
  allowOvertime: false,
  isActive: true,
};

export function DayTypeFormDialog({
  open,
  onOpenChange,
  sid,
  item,
  onSubmit,
}: DayTypeFormDialogProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!item;

  useEffect(() => {
    if (open) {
      if (item) {
        setForm({
          name: item.name,
          description: item.description,
          level: item.level,
          isWorkingDay: !!item.isWorkingDay,
          isPaid: !!item.isPaid,
          allowOvertime: !!item.allowOvertime,
          isActive: !!item.isActive,
        });
      } else {
        setForm(defaultForm);
      }
      setError('');
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    try {
      const base: DayTypePayload = {
        sid,
        name: form.name.trim(),
        description: form.description.trim(),
        level: form.level,
        isWorkingDay: form.isWorkingDay,
        isPaid: form.isPaid,
        allowOvertime: form.allowOvertime,
        isActive: form.isActive,
      };

      if (isEdit) {
        await onSubmit({ ...base, code: item!.code } as DayTypeUpdatePayload);
      } else {
        await onSubmit(base);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save day type.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Day Type' : 'New Day Type'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dt-name">Name *</Label>
            <Input
              id="dt-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Regular Work Day"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dt-description">Description</Label>
            <Input
              id="dt-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dt-level">Level</Label>
            <Input
              id="dt-level"
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
              placeholder="0"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dt-working-day">Working Day</Label>
            <Switch
              id="dt-working-day"
              checked={form.isWorkingDay}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, isWorkingDay: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dt-paid">Paid</Label>
            <Switch
              id="dt-paid"
              checked={form.isPaid}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isPaid: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dt-overtime">Allow Overtime</Label>
            <Switch
              id="dt-overtime"
              checked={form.allowOvertime}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, allowOvertime: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dt-active">Active</Label>
            <Switch
              id="dt-active"
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
