'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Eye } from 'lucide-react';
import { formatTime } from '@/lib/date-utils';
import { useTranslation } from '@/i18n';
import type { AttendanceRecord } from '@/types';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  loading: boolean;
}

export function AttendanceTable({ records, loading }: AttendanceTableProps) {
  const { t } = useTranslation('attendance');
  const { t: tCommon } = useTranslation('common');

  const headers = [
    { key: 'date', label: tCommon('date') },
    { key: 'name', label: tCommon('name') },
    { key: 'uid', label: 'UID' },
    { key: 'clockIn', label: t('clockIn') },
    { key: 'clockOut', label: t('clockOut') },
    { key: 'workHours', label: t('workHours') },
    { key: 'status', label: t('status') },
    { key: 'actions', label: tCommon('actions'), className: 'w-[80px]' },
  ];

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h.key} className={`py-3 ${h.className || ''}`}>{h.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: headers.length }).map((_, j) => (
                  <TableCell key={j} className="py-3">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (records.length === 0) {
    return <EmptyState title={t('noRecords')} description={t('noRecordsHint')} />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h.key} className={`py-3 ${h.className || ''}`}>{h.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, idx) => (
            <TableRow key={`${record.uid}-${record.date}-${idx}`}>
              <TableCell className="py-3">{record.date || '-'}</TableCell>
              <TableCell className="py-3 font-medium">{record.name || '-'}</TableCell>
              <TableCell className="py-3 text-muted-foreground">{record.uid || '-'}</TableCell>
              <TableCell className="py-3">{formatTime(record.clockInTime)}</TableCell>
              <TableCell className="py-3">{formatTime(record.clockOutTime)}</TableCell>
              <TableCell className="py-3">{record.workHours != null ? record.workHours : '-'}</TableCell>
              <TableCell className="py-3">
                <StatusBadge status={record.status || '-'} />
              </TableCell>
              <TableCell className="py-3">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/attendance/${record.uid}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
