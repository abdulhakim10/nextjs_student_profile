'use client';

import { Badge } from '@/components/ui/badge';
import { ATTENDANCE_STATUS_COLORS } from '@/config/constants';
import { useTranslation } from '@/i18n';

const STATUS_KEY_MAP: Record<string, string> = {
  present: 'present',
  absent: 'absent',
  late: 'late',
  'half day': 'halfDay',
  leave: 'leave',
  holiday: 'holiday',
  rest_day: 'restDay',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation('status');
  const key = status.toLowerCase();
  const translationKey = STATUS_KEY_MAP[key];
  const display = translationKey ? t(translationKey) : status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <Badge
      variant="secondary"
      className={ATTENDANCE_STATUS_COLORS[key] || ''}
    >
      {display}
    </Badge>
  );
}
