'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { attendanceSettingsService } from '@/services/attendance-settings.service';
import { LocationFormDialog } from '@/components/settings/location-form-dialog';
import { DeviceFormDialog } from '@/components/settings/device-form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useTranslation } from '@/i18n';
import type {
  LocationItem,
  DeviceItem,
  LocationPayload,
  LocationUpdatePayload,
  DevicePayload,
  DeviceUpdatePayload,
  AttendanceSettingData,
} from '@/types';
import {
  MapPin,
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Settings2,
  Loader2,
  Radio,
  Wifi,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { motion, AnimatePresence } from 'motion/react';

interface AttendanceSettingsTabProps {
  selectedSid: string;
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 24 };

export function AttendanceSettingsTab({ selectedSid }: AttendanceSettingsTabProps) {
  const { t } = useTranslation('admin');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [deviceFormOpen, setDeviceFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);
  const [deleteLocationCode, setDeleteLocationCode] = useState<string | null>(null);
  const [deleteDeviceCode, setDeleteDeviceCode] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [attendanceSetting, setAttendanceSetting] = useState<AttendanceSettingData | null>(null);
  const [settingExists, setSettingExists] = useState<boolean | null>(null);
  const [loadingSetting, setLoadingSetting] = useState(false);
  const [initializingMode, setInitializingMode] = useState<'LOCATION' | 'DEVICE' | null>(null);

  const [modeSwitchTarget, setModeSwitchTarget] = useState<'LOCATION' | 'DEVICE' | null>(null);
  const [modeSwitchLoading, setModeSwitchLoading] = useState(false);

  // ─── Fetchers ──────────────────────────────────────────────────────────────

  const fetchLocations = useCallback(async () => {
    if (!selectedSid) return;
    setLoadingLocations(true);
    try {
      const res = await attendanceSettingsService.getLocationList(selectedSid);
      setLocations(res.success && res.data ? res.data : []);
    } catch {
      setLocations([]);
      toast.error(t('failedLoadLocations'));
    } finally {
      setLoadingLocations(false);
    }
  }, [selectedSid, t]);

  const fetchDevices = useCallback(async () => {
    if (!selectedSid) return;
    setLoadingDevices(true);
    try {
      const res = await attendanceSettingsService.getDeviceList(selectedSid);
      setDevices(res.success && res.data ? res.data : []);
    } catch {
      setDevices([]);
      toast.error(t('failedLoadDevices'));
    } finally {
      setLoadingDevices(false);
    }
  }, [selectedSid, t]);

  const fetchAttendanceSetting = useCallback(async () => {
    if (!selectedSid) return;
    setLoadingSetting(true);
    setSettingExists(null);
    try {
      const res = await attendanceSettingsService.getAttendanceSetting(selectedSid);
      if (res.success && res.data) {
        setAttendanceSetting(res.data);
        setSettingExists(true);
      } else {
        setAttendanceSetting(null);
        setSettingExists(false);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setSettingExists(false);
      } else {
        toast.error(t('failedLoadSetting'));
      }
      setAttendanceSetting(null);
      setSettingExists(false);
    } finally {
      setLoadingSetting(false);
    }
  }, [selectedSid, t]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);
  useEffect(() => { fetchDevices(); }, [fetchDevices]);
  useEffect(() => { fetchAttendanceSetting(); }, [fetchAttendanceSetting]);

  // ─── CRUD handlers ─────────────────────────────────────────────────────────

  const handleLocationSubmit = async (payload: LocationPayload | LocationUpdatePayload) => {
    if ('code' in payload) {
      await attendanceSettingsService.updateLocation(payload as LocationUpdatePayload);
    } else {
      await attendanceSettingsService.createLocation(payload as LocationPayload);
    }
    toast.success(t('locationSaved'));
    fetchLocations();
  };

  const handleDeviceSubmit = async (payload: DevicePayload | DeviceUpdatePayload) => {
    if ('code' in payload) {
      await attendanceSettingsService.updateDevice(payload as DeviceUpdatePayload);
    } else {
      await attendanceSettingsService.createDevice(payload as DevicePayload);
    }
    toast.success(t('deviceSaved'));
    fetchDevices();
  };

  const handleDeleteLocation = async () => {
    if (!deleteLocationCode) return;
    setDeleteLoading(true);
    try {
      await attendanceSettingsService.deleteLocation(deleteLocationCode);
      toast.success(t('locationDeleted'));
      setDeleteLocationCode(null);
      fetchLocations();
    } catch {
      toast.error(t('failedDeleteLocation'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deleteDeviceCode) return;
    setDeleteLoading(true);
    try {
      await attendanceSettingsService.deleteDevice(deleteDeviceCode);
      toast.success(t('deviceDeleted'));
      setDeleteDeviceCode(null);
      fetchDevices();
    } catch {
      toast.error(t('failedDeleteDevice'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleInitializeSetting = async (mode: 'LOCATION' | 'DEVICE') => {
    if (!selectedSid) return;
    setInitializingMode(mode);
    try {
      const res = await attendanceSettingsService.updateAttendanceSetting({ sid: selectedSid, mode });
      if (res.success && res.data) {
        setAttendanceSetting(res.data);
        setSettingExists(true);
        toast.success(t('modeInitialized').replace('{mode}', mode));
        if (mode === 'LOCATION') fetchLocations();
        else fetchDevices();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || t('failedInitSetting'));
    } finally {
      setInitializingMode(null);
    }
  };

  const handleModeSwitch = async () => {
    if (!selectedSid || !modeSwitchTarget) return;
    setModeSwitchLoading(true);
    try {
      const res = await attendanceSettingsService.updateAttendanceSetting({ sid: selectedSid, mode: modeSwitchTarget });
      if (res.success && res.data) {
        setAttendanceSetting(res.data);
        toast.success(t('modeSwitched').replace('{mode}', modeSwitchTarget!));
        fetchLocations();
        fetchDevices();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || t('failedSwitchMode'));
    } finally {
      setModeSwitchLoading(false);
      setModeSwitchTarget(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!selectedSid) return null;

  if (loadingSetting) {
    return (
      <Card className="dashboard-card overflow-hidden">
        <CardContent className="py-8">
          <Skeleton className="h-6 w-40 mx-auto mb-3" />
          <Skeleton className="h-4 w-56 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // ─── Init screen ───────────────────────────────────────────────────────────

  if (settingExists === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="text-center pb-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...SPRING, delay: 0.1 }}
              className="mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 p-4 w-fit mb-2"
            >
              <Settings2 className="h-7 w-7 text-primary" />
            </motion.div>
            <CardTitle>{t('setUpAttendance')}</CardTitle>
            <CardDescription>
              {t('chooseCheckInMethod')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 max-w-lg mx-auto">
              {([
                { mode: 'LOCATION' as const, icon: MapPin, label: t('gpsLocation'), desc: t('gpsDesc') },
                { mode: 'DEVICE' as const, icon: Monitor, label: t('deviceTerminal'), desc: t('deviceDesc') },
              ]).map((opt, i) => (
                <motion.button
                  key={opt.mode}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.2 + i * 0.1 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex flex-col items-center gap-2.5 rounded-xl border-2 border-muted p-6 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                  onClick={() => handleInitializeSetting(opt.mode)}
                  disabled={!!initializingMode}
                >
                  {initializingMode === opt.mode ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <div className="rounded-full bg-primary/10 p-3">
                      <opt.icon className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{opt.desc}</span>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ─── Active settings ───────────────────────────────────────────────────────

  const isLocationMode = attendanceSetting?.mode === 'LOCATION';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <Card className="dashboard-card overflow-hidden">
          {/* Mode header */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2.5">
              <div className={`rounded-lg p-1.5 ${isLocationMode ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                {isLocationMode
                  ? <MapPin className="h-4 w-4 text-emerald-500" />
                  : <Monitor className="h-4 w-4 text-blue-500" />
                }
              </div>
              <div>
                <p className="text-sm font-semibold">{isLocationMode ? t('gpsLocation') : t('deviceTerminal')}</p>
                <p className="text-[11px] text-muted-foreground">
                  {isLocationMode ? t('gpsSubtitle') : t('deviceSubtitle')}
                </p>
              </div>
              <Badge
                variant={attendanceSetting?.isActive ? 'default' : 'outline'}
                className={attendanceSetting?.isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500/20'
                  : ''
                }
              >
                <Radio className="mr-1 h-2.5 w-2.5" />
                {attendanceSetting?.isActive ? t('active') : t('inactive')}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setModeSwitchTarget(isLocationMode ? 'DEVICE' : 'LOCATION')}
            >
              {t('switchTo').replace('{mode}', isLocationMode ? t('deviceTerminal') : t('gpsLocation'))}
            </Button>
          </CardHeader>

          <CardContent className="pt-0">
            <AnimatePresence mode="wait">
              {isLocationMode ? (
                <motion.div
                  key="locations"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={SPRING}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('locations')}
                      <span className="text-muted-foreground font-normal">({locations.length})</span>
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => { setEditingLocation(null); setLocationFormOpen(true); }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {t('addLocation')}
                    </Button>
                  </div>

                  {loadingLocations ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full rounded-lg" />
                      <Skeleton className="h-16 w-full rounded-lg" />
                    </div>
                  ) : locations.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-8 text-center border rounded-xl border-dashed bg-muted/30"
                    >
                      <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2 animate-empty-bounce" />
                      <p className="text-sm text-muted-foreground">{t('noLocations')}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => { setEditingLocation(null); setLocationFormOpen(true); }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {t('addFirstLocation')}
                      </Button>
                    </motion.div>
                  ) : (
                    <ul className="space-y-2">
                      {locations.map((loc, i) => (
                        <motion.li
                          key={loc.code}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...SPRING, delay: i * 0.05 }}
                          className="group flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="rounded-lg bg-emerald-500/10 p-2 shrink-0">
                              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{loc.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {loc.radiusMeter}m radius
                                {loc.address ? ` · ${loc.address}` : ''}
                                {!loc.isActive && ` · ${t('inactive')}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => { setEditingLocation(loc); setLocationFormOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteLocationCode(loc.code)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="devices"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={SPRING}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('device')}
                    </h3>
                  </div>

                  {loadingDevices ? (
                    <Skeleton className="h-16 w-full rounded-lg" />
                  ) : devices.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-8 text-center border rounded-xl border-dashed bg-muted/30"
                    >
                      <Monitor className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2 animate-empty-bounce" />
                      <p className="text-sm text-muted-foreground">{t('noDevice')}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => { setEditingDevice(null); setDeviceFormOpen(true); }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {t('registerDevice')}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING}
                      className="group flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="rounded-lg bg-blue-500/10 p-2 shrink-0">
                          <Wifi className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{devices[0].name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {devices[0].deviceCode}
                            {devices[0].ipAddress ? ` · ${devices[0].ipAddress}` : ''}
                            {!devices[0].isActive && ` · ${t('inactive')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditingDevice(devices[0]); setDeviceFormOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteDeviceCode(devices[0].code)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Dialogs ─── */}
      <LocationFormDialog
        open={locationFormOpen}
        onOpenChange={setLocationFormOpen}
        sid={selectedSid}
        location={editingLocation}
        onSubmit={handleLocationSubmit}
      />
      <DeviceFormDialog
        open={deviceFormOpen}
        onOpenChange={setDeviceFormOpen}
        sid={selectedSid}
        device={editingDevice}
        onSubmit={handleDeviceSubmit}
      />
      <ConfirmDialog
        open={!!deleteLocationCode}
        onOpenChange={(open) => !open && setDeleteLocationCode(null)}
        title={t('deleteLocation')}
        description={t('deleteLocationDesc')}
        confirmLabel={t('delete')}
        variant="destructive"
        onConfirm={handleDeleteLocation}
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={!!deleteDeviceCode}
        onOpenChange={(open) => !open && setDeleteDeviceCode(null)}
        title={t('deleteDevice')}
        description={t('deleteDeviceDesc')}
        confirmLabel={t('delete')}
        variant="destructive"
        onConfirm={handleDeleteDevice}
        loading={deleteLoading}
      />
      <ConfirmDialog
        open={!!modeSwitchTarget}
        onOpenChange={(open) => !open && setModeSwitchTarget(null)}
        title={t('switchMode')}
        description={t('switchModeDesc').replace('{from}', isLocationMode ? t('gpsLocation') : t('deviceTerminal')).replace('{to}', modeSwitchTarget === 'LOCATION' ? t('gpsLocation') : t('deviceTerminal')).replace('{items}', isLocationMode ? t('locations').toLowerCase() : t('device').toLowerCase())}
        confirmLabel={t('switchModeBtn')}
        variant="destructive"
        onConfirm={handleModeSwitch}
        loading={modeSwitchLoading}
      />
    </>
  );
}
