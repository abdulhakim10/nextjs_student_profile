'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserX, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { userService } from '@/services/user.service';
import { adminSettingsService } from '@/services/admin-settings.service';
import { useTranslation } from '@/i18n';

interface UnassignedStaffAlertProps {
  selectedSid: string;
  setupCompleted: boolean;
}

export function UnassignedStaffAlert({ selectedSid, setupCompleted }: UnassignedStaffAlertProps) {
  const { t } = useTranslation('dashboard');
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!setupCompleted || !selectedSid ) {
      setCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [staffRes, profilesRes] = await Promise.all([
        userService.fetchUsers({ branch: selectedSid, pageLimit: 9999, status: '0' }),
        adminSettingsService.getEmployeeProfileList(selectedSid),
      ]);

      const allStaff = staffRes.success && staffRes.data?.dataset ? staffRes.data.dataset : [];
      const profiles = profilesRes.success && profilesRes.data ? profilesRes.data : [];

      const assignedUids = new Set(profiles.map((p) => p.uid));
      setCount(allStaff.filter((s) => !assignedUids.has(s.uid)).length);
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [selectedSid, setupCompleted]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
      className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/20 px-5 py-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 dark:bg-amber-500/20">
            <UserX className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {t('unassignedStaffTitle').replace('{count}', String(count))}
            </p>
            <p className="text-xs text-amber-700/70 dark:text-amber-300/60">
              {t('unassignedStaffDesc')}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/employee-profiles')}
          className="shrink-0 border-amber-500/30 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950/50"
        >
          {t('assignNow')}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
