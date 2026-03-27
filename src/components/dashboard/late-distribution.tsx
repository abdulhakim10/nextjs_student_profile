'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { attendanceService } from '@/services/attendance.service';
import { adminSettingsService } from '@/services/admin-settings.service';
import type { AttendanceGroupItem, ScheduleTemplateItem } from '@/types';
import { Clock } from 'lucide-react';
import { DashboardSection, ChartStateWrapper } from '@/components/dashboard/motion-wrapper';
import { useTranslation } from '@/i18n';
import { toISODate } from '@/lib/date-utils';
import { STATUS_COLORS, TOOLTIP_CONTENT_STYLE, AXIS_PROPS } from '@/components/dashboard/chart-constants';

interface LateDistributionProps {
  selectedSid: string;
}

interface LateBucket {
  label: string;
  count: number;
  color: string;
}

const BUCKET_COLORS = [
  STATUS_COLORS.late,   // amber — mild
  '#f97316',            // orange — moderate
  STATUS_COLORS.absent, // red — severe
  '#dc2626',            // deep red — critical
] as const;

function parseMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return -1;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function getTodayDayKey(): string {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
}

export function LateDistribution({ selectedSid }: LateDistributionProps) {
  const { t } = useTranslation('dashboard');
  const [data, setData] = useState<LateBucket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selectedSid) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const today = toISODate(new Date());
      const dayKey = getTodayDayKey();

      // Fetch attendance, groups, employee profiles, and schedules in parallel
      const [attendanceRes, groupsRes, profilesRes] = await Promise.all([
        attendanceService.getList(
          { sid: selectedSid, start_date: today, end_date: today, status: 'late' },
          1,
          100
        ),
        adminSettingsService.getGroupList(selectedSid),
        adminSettingsService.getEmployeeProfileList(selectedSid),
      ]);

      const lateRecords = attendanceRes.success ? (attendanceRes.data?.list ?? []) : [];
      if (lateRecords.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const groups: AttendanceGroupItem[] = groupsRes.success ? (groupsRes.data ?? []) : [];
      const profiles = profilesRes.success ? (profilesRes.data ?? []) : [];

      // Fetch all unique schedule templates referenced by groups
      const scheduleCodes = [...new Set(groups.map((g) => g.scheduleTemplateCode).filter(Boolean))];
      const scheduleResults = await Promise.all(
        scheduleCodes.map((code) => adminSettingsService.getSchedule(code))
      );

      // Build lookup: scheduleCode → scheduled clockIn minutes for today
      const scheduleClockInMap = new Map<string, number>();
      for (const res of scheduleResults) {
        if (!res.success || !res.data) continue;
        const sched = res.data as ScheduleTemplateItem;
        const daySchedule = sched.schedule?.[dayKey];
        if (daySchedule?.enabled && daySchedule.clockIn) {
          scheduleClockInMap.set(sched.code, parseMinutes(daySchedule.clockIn));
        }
      }

      // Build lookup: uid → scheduled clockIn minutes
      const uidToGroup = new Map<string, string>();
      for (const p of profiles) {
        uidToGroup.set(p.uid, p.attendanceGroupCode);
      }

      const groupToSchedule = new Map<string, string>();
      for (const g of groups) {
        groupToSchedule.set(g.code, g.scheduleTemplateCode);
      }

      // Compute minutes-late for each late employee
      const lateMinutes: number[] = [];
      for (const record of lateRecords) {
        if (!record.clockInTime) continue;
        const actualMin = parseMinutes(record.clockInTime);
        if (actualMin < 0) continue;

        const groupCode = uidToGroup.get(record.uid);
        const schedCode = groupCode ? groupToSchedule.get(groupCode) : undefined;
        const scheduledMin = schedCode ? scheduleClockInMap.get(schedCode) : undefined;

        if (scheduledMin !== undefined && actualMin > scheduledMin) {
          lateMinutes.push(actualMin - scheduledMin);
        } else {
          // Fallback: we know they're late (status says so), estimate conservatively
          lateMinutes.push(15);
        }
      }

      // Bucket the late minutes
      const bucketLabels = [
        t('late1to15'),
        t('late15to30'),
        t('late30to60'),
        t('late60plus'),
      ];

      const counts = [0, 0, 0, 0];
      for (const mins of lateMinutes) {
        if (mins <= 15) counts[0]++;
        else if (mins <= 30) counts[1]++;
        else if (mins <= 60) counts[2]++;
        else counts[3]++;
      }

      const buckets: LateBucket[] = counts
        .map((count, i) => ({
          label: bucketLabels[i],
          count,
          color: BUCKET_COLORS[i],
        }))
        .filter((b) => b.count > 0);

      setData(buckets);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSid, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardSection
      icon={Clock}
      iconBg="bg-orange-100 dark:bg-orange-900/40"
      iconColor="text-orange-600 dark:text-orange-400"
      title={t('lateDistribution')}
      action={
        <span className="text-[10px] font-medium text-muted-foreground">{t('today')}</span>
      }
      delay={0.2}
    >
      <ChartStateWrapper
        selectedSid={selectedSid}
        loading={loading}
        hasData={data.length > 0}
        noBranchIcon={Clock}
        noBranchTitle={t('selectBranchLate')}
        emptyIcon={Clock}
        emptyTitle={t('noLateData')}
        emptyDescription={t('noLateDataDesc')}
        emptyIconClassName="bg-orange-100 dark:bg-orange-900/30 text-orange-500"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" barCategoryGap="30%">
            <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              {...AXIS_PROPS}
              width={85}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              formatter={(value) => [`${value} staff`, '']}
              labelStyle={{ fontWeight: 600 }}
            />
            <Bar
              dataKey="count"
              radius={[0, 6, 6, 0]}
              animationDuration={1200}
              animationEasing="ease-out"
              maxBarSize={36}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartStateWrapper>
    </DashboardSection>
  );
}
