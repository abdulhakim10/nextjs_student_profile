'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { BriefcaseBusiness, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { WorkingPolicyFormDialog } from '@/components/admin/working-policy-form-dialog';
import { adminSettingsService } from '@/services/admin-settings.service';
import type {
  WorkingPolicyItem,
  WorkingPolicyPayload,
  WorkingPolicyUpdatePayload,
} from '@/types/admin-settings';

interface WorkingPoliciesTabPanelProps {
  selectedSid: string;
}

export function WorkingPoliciesTabPanel({ selectedSid }: WorkingPoliciesTabPanelProps) {
  const [items, setItems] = useState<WorkingPolicyItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkingPolicyItem | null>(
    null
  );

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<WorkingPolicyItem | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    if (!selectedSid) return;
    setLoading(true);
    try {
      const res =
        await adminSettingsService.getWorkingPolicyList(selectedSid);
      if (res.success) {
        setItems(res.data ?? []);
      }
    } catch {
      toast.error('Failed to load working policies');
    } finally {
      setLoading(false);
    }
  }, [selectedSid]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleFormSubmit = async (
    payload: WorkingPolicyPayload | WorkingPolicyUpdatePayload
  ) => {
    if ('code' in payload) {
      await adminSettingsService.updateWorkingPolicy(
        payload as WorkingPolicyUpdatePayload
      );
      toast.success('Working policy updated');
    } else {
      await adminSettingsService.createWorkingPolicy(
        payload as WorkingPolicyPayload
      );
      toast.success('Working policy created');
    }
    fetchList();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminSettingsService.deleteWorkingPolicy(deleteTarget.code);
      toast.success('Working policy deleted');
      setDeleteTarget(null);
      fetchList();
    } catch {
      toast.error('Failed to delete working policy');
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: WorkingPolicyItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  return (
    <>
      {/* Content Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Working Policy List</CardTitle>
            <CardDescription>
              {items.length} polic{items.length !== 1 ? 'ies' : 'y'} configured
            </CardDescription>
          </div>
          <Button onClick={openCreate} disabled={!selectedSid}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No working policies found. Create one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <BriefcaseBusiness className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Min {item.rules?.minMinutes ?? 0}min | Round{' '}
                        {item.rules?.roundingMinutes ?? 0}min | Max{' '}
                        {item.rules?.maxDailyHours ?? 0}h/day
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <Badge variant="secondary">
                          {item.allowed ? 'OT Allowed' : 'OT Not Allowed'}
                        </Badge>
                        <Badge
                          variant={item.isActive ? 'default' : 'outline'}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <WorkingPolicyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sid={selectedSid}
        item={editingItem}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Working Policy"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
