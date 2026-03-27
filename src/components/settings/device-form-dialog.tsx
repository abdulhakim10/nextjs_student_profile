'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { DeviceItem, DevicePayload, DeviceUpdatePayload } from '@/types';
import { Loader2 } from 'lucide-react';

type FormState = {
  device_code: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  ip_address: string;
  is_active: boolean;
};

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  device?: DeviceItem | null;
  onSubmit: (payload: DevicePayload | DeviceUpdatePayload) => Promise<void>;
}

const defaultForm: FormState = {
  device_code: '',
  name: '',
  status: 'ONLINE',
  ip_address: '',
  is_active: true,
};

export function DeviceFormDialog({
  open,
  onOpenChange,
  sid,
  device,
  onSubmit,
}: DeviceFormDialogProps) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const isEdit = !!device;
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (device) {
      setForm({
        device_code: device.deviceCode ?? '',
        name: device.name ?? '',
        status: (device.status as FormState['status']) ?? 'ONLINE',
        ip_address: device.ipAddress ?? '',
        is_active: device.isActive ?? true,
      });
    } else {
      setForm(defaultForm);
    }
  }, [open, device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError(t('deviceNameRequired'));
      return;
    }
    if (!isEdit && !form.device_code.trim()) {
      setError(t('deviceCodeRequired'));
      return;
    }
    setSaving(true);
    try {
      if (isEdit && device) {
        await onSubmit({
          code: device.code,
          sid,
          device_code: form.device_code.trim(),
          name: form.name.trim(),
          status: form.status,
          ip_address: form.ip_address.trim() || undefined,
          is_active: form.is_active,
        });
      } else {
        await onSubmit({
          sid,
          device_code: form.device_code.trim(),
          name: form.name.trim(),
          status: form.status,
          ip_address: form.ip_address.trim() || undefined,
          is_active: form.is_active,
        });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('failedSaveDevice'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editDevice') : t('newDevice')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dev-code">{`${t('deviceCode')} *`}</Label>
            <Input
              id="dev-code"
              value={form.device_code}
              onChange={(e) => setForm((f) => ({ ...f, device_code: e.target.value }))}
              placeholder={t('placeholderDeviceCode')}
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">{t('deviceCodeFixed')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dev-name">{`${t('deviceName')} *`}</Label>
            <Input
              id="dev-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('placeholderDeviceName')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('deviceStatus')}</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as FormState['status'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONLINE">{t('statusOnline')}</SelectItem>
                <SelectItem value="OFFLINE">{t('statusOffline')}</SelectItem>
                <SelectItem value="MAINTENANCE">{t('statusMaintenance')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dev-ip">{t('ipAddress')}</Label>
            <Input
              id="dev-ip"
              value={form.ip_address}
              onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
              placeholder={t('placeholderIpAddress')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
