'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScheduleWeeklyEditor } from '@/components/admin/schedule-weekly-editor';
import { adminSettingsService } from '@/services/admin-settings.service';
import {
  DEFAULT_WEEK,
  scheduleDayToDayForm,
  daysToWeeklySchedule,
  type DayForm,
} from '@/lib/schedule-utils';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/i18n';

interface StepScheduleProps {
  scheduleCode: string;
  onComplete: () => void;
}

export function StepSchedule({ scheduleCode, onComplete }: StepScheduleProps) {
  const { t } = useTranslation('admin');
  const [days, setDays] = useState<DayForm[]>(DEFAULT_WEEK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadyCustomized, setAlreadyCustomized] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (!scheduleCode) return;
    setLoading(true);
    try {
      const res = await adminSettingsService.getSchedule(scheduleCode);
      if (res.success && res.data) {
        // Backend returns schedule under "days" key, not "schedule"
        const resData = res.data as unknown as Record<string, unknown>;
        const schedule = (resData.schedule ?? resData.days) as Record<string, import('@/types').ScheduleDay> | undefined;
        if (schedule) {
          const mapped = Array.from({ length: 7 }, (_, i) => {
            const day = schedule[String(i)];
            return day ? scheduleDayToDayForm(day) : DEFAULT_WEEK[i];
          });
          setDays(mapped);

          // Check if already customized
          const hasCustom = Object.values(schedule).some(
            (d) => d.enabled && d.clockIn && d.clockOut
          );
          setAlreadyCustomized(hasCustom);
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, [scheduleCode]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleUpdateDay = (index: number, patch: Partial<DayForm>) => {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  };

  const handleSave = async () => {
    const hasWorkDay = days.some((d) => d.enabled);
    if (!hasWorkDay) {
      toast.error(t('enableWorkDay'));
      return;
    }
    setSaving(true);
    try {
      const schedule = daysToWeeklySchedule(days);
      await adminSettingsService.updateSchedule({
        code: scheduleCode,
        schedule,
      });
      toast.success(t('scheduleSaved'));
      onComplete();
    } catch {
      toast.error(t('failedSaveScheduleToast'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t('setSchedule')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define which days your team works and their clock-in/clock-out times.
          This is used to determine who is late, absent, or on time.
        </p>
      </div>

      {alreadyCustomized && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <Check className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm">
            Schedule is already configured. You can adjust it or continue.
          </span>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1 rounded-lg bg-muted/50 p-3">
        <p><strong>Clock In:</strong> When employees should arrive (e.g., 08:00)</p>
        <p><strong>Clock Out:</strong> When the workday ends (e.g., 17:00)</p>
        <p><strong>Break Start/End:</strong> {t('breakHint')}</p>
      </div>

      <ScheduleWeeklyEditor days={days} onUpdateDay={handleUpdateDay} />

      <div className="flex justify-end gap-2">
        {alreadyCustomized && (
          <Button variant="outline" onClick={onComplete}>
            Skip
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Schedule
        </Button>
      </div>
    </div>
  );
}
