'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { attendanceSettingsService } from '@/services/attendance-settings.service';
import { MapPin, Monitor, Loader2, Check } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/i18n';

interface StepAttendanceModeProps {
  sid: string;
  currentMode: 'LOCATION' | 'DEVICE' | null;
  onComplete: (mode: 'LOCATION' | 'DEVICE') => void;
}

export function StepAttendanceMode({ sid, currentMode, onComplete }: StepAttendanceModeProps) {
  const { t } = useTranslation('admin');
  const [loading, setLoading] = useState<'LOCATION' | 'DEVICE' | null>(null);

  const handleSelect = async (mode: 'LOCATION' | 'DEVICE') => {
    setLoading(mode);
    try {
      const res = await attendanceSettingsService.updateAttendanceSetting({ sid, mode });
      if (res.success) {
        toast.success(t('modeSetTo').replace('{mode}', mode === 'LOCATION' ? t('gpsLocationFull') : t('deviceTerminalFull')));
        onComplete(mode);
      }
    } catch {
      toast.error('Failed to set attendance mode');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t('howCheckIn')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('howCheckInDesc')}
        </p>
      </div>

      {currentMode && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <Check className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm">
            {t('currentlySetTo')} <Badge variant="secondary">{currentMode === 'LOCATION' ? t('gpsLocationFull') : t('deviceTerminalFull')}</Badge>.
            {' '}{t('canChangeBelow')}
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
            currentMode === 'LOCATION' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => !loading && handleSelect('LOCATION')}
        >
          <CardHeader className="text-center pb-2">
            {loading === 'LOCATION' ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            ) : (
              <MapPin className="h-10 w-10 text-primary mx-auto" />
            )}
            <CardTitle className="text-base">{t('gpsLocationFull')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <CardDescription>
              {t('gpsLocationDesc')}
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
            currentMode === 'DEVICE' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => !loading && handleSelect('DEVICE')}
        >
          <CardHeader className="text-center pb-2">
            {loading === 'DEVICE' ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            ) : (
              <Monitor className="h-10 w-10 text-primary mx-auto" />
            )}
            <CardTitle className="text-base">{t('deviceTerminalFull')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <CardDescription>
              {t('deviceTerminalDesc')}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {currentMode && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onComplete(currentMode)}>
            Keep current setting & continue
          </Button>
        </div>
      )}
    </div>
  );
}
