'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DAY_NAMES, type DayForm } from '@/lib/schedule-utils';
import type { WorkingPolicyItem } from '@/types/admin-settings';

interface ScheduleWeeklyEditorProps {
  days: DayForm[];
  onUpdateDay: (index: number, patch: Partial<DayForm>) => void;
  workingPolicies?: WorkingPolicyItem[];
}

export function ScheduleWeeklyEditor({
  days,
  onUpdateDay,
  workingPolicies,
}: ScheduleWeeklyEditorProps) {
  const hasPolicies = workingPolicies && workingPolicies.length > 0;

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Weekly Schedule</Label>

      <div className="space-y-3">
        {days.map((day, idx) => (
          <div key={idx} className="rounded-lg border p-4 space-y-3">
            {/* Day header row */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{DAY_NAMES[idx]}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {day.enabled ? 'Work day' : 'Rest day'}
                </span>
                <Switch
                  checked={day.enabled}
                  onCheckedChange={(v) => onUpdateDay(idx, { enabled: v })}
                />
              </div>
            </div>

            {/* Time inputs (only when enabled) */}
            {day.enabled ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Clock In
                    </Label>
                    <Input
                      type="time"
                      value={day.clockIn}
                      onChange={(e) =>
                        onUpdateDay(idx, { clockIn: e.target.value })
                      }
                      placeholder="08:00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Clock Out
                    </Label>
                    <Input
                      type="time"
                      value={day.clockOut}
                      onChange={(e) =>
                        onUpdateDay(idx, { clockOut: e.target.value })
                      }
                      placeholder="17:00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Break Start
                    </Label>
                    <Input
                      type="time"
                      value={day.breakStart}
                      onChange={(e) =>
                        onUpdateDay(idx, { breakStart: e.target.value })
                      }
                      placeholder="12:00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Break End
                    </Label>
                    <Input
                      type="time"
                      value={day.breakEnd}
                      onChange={(e) =>
                        onUpdateDay(idx, { breakEnd: e.target.value })
                      }
                      placeholder="13:00"
                    />
                  </div>
                </div>

                {/* Per-day OT policy override */}
                {hasPolicies && (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={day.isOverride}
                        onCheckedChange={(v) =>
                          onUpdateDay(idx, {
                            isOverride: v,
                            overrideOtPolicyCode: v
                              ? day.overrideOtPolicyCode
                              : '',
                          })
                        }
                      />
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        OT Override
                      </Label>
                    </div>
                    {day.isOverride && (
                      <Select
                        value={day.overrideOtPolicyCode || '__none__'}
                        onValueChange={(v) =>
                          onUpdateDay(idx, {
                            overrideOtPolicyCode:
                              v === '__none__' ? '' : v,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Select OT policy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {workingPolicies!.map((p) => (
                            <SelectItem key={p.code} value={p.code}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Rest day — no schedule required
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
