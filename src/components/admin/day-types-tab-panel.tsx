'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { CalendarDays, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { DayTypeFormDialog } from '@/components/admin/day-type-form-dialog';
import { adminSettingsService } from '@/services/admin-settings.service';
import type {
  DayTypeItem,
  DayTypePayload,
  DayTypeUpdatePayload,
} from '@/types/admin-settings';

interface DayTypesTabPanelProps {
  selectedSid: string;
}

export function DayTypesTabPanel({ selectedSid }: DayTypesTabPanelProps) {
  const [items, setItems] = useState<DayTypeItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DayTypeItem | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<DayTypeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    if (!selectedSid) return;
    setLoading(true);
    try {
      const res = await adminSettingsService.getDayTypeList(selectedSid);
      if (res.success) {
        setItems(res.data ?? []);
      }
    } catch {
      toast.error('Failed to load day types');
    } finally {
      setLoading(false);
    }
  }, [selectedSid]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleFormSubmit = async (
    payload: DayTypePayload | DayTypeUpdatePayload
  ) => {
    if ('code' in payload) {
      await adminSettingsService.updateDayType(payload as DayTypeUpdatePayload);
      toast.success('Day type updated');
    } else {
      await adminSettingsService.createDayType(payload as DayTypePayload);
      toast.success('Day type created');
    }
    fetchList();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminSettingsService.deleteDayType(deleteTarget.code);
      toast.success('Day type deleted');
      setDeleteTarget(null);
      fetchList();
    } catch {
      toast.error('Failed to delete day type');
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: DayTypeItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  return (
    <>
      {/* Content Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Day Type List</CardTitle>
            <CardDescription>
              {items.length} day type{items.length !== 1 ? 's' : ''} configured
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
              No day types found. Create one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.isWorkingDay ? (
                          <Badge variant="secondary">Working Day</Badge>
                        ) : null}
                        {item.isPaid ? (
                          <Badge variant="secondary">Paid</Badge>
                        ) : null}
                        {item.allowOvertime ? (
                          <Badge variant="secondary">OT Allowed</Badge>
                        ) : null}
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
      <DayTypeFormDialog
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
        title="Delete Day Type"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
