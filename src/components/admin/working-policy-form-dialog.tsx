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
  WorkingPolicyItem,
  WorkingPolicyPayload,
  WorkingPolicyUpdatePayload,
} from '@/types/admin-settings';

interface WorkingPolicyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  item?: WorkingPolicyItem | null;
  onSubmit: (
    payload: WorkingPolicyPayload | WorkingPolicyUpdatePayload
  ) => Promise<void>;
}

interface FormState {
  name: string;
  description: string;
  allowed: boolean;
  minMinutes: string;
  roundingMinutes: string;
  maxDailyHours: string;
  rate: string;
  holidayRate: string;
  isActive: boolean;
}

const defaultForm: FormState = {
  name: '',
  description: '',
  allowed: true,
  minMinutes: '0',
  roundingMinutes: '0',
  maxDailyHours: '8',
  rate: '1.5',
  holidayRate: '2.0',
  isActive: true,
};

export function WorkingPolicyFormDialog({
  open,
  onOpenChange,
  sid,
  item,
  onSubmit,
}: WorkingPolicyFormDialogProps) {
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
          allowed: !!item.allowed,
          minMinutes: String(item.rules?.minMinutes ?? 0),
          roundingMinutes: String(item.rules?.roundingMinutes ?? 0),
          maxDailyHours: String(item.rules?.maxDailyHours ?? 8),
          rate: String(item.rules?.rate ?? 1.5),
          holidayRate: String(item.rules?.holidayRate ?? 2.0),
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
    if (Number(form.minMinutes) < 0 || form.minMinutes === '') {
      setError('Min minutes must be 0 or greater.');
      return;
    }
    if (Number(form.roundingMinutes) < 0 || form.roundingMinutes === '') {
      setError('Rounding minutes must be 0 or greater.');
      return;
    }
    if (Number(form.maxDailyHours) <= 0 || form.maxDailyHours === '') {
      setError('Max daily hours must be greater than 0.');
      return;
    }
    if (Number(form.rate) < 1 || form.rate === '') {
      setError('OT rate must be at least 1.');
      return;
    }
    if (Number(form.holidayRate) < 1 || form.holidayRate === '') {
      setError('Holiday OT rate must be at least 1.');
      return;
    }

    setSaving(true);
    try {
      const base: WorkingPolicyPayload = {
        sid,
        name: form.name.trim(),
        description: form.description.trim(),
        allowed: form.allowed,
        rules: {
          minMinutes: Number(form.minMinutes),
          roundingMinutes: Number(form.roundingMinutes),
          maxDailyHours: Number(form.maxDailyHours),
          rate: Number(form.rate),
          holidayRate: Number(form.holidayRate),
        },
        isActive: form.isActive,
      };

      if (isEdit) {
        await onSubmit({
          ...base,
          code: item!.code,
        } as WorkingPolicyUpdatePayload);
      } else {
        await onSubmit(base);
      }
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save working policy.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Working Policy' : 'New Working Policy'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wp-name">Name *</Label>
            <Input
              id="wp-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Standard OT Policy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wp-description">Description</Label>
            <Input
              id="wp-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="wp-allowed">OT Allowed</Label>
            <Switch
              id="wp-allowed"
              checked={form.allowed}
              onCheckedChange={(v) => setForm((f) => ({ ...f, allowed: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wp-min-minutes">Min Minutes</Label>
            <Input
              id="wp-min-minutes"
              type="number"
              min={0}
              value={form.minMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, minMinutes: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wp-rounding">Rounding Minutes</Label>
            <Input
              id="wp-rounding"
              type="number"
              min={0}
              value={form.roundingMinutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  roundingMinutes: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wp-max-hours">Max Daily Hours</Label>
            <Input
              id="wp-max-hours"
              type="number"
              min={1}
              step={0.5}
              value={form.maxDailyHours}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  maxDailyHours: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wp-rate">OT Rate (multiplier)</Label>
            <Input
              id="wp-rate"
              type="number"
              min={1}
              step={0.25}
              value={form.rate}
              onChange={(e) =>
                setForm((f) => ({ ...f, rate: e.target.value }))
              }
              placeholder="e.g. 1.5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wp-holiday-rate">Holiday OT Rate (multiplier)</Label>
            <Input
              id="wp-holiday-rate"
              type="number"
              min={1}
              step={0.25}
              value={form.holidayRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, holidayRate: e.target.value }))
              }
              placeholder="e.g. 2.0"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="wp-active">Active</Label>
            <Switch
              id="wp-active"
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
