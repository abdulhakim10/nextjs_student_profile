'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { attendanceSettingsService } from '@/services/attendance-settings.service';
import type { LocationItem, DeviceItem } from '@/types';
import { MapPin, Monitor, Plus, Check, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/i18n';

// Lazy load the map component (Google Maps is heavy)
const LocationMapPicker = lazy(() =>
  import('./location-map-picker').then((m) => ({ default: m.LocationMapPicker }))
);

interface StepLocationDeviceProps {
  sid: string;
  mode: 'LOCATION' | 'DEVICE';
  onComplete: () => void;
}

export function StepLocationDevice({ sid, mode, onComplete }: StepLocationDeviceProps) {
  const { t } = useTranslation('admin');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Location form
  const [locName, setLocName] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(100);

  // Device form
  const [devName, setDevName] = useState('');
  const [devCode, setDevCode] = useState('');
  const [devIp, setDevIp] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'LOCATION') {
        const res = await attendanceSettingsService.getLocationList(sid);
        if (res.success && res.data) setLocations(res.data);
      } else {
        const res = await attendanceSettingsService.getDeviceList(sid);
        if (res.success && res.data) setDevices(res.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [sid, mode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasExisting = mode === 'LOCATION' ? locations.length > 0 : devices.length > 0;

  // Auto-show form if nothing exists
  useEffect(() => {
    if (!loading && !hasExisting) {
      setShowForm(true);
    }
  }, [loading, hasExisting]);

  const resetLocationForm = () => {
    setLocName('');
    setLat(null);
    setLng(null);
    setRadius(100);
  };

  const handleAddLocation = async () => {
    if (!locName) {
      toast.error('Please enter a location name');
      return;
    }
    if (lat === null || lng === null) {
      toast.error('Please select a location on the map');
      return;
    }
    setSaving(true);
    try {
      await attendanceSettingsService.createLocation({
        sid,
        name: locName,
        coordinates: {
          type: 'Point',
          coordinates: [lng, lat], // GeoJSON: [longitude, latitude]
        },
        radius_meter: radius,
        is_active: true,
      });
      toast.success('Location added');
      resetLocationForm();
      setShowForm(false);
      await fetchData();
    } catch {
      toast.error('Failed to add location');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDevice = async () => {
    if (!devName || !devCode) {
      toast.error('Please fill in name and device code');
      return;
    }
    setSaving(true);
    try {
      await attendanceSettingsService.createDevice({
        sid,
        name: devName,
        device_code: devCode,
        ip_address: devIp || undefined,
        status: 'ONLINE',
        is_active: true,
      });
      toast.success('Device added');
      setDevName('');
      setDevCode('');
      setDevIp('');
      setShowForm(false);
      await fetchData();
    } catch {
      toast.error('Failed to add device');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === 'LOCATION' ? t('whereIsOffice') : t('registerYourDevice')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === 'LOCATION'
            ? t('locationHint')
            : t('deviceHint')}
        </p>
      </div>

      {/* Existing items */}
      {hasExisting && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {mode === 'LOCATION'
                ? t('locationsConfigured').replace('{count}', String(locations.length))
                : t('deviceRegistered')}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === 'LOCATION'
              ? locations.map((loc) => (
                  <Badge key={loc.code} variant="secondary">
                    <MapPin className="mr-1 h-3 w-3" />
                    {loc.name}
                  </Badge>
                ))
              : devices.map((dev) => (
                  <Badge key={dev.code} variant="secondary">
                    <Monitor className="mr-1 h-3 w-3" />
                    {dev.name}
                  </Badge>
                ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {mode === 'LOCATION' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="loc-name">{t('locationNameLabel')}</Label>
                  <Input
                    id="loc-name"
                    placeholder={t('placeholderMainOffice')}
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                  />
                </div>

                {/* Interactive Map Picker */}
                <div className="space-y-2">
                  <Label>{t('pinLocation')}</Label>
                  <Suspense
                    fallback={
                      <div className="space-y-3">
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <Skeleton className="h-[300px] w-full rounded-xl" />
                      </div>
                    }
                  >
                    <LocationMapPicker
                      lat={lat}
                      lng={lng}
                      radius={radius}
                      onLocationChange={(newLat, newLng) => {
                        setLat(newLat);
                        setLng(newLng);
                      }}
                      onRadiusChange={setRadius}
                    />
                  </Suspense>
                </div>

                <div className="flex gap-2 justify-end">
                  {hasExisting && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        resetLocationForm();
                        setShowForm(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button onClick={handleAddLocation} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Location
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dev-name">Device Name</Label>
                  <Input
                    id="dev-name"
                    placeholder="e.g. Front Door Terminal"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-code">Device Code</Label>
                  <Input
                    id="dev-code"
                    placeholder="e.g. DEV001"
                    value={devCode}
                    onChange={(e) => setDevCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    A unique identifier for this device.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-ip">IP Address (optional)</Label>
                  <Input
                    id="dev-ip"
                    placeholder="e.g. 192.168.1.100"
                    value={devIp}
                    onChange={(e) => setDevIp(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  {hasExisting && (
                    <Button variant="ghost" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  )}
                  <Button onClick={handleAddDevice} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Device
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        hasExisting && mode === 'LOCATION' && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add another location
          </Button>
        )
      )}

      {/* Continue button */}
      {hasExisting && !showForm && (
        <div className="flex justify-end pt-2">
          <Button onClick={onComplete}>Continue</Button>
        </div>
      )}
    </div>
  );
}
