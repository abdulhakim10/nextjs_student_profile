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
import { Loader2 } from 'lucide-react';
import type { AttendanceGroupPayload } from '@/types';

interface GroupCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  onSubmit: (payload: AttendanceGroupPayload) => Promise<void>;
}

interface FormState {
  name: string;
  description: string;
}

const defaultForm: FormState = {
  name: '',
  description: '',
};

export function GroupCreateDialog({
  open,
  onOpenChange,
  sid,
  onSubmit,
}: GroupCreateDialogProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(defaultForm);
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        sid,
        name: form.name.trim(),
        description: form.description.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Attendance Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grp-name">Name *</Label>
            <Input
              id="grp-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Office Staff"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grp-description">Description</Label>
            <Input
              id="grp-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional description"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            A default schedule and ruleset will be created automatically. You can configure them after creation.
          </p>

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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
