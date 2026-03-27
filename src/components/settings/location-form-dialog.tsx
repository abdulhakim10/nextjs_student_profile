'use client';

import React, { useEffect, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import type { LocationItem, LocationPayload, LocationUpdatePayload } from '@/types';
import { Loader2 } from 'lucide-react';

const LocationMapPicker = React.lazy(
  () => import('@/components/setup-wizard/location-map-picker').then((m) => ({
    default: m.LocationMapPicker,
  }))
);

type FormState = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  radius_meter: number;
  is_active: boolean;
};

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sid: string;
  location?: LocationItem | null;
  onSubmit: (payload: LocationPayload | LocationUpdatePayload) => Promise<void>;
}

const defaultForm: FormState = {
  name: '',
  address: '',
  lat: null,
  lng: null,
  radius_meter: 150,
  is_active: true,
};

export function LocationFormDialog({
  open,
  onOpenChange,
  sid,
  location,
  onSubmit,
}: LocationFormDialogProps) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const isEdit = !!location;
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (location) {
      const [lng, lat] = location.coordinates?.coordinates ?? [0, 0];
      setForm({
        name: location.name,
        address: location.address ?? '',
        lat: lat || null,
        lng: lng || null,
        radius_meter: location.radiusMeter ?? 150,
        is_active: location.isActive ?? true,
      });
    } else {
      setForm(defaultForm);
    }
  }, [open, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError(t('locationNameRequired'));
      return;
    }
    if (form.lat === null || form.lng === null) {
      setError(t('selectLocationOnMap'));
      return;
    }
    if (form.radius_meter < 1) {
      setError(t('radiusMinimum'));
      return;
    }

    setSaving(true);
    try {
      const base: LocationPayload = {
        sid,
        name: form.name.trim(),
        address: form.address.trim() || null,
        coordinates: { type: 'Point', coordinates: [form.lng, form.lat] },
        radius_meter: form.radius_meter,
        is_active: form.is_active,
      };
      await onSubmit(isEdit && location ? { ...base, code: location.code } : base);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('failedSaveLocation'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // Prevent dialog close when clicking Google Places autocomplete dropdown
          if ((e.target as HTMLElement)?.closest('.pac-container')) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editLocation') : t('newLocation')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc-name">{`${t('locationName')} *`}</Label>
              <Input
                id="loc-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('placeholderLocationName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-address">{t('address')}</Label>
              <Input
                id="loc-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder={t('placeholderAddress')}
              />
            </div>
          </div>

          {/* Interactive map picker */}
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-[300px] rounded-xl border bg-muted/30">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <LocationMapPicker
              lat={form.lat}
              lng={form.lng}
              radius={form.radius_meter}
              onLocationChange={(lat, lng) =>
                setForm((f) => ({ ...f, lat, lng }))
              }
              onRadiusChange={(r) =>
                setForm((f) => ({ ...f, radius_meter: r }))
              }
            />
          </React.Suspense>

          <div className="flex items-center justify-between">
            <Label>{t('active')}</Label>
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
