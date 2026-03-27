'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { Users, Plus, Pencil, Trash2, AlertCircle, Calendar, BookOpen } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { GroupCreateDialog } from '@/components/admin/group-create-dialog';
import { GroupEditDialog } from '@/components/admin/group-edit-dialog';
import { adminSettingsService } from '@/services/admin-settings.service';
import type {
  AttendanceGroupItem,
  AttendanceGroupPayload,
  ScheduleTemplateListItem,
  RulesetItem,
} from '@/types/admin-settings';

interface GroupsTabPanelProps {
  selectedSid: string;
}

export function GroupsTabPanel({ selectedSid }: GroupsTabPanelProps) {
  const [items, setItems] = useState<AttendanceGroupItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Name lookup maps
  const [scheduleNames, setScheduleNames] = useState<Record<string, string>>({});
  const [rulesetNames, setRulesetNames] = useState<Record<string, string>>({});

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AttendanceGroupItem | null>(null);

  // Auto-open edit after create
  const [pendingEditCode, setPendingEditCode] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<AttendanceGroupItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    if (!selectedSid) return;
    setLoading(true);
    try {
      const [groupRes, scheduleRes, rulesetRes] = await Promise.all([
        adminSettingsService.getGroupList(selectedSid),
        adminSettingsService.getScheduleList(selectedSid).catch(() => ({ data: [] })),
        adminSettingsService.getRulesetList(selectedSid).catch(() => ({ data: [] })),
      ]);

      if (groupRes.success) {
        setItems(groupRes.data ?? []);
      }

      // Build name lookup maps
      const schedMap: Record<string, string> = {};
      for (const s of (scheduleRes.data ?? []) as ScheduleTemplateListItem[]) {
        schedMap[s.code] = s.name;
      }
      setScheduleNames(schedMap);

      const ruleMap: Record<string, string> = {};
      for (const r of (rulesetRes.data ?? []) as RulesetItem[]) {
        ruleMap[r.code] = r.name;
      }
      setRulesetNames(ruleMap);
    } catch {
      toast.error('Failed to load attendance groups');
    } finally {
      setLoading(false);
    }
  }, [selectedSid]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // After create + refetch, auto-open the newly created group for editing
  useEffect(() => {
    if (pendingEditCode && items.length > 0) {
      const created = items.find((i) => i.code === pendingEditCode);
      if (created) {
        setEditingGroup(created);
        setEditOpen(true);
        setPendingEditCode(null);
      }
    }
  }, [pendingEditCode, items]);

  const handleCreateSubmit = async (payload: AttendanceGroupPayload) => {
    const res = await adminSettingsService.createGroup(payload);
    toast.success('Group created — configure the schedule and ruleset now.');
    const code = res.data?.groupCode;
    if (code) setPendingEditCode(code);
    fetchList();
  };

  const openEdit = (item: AttendanceGroupItem) => {
    setEditingGroup(item);
    setEditOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminSettingsService.deleteGroup(deleteTarget.code);
      toast.success('Attendance group deleted');
      setDeleteTarget(null);
      fetchList();
    } catch {
      toast.error('Failed to delete attendance group');
    } finally {
      setDeleting(false);
    }
  };

  // Check if a group likely has default/unconfigured schedule
  const isDefaultName = (name: string | undefined) =>
    !name || name.toLowerCase().includes('default') || name.toLowerCase().includes('auto');

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Group List</CardTitle>
            <CardDescription>
              {items.length} group{items.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} disabled={!selectedSid}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No attendance groups found. Create one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const schedName = scheduleNames[item.scheduleTemplateCode];
                const rulesetName = rulesetNames[item.rulesetCode];
                const needsSetup = isDefaultName(schedName);

                return (
                  <div
                    key={item.code}
                    className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      needsSetup ? 'border-amber-300 dark:border-amber-700' : ''
                    }`}
                    onClick={() => openEdit(item)}
                  >
                    <div className="flex items-start gap-3">
                      <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div className="space-y-1.5">
                        <p className="font-medium leading-none">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {item.scheduleTemplateCode && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {schedName || 'Schedule'}
                            </span>
                          )}
                          {item.rulesetCode && (
                            <span className="inline-flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {rulesetName || 'Ruleset'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={item.isActive ? 'default' : 'outline'}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {needsSetup && (
                            <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-3 w-3" />
                              Setup needed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(item);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <GroupCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        sid={selectedSid}
        onSubmit={handleCreateSubmit}
      />

      {/* Edit Dialog */}
      {editingGroup && (
        <GroupEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          sid={selectedSid}
          group={editingGroup}
          onSaved={fetchList}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Attendance Group"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
