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
  RulesetItem,
  RulesetPayload,
  RulesetUpdatePayload,
} from '@/types/admin-settings';

interface RulesetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  item?: RulesetItem | null;
  onSubmit: (payload: RulesetPayload | RulesetUpdatePayload) => Promise<void>;
}

interface FormState {
  name: string;
  description: string;
  flexible: boolean;
  flexWindowActive: boolean;
  earliestIn: string;
  latestIn: string;
  requiredHours: number;
  maxPair: number;
  doublePunchInSeconds: number;
  clockInGraceActive: boolean;
  clockInGracePeriod: string;
  isActive: boolean;
}

const defaultForm: FormState = {
  name: '',
  description: '',
  flexible: false,
  flexWindowActive: false,
  earliestIn: '07:00',
  latestIn: '09:00',
  requiredHours: 8,
  maxPair: 1,
  doublePunchInSeconds: 60,
  clockInGraceActive: false,
  clockInGracePeriod: '5',
  isActive: true,
};

export function RulesetFormDialog({
  open,
  onOpenChange,
  sid,
  item,
  onSubmit,
}: RulesetFormDialogProps) {
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
          flexible: !!item.flexible,
          flexWindowActive: !!item.flexWindowActive,
          earliestIn: item.flexWindow?.earliestIn ?? '07:00',
          latestIn: item.flexWindow?.latestIn ?? '09:00',
          requiredHours: item.flexWindow?.requiredHours ?? 8,
          maxPair: item.maxPair ?? 1,
          doublePunchInSeconds: item.doublePunchInSeconds ?? 60,
          clockInGraceActive: (item.clockInGracePeriod ?? 0) > 0,
          clockInGracePeriod: String(item.clockInGracePeriod || 5),
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
    if (form.maxPair < 1) {
      setError('Max pair must be at least 1.');
      return;
    }
    if (form.doublePunchInSeconds < 0) {
      setError('Double punch seconds must be 0 or greater.');
      return;
    }
    if (form.clockInGraceActive && (!form.clockInGracePeriod || Number(form.clockInGracePeriod) < 1)) {
      setError('Grace period must be at least 1 minute.');
      return;
    }
    if (form.flexWindowActive) {
      if (!form.earliestIn.trim()) {
        setError('Earliest In is required when flex window is active.');
        return;
      }
      if (!form.latestIn.trim()) {
        setError('Latest In is required when flex window is active.');
        return;
      }
      if (!form.requiredHours || form.requiredHours <= 0) {
        setError('Required hours must be greater than 0 when flex window is active.');
        return;
      }
    }

    setSaving(true);
    try {
      const base: RulesetPayload = {
        sid,
        name: form.name.trim(),
        description: form.description.trim(),
        flexible: form.flexible,
        flexWindowActive: form.flexWindowActive,
        flexWindow: form.flexWindowActive
          ? {
              earliestIn: form.earliestIn,
              latestIn: form.latestIn,
              requiredHours: Number(form.requiredHours),
            }
          : null,
        maxPair: Number(form.maxPair),
        doublePunchInSeconds: Number(form.doublePunchInSeconds),
        clockInGracePeriod: form.clockInGraceActive ? Number(form.clockInGracePeriod) : 0,
        isActive: form.isActive,
      };

      if (isEdit) {
        await onSubmit({ ...base, code: item!.code } as RulesetUpdatePayload);
      } else {
        await onSubmit(base);
      }
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save ruleset.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Ruleset' : 'New Ruleset'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rs-name">Name *</Label>
            <Input
              id="rs-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Default Ruleset"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rs-description">Description</Label>
            <Input
              id="rs-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="rs-flexible">Flexible</Label>
            <Switch
              id="rs-flexible"
              checked={form.flexible}
              onCheckedChange={(v) => setForm((f) => ({ ...f, flexible: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="rs-flex-window">Flex Window Active</Label>
            <Switch
              id="rs-flex-window"
              checked={form.flexWindowActive}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, flexWindowActive: v }))
              }
            />
          </div>

          {form.flexWindowActive && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rs-earliest-in">Earliest In *</Label>
                <Input
                  id="rs-earliest-in"
                  type="time"
                  value={form.earliestIn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, earliestIn: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rs-latest-in">Latest In *</Label>
                <Input
                  id="rs-latest-in"
                  type="time"
                  value={form.latestIn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, latestIn: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rs-required-hours">Required Hours *</Label>
                <Input
                  id="rs-required-hours"
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.requiredHours}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      requiredHours: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="rs-max-pair">Max Pair</Label>
            <Input
              id="rs-max-pair"
              type="number"
              min={1}
              value={form.maxPair}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxPair: Number(e.target.value) }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rs-double-punch">Double Punch (seconds)</Label>
            <Input
              id="rs-double-punch"
              type="number"
              min={0}
              value={form.doublePunchInSeconds}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  doublePunchInSeconds: Number(e.target.value),
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="rs-grace-active">Clock-In Grace Period</Label>
            <Switch
              id="rs-grace-active"
              checked={form.clockInGraceActive}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, clockInGraceActive: v }))
              }
            />
          </div>

          {form.clockInGraceActive && (
            <div className="space-y-2">
              <Label htmlFor="rs-grace-minutes">Grace Period (minutes)</Label>
              <Input
                id="rs-grace-minutes"
                type="number"
                min={1}
                max={60}
                value={form.clockInGracePeriod}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    clockInGracePeriod: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Clock-ins within this many minutes after the scheduled time will still count as on-time.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="rs-active">Active</Label>
            <Switch
              id="rs-active"
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
