'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/attendance/status-badge';
import { formatDate, formatTime } from '@/lib/date-utils';
import { ArrowLeft, Clock, MapPin, Smartphone } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { AttendanceStatus } from '@/types';

/** Local type — no backend endpoint yet for attendance detail */
interface AttendanceDetailData {
  attendance_id: string;
  date: string;
  staff: {
    staff_id: string;
    staff_name: string;
    staff_email: string;
    staff_phone: string;
    staff_image: string;
    department: string;
  };
  check_in: {
    time: string;
    timestamp: string;
    location: string;
    location_address: string;
    method: string;
    image: string;
    device: string;
  } | null;
  check_out: {
    time: string;
    timestamp: string;
    location: string;
    location_address: string;
    method: string;
    image: string;
    device: string;
  } | null;
  work_hours: string;
  status: AttendanceStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

// TODO: Replace with real API call when backend endpoint is available
const MOCK_DETAIL: AttendanceDetailData = {
  attendance_id: 'ATT001',
  date: '2026-02-24',
  staff: {
    staff_id: 'S001',
    staff_name: 'Ahmad Razif',
    staff_email: 'ahmad@example.com',
    staff_phone: '0183884743',
    staff_image: '',
    department: 'IT Department',
  },
  check_in: {
    time: '08:15:00',
    timestamp: '2026-02-24T08:15:00Z',
    location: '3.0552785,101.6046591',
    location_address: 'Office Building A',
    method: 'QR Code',
    image: '',
    device: 'Mobile App',
  },
  check_out: {
    time: '17:30:00',
    timestamp: '2026-02-24T17:30:00Z',
    location: '3.0552785,101.6046591',
    location_address: 'Office Building A',
    method: 'QR Code',
    image: '',
    device: 'Mobile App',
  },
  work_hours: '9.25',
  status: 'Present',
  notes: '',
  created_at: '2026-02-24T08:15:00Z',
  updated_at: '2026-02-24T17:30:00Z',
};

export default function AttendanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('attendance');
  const { t: tCommon } = useTranslation('common');
  const [detail, setDetail] = useState<AttendanceDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No backend endpoint yet — use mock data
    setDetail(MOCK_DETAIL);
    setLoading(false);
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <p>{t('recordNotFound')}</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          {t('goBack')}
        </Button>
      </div>
    );
  }

  const CheckInfo = ({
    title,
    data,
  }: {
    title: string;
    data: AttendanceDetailData['check_in'];
  }) => (
    <div className="space-y-3">
      <h4 className="font-semibold">{title}</h4>
      {data ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(data.time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{data.location_address || data.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <span>
              {data.method} ({data.device})
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{tCommon('noData')}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('attendanceDetail')}
          </h1>
          <p className="text-muted-foreground">{formatDate(detail.date)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Staff Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('staffInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 rounded-xl">
                <AvatarImage
                  src={detail.staff.staff_image}
                  alt={detail.staff.staff_name}
                />
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/80 to-primary/40 text-white text-lg font-medium">
                  {detail.staff.staff_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">
                  {detail.staff.staff_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {detail.staff.department}
                </p>
                <p className="text-sm text-muted-foreground">
                  {detail.staff.staff_email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t('summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('status')}</span>
              <StatusBadge status={detail.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('workHours')}</span>
              <span className="font-semibold">{detail.work_hours} {t('hrs')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('date')}</span>
              <span>{formatDate(detail.date)}</span>
            </div>
            {detail.notes && (
              <div>
                <span className="text-muted-foreground">{t('notes')}</span>
                <p className="mt-1 text-sm">{detail.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Check In / Check Out Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('checkInOut')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <CheckInfo title={t('checkIn')} data={detail.check_in} />
            <div>
              <Separator className="md:hidden mb-4" />
              <CheckInfo title={t('checkOut')} data={detail.check_out} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
