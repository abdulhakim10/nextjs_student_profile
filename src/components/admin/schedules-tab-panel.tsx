'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { CalendarDays, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ScheduleFormDialog } from '@/components/admin/schedule-form-dialog';
import { adminSettingsService } from '@/services/admin-settings.service';
import type {
  ScheduleTemplateListItem,
  ScheduleTemplateItem,
  ScheduleTemplatePayload,
  ScheduleTemplateUpdatePayload,
} from '@/types/admin-settings';

interface SchedulesTabPanelProps {
  selectedSid: string;
}

export function SchedulesTabPanel({ selectedSid }: SchedulesTabPanelProps) {
  // ─── List state ─────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState<ScheduleTemplateListItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── Dialog state ───────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<ScheduleTemplateItem | null>(null);
  const [loadingFullSchedule, setLoadingFullSchedule] = useState<string | null>(
    null
  );

  // ─── Delete state ───────────────────────────────────────────────────────
  const [deleteCode, setDeleteCode] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Fetch list ─────────────────────────────────────────────────────────

  const fetchSchedules = useCallback(async () => {
    if (!selectedSid) return;
    setLoading(true);
    try {
      const res = await adminSettingsService.getScheduleList(selectedSid);
      if (res.success && res.data) {
        setSchedules(res.data);
      } else {
        setSchedules([]);
      }
    } catch {
      setSchedules([]);
      toast.error('Failed to load schedule templates');
    } finally {
      setLoading(false);
    }
  }, [selectedSid]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // ─── Open create dialog ─────────────────────────────────────────────────

  const handleNew = () => {
    setEditingSchedule(null);
    setFormOpen(true);
  };

  // ─── Open edit dialog (fetch full schedule first) ───────────────────────

  const handleEdit = async (code: string) => {
    setLoadingFullSchedule(code);
    try {
      const res = await adminSettingsService.getSchedule(code);
      if (res.success && res.data) {
        setEditingSchedule(res.data);
        setFormOpen(true);
      } else {
        toast.error('Failed to load schedule details');
      }
    } catch {
      toast.error('Failed to load schedule details');
    } finally {
      setLoadingFullSchedule(null);
    }
  };

  // ─── Submit handler (create or update) ──────────────────────────────────

  const handleSubmit = async (
    payload: ScheduleTemplatePayload | ScheduleTemplateUpdatePayload
  ) => {
    if ('code' in payload) {
      await adminSettingsService.updateSchedule(
        payload as ScheduleTemplateUpdatePayload
      );
    } else {
      await adminSettingsService.createSchedule(
        payload as ScheduleTemplatePayload
      );
    }
    toast.success('Schedule template saved');
    fetchSchedules();
  };

  // ─── Delete handler ─────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteCode) return;
    setDeleteLoading(true);
    try {
      await adminSettingsService.deleteSchedule(deleteCode);
      toast.success('Schedule template deleted');
      setDeleteCode(null);
      fetchSchedules();
    } catch {
      toast.error('Failed to delete schedule template');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Schedules</CardTitle>
            <CardDescription>
              Weekly schedule templates for this branch.
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleNew} disabled={!selectedSid}>
            <Plus className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No schedule templates yet. Create one to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {schedules.map((item) => (
                <li
                  key={item.code}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.code}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item.code)}
                      disabled={loadingFullSchedule === item.code}
                    >
                      {loadingFullSchedule === item.code ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteCode(item.code)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ─── Dialogs ─── */}
      <ScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sid={selectedSid}
        schedule={editingSchedule}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteCode}
        onOpenChange={(open) => !open && setDeleteCode(null)}
        title="Delete Schedule Template"
        description="Are you sure you want to delete this schedule template? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  );
}
