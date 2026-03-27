'use client';

import { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { attendanceService } from '@/services/attendance.service';
import { mapApiToSummary } from '@/lib/dashboard-utils';
import type { DashboardSummary } from '@/types';
import { PieChartIcon } from 'lucide-react';
import { DashboardSection, ChartStateWrapper } from '@/components/dashboard/motion-wrapper';
import { useTranslation } from '@/i18n';
import {
  STATUS_COLORS,
  TOOLTIP_CONTENT_STYLE,
  LEGEND_PROPS,
  CHART_HEIGHT,
} from '@/components/dashboard/chart-constants';

interface AttendanceBreakdownProps {
  selectedSid: string;
}

interface BreakdownEntry {
  name: string;
  value: number;
  color: string;
  key: string;
}

const RADIAN = Math.PI / 180;

function renderDonutLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);
  if (!percent || percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-semibold"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function AttendanceBreakdown({ selectedSid }: AttendanceBreakdownProps) {
  const { t } = useTranslation('dashboard');
  const { t: tStatus } = useTranslation('status');
  const [data, setData] = useState<BreakdownEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    if (!selectedSid) {
      setData([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await attendanceService.getDashboardSummary(selectedSid);
      if (res.success && res.data) {
        const summary: DashboardSummary = mapApiToSummary(res.data);
        const entries: BreakdownEntry[] = [
          { name: tStatus('present'), value: summary.present_today, color: STATUS_COLORS.present, key: 'present' },
          { name: tStatus('late'), value: summary.late_today, color: STATUS_COLORS.late, key: 'late' },
          { name: tStatus('absent'), value: summary.absent_today, color: STATUS_COLORS.absent, key: 'absent' },
          { name: t('onLeave'), value: summary.on_leave_today, color: STATUS_COLORS.onLeave, key: 'onLeave' },
        ].filter((e) => e.value > 0);
        setData(entries);
        setTotal(summary.total_staff);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedSid, t, tStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardSection
      icon={PieChartIcon}
      iconBg="bg-violet-100 dark:bg-violet-900/40"
      iconColor="text-violet-600 dark:text-violet-400"
      title={t('attendanceBreakdown')}
      action={
        total > 0 ? (
          <span className="text-[10px] font-medium text-muted-foreground">
            {total} {t('totalStaff').toLowerCase()}
          </span>
        ) : undefined
      }
      delay={0.15}
    >
      <ChartStateWrapper
        selectedSid={selectedSid}
        loading={loading}
        hasData={data.length > 0}
        noBranchIcon={PieChartIcon}
        noBranchTitle={t('selectBranchBreakdown')}
        emptyIcon={PieChartIcon}
        emptyTitle={t('noDataToday')}
        emptyIconClassName="bg-violet-100 dark:bg-violet-900/30 text-violet-500"
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
              label={renderDonutLabel}
              labelLine={false}
              animationBegin={200}
              animationDuration={1000}
              animationEasing="ease-out"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} staff`, name]}
              contentStyle={TOOLTIP_CONTENT_STYLE}
            />
            <Legend {...LEGEND_PROPS} />
          </PieChart>
        </ResponsiveContainer>
      </ChartStateWrapper>
    </DashboardSection>
  );
}
