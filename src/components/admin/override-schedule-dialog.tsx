'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Trash2, CalendarClock } from 'lucide-react';
import { toast } from '@/lib/toast';
import { adminSettingsService } from '@/services/admin-settings.service';
import type { OverrideScheduleMap, OverrideDaySchedule } from '@/types';

interface OverrideScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  sid: string;
  staffName: string;
}

type EditMode = 'work' | 'rest';

export function OverrideScheduleDialog({
  open,
  onOpenChange,
  uid,
  sid,
  staffName,
}: OverrideScheduleDialogProps) {
  const [schedules, setSchedules] = useState<OverrideScheduleMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Assignment form
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [mode, setMode] = useState<EditMode>('work');
  const [clockIn, setClockIn] = useState('08:00');
  const [clockOut, setClockOut] = useState('17:00');

  // Current view month for fetching
  const [viewMonth, setViewMonth] = useState(new Date());

  const fetchSchedules = useCallback(async () => {
    if (!uid || !sid) return;
    setLoading(true);
    try {
      const year = String(viewMonth.getFullYear());
      const month = String(viewMonth.getMonth() + 1);
      const res = await adminSettingsService.getOverrideSchedule(uid, sid, year, month);
      setSchedules(res.data ?? {});
    } catch {
      // No overrides yet — that's fine
      setSchedules({});
    } finally {
      setLoading(false);
    }
  }, [uid, sid, viewMonth]);

  useEffect(() => {
    if (open) {
      fetchSchedules();
      setSelectedDates([]);
    }
  }, [open, fetchSchedules]);

  const handleAssign = async () => {
    if (selectedDates.length === 0) return;

    setSaving(true);
    try {
      const newSchedules: Record<string, OverrideDaySchedule | null> = {};
      for (const date of selectedDates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        if (mode === 'rest') {
          newSchedules[dateStr] = null;
        } else {
          newSchedules[dateStr] = {
            clockIn,
            clockOut,
            breakStart: null,
            breakEnd: null,
          };
        }
      }

      await adminSettingsService.upsertOverrideSchedule({
        uid,
        sid,
        schedules: newSchedules,
      });

      toast.success(`Assigned ${selectedDates.length} date(s)`);
      setSelectedDates([]);
      fetchSchedules();
    } catch {
      toast.error('Failed to assign schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDate = async (dateStr: string) => {
    try {
      await adminSettingsService.deleteOverrideSchedule({ uid, sid, dates: [dateStr] });
      toast.success(`Removed ${dateStr}`);
      fetchSchedules();
    } catch {
      toast.error('Failed to remove date');
    }
  };

  // Sort schedule entries for display
  const sortedEntries = Object.entries(schedules).sort(([a], [b]) => a.localeCompare(b));

  // Highlight dates that have overrides on the calendar
  const overrideDates = Object.keys(schedules).map((d) => new Date(d + 'T00:00:00'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Override Schedule — {staffName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Calendar + Assignment */}
          <div className="space-y-3">
            <Label>Select dates to assign</Label>
            <div className="flex justify-center rounded-lg border p-2">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                month={viewMonth}
                onMonthChange={setViewMonth}
                modifiers={{
                  override: overrideDates,
                }}
                modifiersClassNames={{
                  override: 'border-2 border-primary rounded-md',
                }}
              />
            </div>

            {selectedDates.length > 0 && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{selectedDates.length} date(s) selected</Badge>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant={mode === 'work' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('work')}
                  >
                    Working Day
                  </Button>
                  <Button
                    type="button"
                    variant={mode === 'rest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('rest')}
                  >
                    Rest Day
                  </Button>
                </div>

                {mode === 'work' && (
                  <div className="flex items-center gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Clock In</Label>
                      <Input
                        type="time"
                        value={clockIn}
                        onChange={(e) => setClockIn(e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Clock Out</Label>
                      <Input
                        type="time"
                        value={clockOut}
                        onChange={(e) => setClockOut(e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}

                <Button onClick={handleAssign} disabled={saving} size="sm">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign {selectedDates.length} date(s)
                </Button>
              </div>
            )}
          </div>

          {/* Existing Schedule List */}
          <div className="space-y-2">
            <Label>Assigned overrides ({sortedEntries.length})</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
            ) : sortedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No override dates assigned yet.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {sortedEntries.map(([dateStr, config]) => (
                  <div
                    key={dateStr}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-24">{dateStr}</span>
                      {config === null ? (
                        <Badge variant="outline">Rest Day</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {config.clockIn} — {config.clockOut}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteDate(dateStr)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
