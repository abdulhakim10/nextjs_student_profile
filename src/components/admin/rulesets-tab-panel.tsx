'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { ScrollText, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { RulesetFormDialog } from '@/components/admin/ruleset-form-dialog';
import { adminSettingsService } from '@/services/admin-settings.service';
import type {
  RulesetItem,
  RulesetPayload,
  RulesetUpdatePayload,
} from '@/types/admin-settings';

interface RulesetsTabPanelProps {
  selectedSid: string;
}

export function RulesetsTabPanel({ selectedSid }: RulesetsTabPanelProps) {
  const [items, setItems] = useState<RulesetItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RulesetItem | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<RulesetItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    if (!selectedSid) return;
    setLoading(true);
    try {
      const res = await adminSettingsService.getRulesetList(selectedSid);
      if (res.success) {
        setItems(res.data ?? []);
      }
    } catch {
      toast.error('Failed to load rulesets');
    } finally {
      setLoading(false);
    }
  }, [selectedSid]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleFormSubmit = async (
    payload: RulesetPayload | RulesetUpdatePayload
  ) => {
    if ('code' in payload) {
      await adminSettingsService.updateRuleset(
        payload as RulesetUpdatePayload
      );
      toast.success('Ruleset updated');
    } else {
      await adminSettingsService.createRuleset(payload as RulesetPayload);
      toast.success('Ruleset created');
    }
    fetchList();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminSettingsService.deleteRuleset(deleteTarget.code);
      toast.success('Ruleset deleted');
      setDeleteTarget(null);
      fetchList();
    } catch {
      toast.error('Failed to delete ruleset');
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: RulesetItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  return (
    <>
      {/* Content Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Ruleset List</CardTitle>
            <CardDescription>
              {items.length} ruleset{items.length !== 1 ? 's' : ''} configured
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
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No rulesets found. Create one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <ScrollText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Max {item.maxPair} pair{item.maxPair !== 1 ? 's' : ''}{' '}
                        | Double punch {item.doublePunchInSeconds}s
                        {item.flexWindowActive && item.flexWindow && (
                          <>
                            {' '}
                            | Flex {item.flexWindow.earliestIn} -{' '}
                            {item.flexWindow.latestIn} ({item.flexWindow.requiredHours}h)
                          </>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.flexible && (
                          <Badge variant="secondary">Flexible</Badge>
                        )}
                        {item.flexWindowActive && (
                          <Badge variant="secondary">Flex Window</Badge>
                        )}
                        {(item.clockInGracePeriod ?? 0) > 0 && (
                          <Badge variant="secondary">Grace {item.clockInGracePeriod}m</Badge>
                        )}
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
      <RulesetFormDialog
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
        title="Delete Ruleset"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
