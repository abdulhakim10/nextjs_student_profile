'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { adminSettingsService } from '@/services/admin-settings.service';
import type { AttendanceGroupItem } from '@/types';
import { Users, Check, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/i18n';

interface StepCreateGroupProps {
  sid: string;
  onComplete: (groupCode: string, scheduleCode: string) => void;
}

export function StepCreateGroup({ sid, onComplete }: StepCreateGroupProps) {
  const { t } = useTranslation('admin');
  const [groups, setGroups] = useState<AttendanceGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('General Staff');
  const [description, setDescription] = useState('');

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminSettingsService.getGroupList(sid);
      if (res.success && res.data) setGroups(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [sid]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t('enterGroupName'));
      return;
    }
    setSaving(true);
    try {
      const res = await adminSettingsService.createGroup({
        sid,
        name: name.trim(),
        description: description.trim(),
      });
      if (res.success && res.data) {
        toast.success(t('groupCreated').replace('{name}', name));
        onComplete(res.data.groupCode, res.data.scheduleTemplateCode);
      }
    } catch {
      toast.error('Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  const hasGroups = groups.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t('createGroup')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('groupExplanation')}
          {' '}{t('groupExample')}
        </p>
      </div>

      {/* Existing groups */}
      {hasGroups && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {groups.length} group{groups.length > 1 ? 's' : ''} exist
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <Badge key={g.code} variant="secondary">
                <Users className="mr-1 h-3 w-3" />
                {g.name}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() =>
                onComplete(groups[0].code, groups[0].scheduleTemplateCode)
              }
            >
              Use &quot;{groups[0].name}&quot; & continue
            </Button>
          </div>
        </div>
      )}

      {/* Create form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {hasGroups ? 'Or create a new group:' : 'A default schedule and ruleset will be created automatically.'}
          </p>
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g. Office Staff, Warehouse Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-desc">Description (optional)</Label>
            <Input
              id="group-desc"
              placeholder="e.g. Regular office employees with standard hours"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
