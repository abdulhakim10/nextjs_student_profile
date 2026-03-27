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
import { ScheduleWeeklyEditor } from '@/components/admin/schedule-weekly-editor';
import {
  type DayForm,
  DAY_NAMES,
  DEFAULT_DAY_OFF,
  DEFAULT_WEEK,
  scheduleDayToDayForm,
  daysToWeeklySchedule,
} from '@/lib/schedule-utils';
import type {
  ScheduleTemplateItem,
  ScheduleTemplatePayload,
  ScheduleTemplateUpdatePayload,
} from '@/types/admin-settings';

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  schedule?: ScheduleTemplateItem | null;
  onSubmit: (
    payload: ScheduleTemplatePayload | ScheduleTemplateUpdatePayload
  ) => Promise<void>;
}

type FormState = {
  name: string;
  description: string;
  isActive: boolean;
  days: DayForm[];
};

const defaultForm: FormState = {
  name: '',
  description: '',
  isActive: true,
  days: DEFAULT_WEEK.map((d) => ({ ...d })),
};

export function ScheduleFormDialog({
  open,
  onOpenChange,
  sid,
  schedule,
  onSubmit,
}: ScheduleFormDialogProps) {
  const isEdit = !!schedule;
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');

    if (schedule) {
      const days: DayForm[] = [];
      for (let i = 0; i < 7; i++) {
        const day = schedule.schedule[String(i)];
        if (day) {
          days.push(scheduleDayToDayForm(day));
        } else {
          days.push({ ...DEFAULT_DAY_OFF });
        }
      }
      setForm({
        name: schedule.name,
        description: schedule.description,
        isActive: !!schedule.isActive,
        days,
      });
    } else {
      setForm({
        ...defaultForm,
        days: DEFAULT_WEEK.map((d) => ({ ...d })),
      });
    }
  }, [open, schedule]);

  const updateDay = (index: number, patch: Partial<DayForm>) => {
    setForm((prev) => {
      const days = prev.days.map((d, i) =>
        i === index ? { ...d, ...patch } : d
      );
      return { ...prev, days };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEdit && !form.name.trim()) {
      setError('Schedule name is required.');
      return;
    }

    for (let i = 0; i < 7; i++) {
      const d = form.days[i];
      if (d.enabled) {
        if (!d.clockIn || !d.clockOut) {
          setError(`${DAY_NAMES[i]}: Clock In and Clock Out are required.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const weeklySchedule = daysToWeeklySchedule(form.days);

      if (isEdit && schedule) {
        const payload: ScheduleTemplateUpdatePayload = {
          code: schedule.code,
          schedule: weeklySchedule,
        };
        await onSubmit(payload);
      } else {
        const payload: ScheduleTemplatePayload = {
          sid,
          name: form.name.trim(),
          description: form.description.trim(),
          isActive: form.isActive,
          schedule: weeklySchedule,
        };
        await onSubmit(payload);
      }
      onOpenChange(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit Schedule: ${schedule?.name}` : 'New Schedule Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isEdit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sched-name">Name *</Label>
                <Input
                  id="sched-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Standard Office Hours"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sched-desc">Description</Label>
                <Input
                  id="sched-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sched-active">Active</Label>
                <Switch
                  id="sched-active"
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, isActive: v }))
                  }
                />
              </div>
            </div>
          )}

          <ScheduleWeeklyEditor days={form.days} onUpdateDay={updateDay} />

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
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
