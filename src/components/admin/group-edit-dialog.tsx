'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { adminSettingsService } from '@/services/admin-settings.service';
import type {
  AttendanceGroupItem,
  AttendanceGroupUpdatePayload,
  WorkingPolicyItem,
  ScheduleTemplateItem,
  RulesetItem,
  RulesetUpdatePayload,
} from '@/types';

interface GroupEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  group: AttendanceGroupItem;
  onSaved: () => void;
}

export function GroupEditDialog({
  open,
  onOpenChange,
  sid,
  group,
  onSaved,
}: GroupEditDialogProps) {
  const [loading, setLoading] = useState(false);

  // Dropdown data
  const [workingPolicies, setWorkingPolicies] = useState<WorkingPolicyItem[]>([]);

  // Schedule data
  const [scheduleData, setScheduleData] = useState<ScheduleTemplateItem | null>(null);

  // Ruleset data
  const [rulesetData, setRulesetData] = useState<RulesetItem | null>(null);

  // Load all data on dialog open
  useEffect(() => {
    if (!open || !sid || !group) return;

    let cancelled = false;
    setLoading(true);
    setScheduleData(null);
    setRulesetData(null);

    const loadData = async () => {
      try {
        // Always load dropdowns
        const policyRes = await adminSettingsService.getWorkingPolicyList(sid);

        if (cancelled) return;
        setWorkingPolicies(policyRes.data ?? []);

        // Load schedule if linked
        if (group.scheduleTemplateCode) {
          try {
            const schedRes = await adminSettingsService.getSchedule(group.scheduleTemplateCode);
            if (!cancelled) setScheduleData(schedRes.data ?? null);
          } catch {
            if (!cancelled) console.warn('Failed to load schedule');
          }
        }

        // Load ruleset if linked
        if (group.rulesetCode) {
          try {
            const rulesetListRes = await adminSettingsService.getRulesetList(sid);
            if (!cancelled) {
              const found = (rulesetListRes.data ?? []).find(
                (r) => r.code === group.rulesetCode
              );
              setRulesetData(found ?? null);
            }
          } catch {
            if (!cancelled) console.warn('Failed to load ruleset');
          }
        }
      } catch {
        if (!cancelled) toast.error('Failed to load group data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [open, sid, group]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Group: {group?.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="schedule" className="gap-1.5">
                Schedule
                {scheduleData && (!scheduleData.name || scheduleData.name.toLowerCase().includes('default')) && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="ruleset">Ruleset</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab
                sid={sid}
                group={group}
                workingPolicies={workingPolicies}
                onSaved={() => { onSaved(); onOpenChange(false); }}
              />
            </TabsContent>

            <TabsContent value="schedule">
              <ScheduleTab
                group={group}
                scheduleData={scheduleData}
                workingPolicies={workingPolicies}
                onSaved={() => { onSaved(); onOpenChange(false); }}
              />
            </TabsContent>

            <TabsContent value="ruleset">
              <RulesetTab
                sid={sid}
                group={group}
                rulesetData={rulesetData}
                onSaved={() => { onSaved(); onOpenChange(false); }}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── General Tab ────────────────────────────────────────────────────────────

interface GeneralTabProps {
  sid: string;
  group: AttendanceGroupItem;
  workingPolicies: WorkingPolicyItem[];
  onSaved: () => void;
}

function GeneralTab({ sid, group, workingPolicies, onSaved }: GeneralTabProps) {
  const [form, setForm] = useState({
    name: group.name,
    description: group.description,
    isActive: !!group.isActive,
    otPolicyCode: group.otPolicyCode || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload: AttendanceGroupUpdatePayload = {
        code: group.code,
        sid,
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: form.isActive,
        scheduleTemplateCode: group.scheduleTemplateCode,
        rulesetCode: group.rulesetCode,
        otPolicyCode: form.otPolicyCode || undefined,
      };
      await adminSettingsService.updateGroup(payload);
      toast.success('Group updated');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gen-name">Name *</Label>
        <Input
          id="gen-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Office Staff"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gen-description">Description</Label>
        <Input
          id="gen-description"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          placeholder="Optional description"
        />
      </div>

      <div className="space-y-2">
        <Label>OT Policy</Label>
        <Select
          value={form.otPolicyCode || '__none__'}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, otPolicyCode: v === '__none__' ? '' : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select OT policy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {workingPolicies.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="gen-active">Active</Label>
        <Switch
          id="gen-active"
          checked={form.isActive}
          onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save General
        </Button>
      </div>
    </form>
  );
}

// ─── Schedule Tab ───────────────────────────────────────────────────────────

interface ScheduleTabProps {
  group: AttendanceGroupItem;
  scheduleData: ScheduleTemplateItem | null;
  workingPolicies: WorkingPolicyItem[];
  onSaved: () => void;
}

function ScheduleTab({ group, scheduleData, workingPolicies, onSaved }: ScheduleTabProps) {
  const [days, setDays] = useState<DayForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (scheduleData?.schedule) {
      const parsed: DayForm[] = [];
      for (let i = 0; i < 7; i++) {
        const day = scheduleData.schedule[String(i)];
        if (day) {
          parsed.push(scheduleDayToDayForm(day));
        } else {
          parsed.push({ ...DEFAULT_DAY_OFF });
        }
      }
      setDays(parsed);
    } else {
      // Default week if no schedule data (Mon-Fri working, Sat-Sun off)
      setDays(DEFAULT_WEEK.map((d) => ({ ...d })));
    }
  }, [scheduleData]);

  const updateDay = useCallback((index: number, patch: Partial<DayForm>) => {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  }, []);

  const handleSave = async () => {
    setError('');

    if (days.length < 7) return;

    for (let i = 0; i < 7; i++) {
      const d = days[i];
      if (d && d.enabled && (!d.clockIn || !d.clockOut)) {
        setError(`${DAY_NAMES[i]}: Clock In and Clock Out are required.`);
        return;
      }
    }

    setSaving(true);
    try {
      await adminSettingsService.updateSchedule({
        code: group.scheduleTemplateCode,
        schedule: daysToWeeklySchedule(days),
      });
      toast.success('Schedule updated');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (!scheduleData) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No schedule linked to this group.
      </p>
    );
  }

  if (days.length === 0) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Schedule: <span className="font-medium text-foreground">{scheduleData.name}</span>
      </p>

      <ScheduleWeeklyEditor days={days} onUpdateDay={updateDay} workingPolicies={workingPolicies} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Schedule
        </Button>
      </div>
    </div>
  );
}

// ─── Ruleset Tab ────────────────────────────────────────────────────────────

interface RulesetTabProps {
  sid: string;
  group: AttendanceGroupItem;
  rulesetData: RulesetItem | null;
  onSaved: () => void;
}

interface RulesetFormState {
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

function RulesetTab({ sid, group, rulesetData, onSaved }: RulesetTabProps) {
  const [form, setForm] = useState<RulesetFormState>({
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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rulesetData) {
      setForm({
        name: rulesetData.name,
        description: rulesetData.description,
        flexible: !!rulesetData.flexible,
        flexWindowActive: !!rulesetData.flexWindowActive,
        earliestIn: rulesetData.flexWindow?.earliestIn ?? '07:00',
        latestIn: rulesetData.flexWindow?.latestIn ?? '09:00',
        requiredHours: rulesetData.flexWindow?.requiredHours ?? 8,
        maxPair: rulesetData.maxPair ?? 1,
        doublePunchInSeconds: rulesetData.doublePunchInSeconds ?? 60,
        clockInGraceActive: (rulesetData.clockInGracePeriod ?? 0) > 0,
        clockInGracePeriod: String(rulesetData.clockInGracePeriod || 5),
        isActive: !!rulesetData.isActive,
      });
    }
  }, [rulesetData]);

  const handleSave = async () => {
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
        setError('Required hours must be greater than 0.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: RulesetUpdatePayload = {
        code: group.rulesetCode,
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
      await adminSettingsService.updateRuleset(payload);
      toast.success('Ruleset updated');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ruleset.');
    } finally {
      setSaving(false);
    }
  };

  if (!rulesetData) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No ruleset linked to this group.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ruleset: <span className="font-medium text-foreground">{rulesetData.name}</span>
      </p>

      <div className="space-y-2">
        <Label htmlFor="rs-name">Name *</Label>
        <Input
          id="rs-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Ruleset
        </Button>
      </div>
    </div>
  );
}
