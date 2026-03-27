'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { attendanceService } from '@/services/attendance.service';
import type { AttendanceChartData } from '@/types';
import { BarChart3 } from 'lucide-react';
import { DashboardSection, ChartStateWrapper } from '@/components/dashboard/motion-wrapper';
import { useTranslation } from '@/i18n';
import { toISODate } from '@/lib/date-utils';
import {
  STATUS_COLORS,
  TOOLTIP_CONTENT_STYLE,
  LEGEND_PROPS,
  AXIS_PROPS,
  GRID_PROPS,
  CHART_HEIGHT,
} from '@/components/dashboard/chart-constants';

interface AttendanceChartProps {
  selectedSid: string;
}

type Period = 'weekly' | 'monthly';

const PERIOD_DAYS: Record<Period, number> = { weekly: 6, monthly: 29 };

function getDateRange(period: Period) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - PERIOD_DAYS[period]);
  return { start_date: toISODate(start), end_date: toISODate(end) };
}

export function AttendanceChart({ selectedSid }: AttendanceChartProps) {
  const { t } = useTranslation('dashboard');
  const { t: tStatus } = useTranslation('status');
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<AttendanceChartData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedSid) {
      setData([]);
      return;
    }
    setLoading(true);
    try {
      const { start_date, end_date } = getDateRange(period);
      const res = await attendanceService.getReport({
        sid: selectedSid,
        report_type: period,
        start_date,
        end_date,
      });
      if (res.success && res.data?.dailyBreakdown) {
        setData(
          res.data.dailyBreakdown.map((d: AttendanceChartData) =>
            d.restDay ? { ...d, present: 0, late: 0, absent: 0 } : d
          )
        );
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSid, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periodTabs = (
    <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
      <TabsList className="h-8">
        <TabsTrigger value="weekly" className="text-xs px-3 h-6">{t('weekly')}</TabsTrigger>
        <TabsTrigger value="monthly" className="text-xs px-3 h-6">{t('monthly')}</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <DashboardSection
      icon={BarChart3}
      iconBg="bg-blue-100 dark:bg-blue-900/40"
      iconColor="text-blue-600 dark:text-blue-400"
      title={t('attendanceTrend')}
      action={periodTabs}
      delay={0.1}
    >
      <ChartStateWrapper
        selectedSid={selectedSid}
        loading={loading}
        hasData={data.length > 0}
        noBranchIcon={BarChart3}
        noBranchTitle={t('selectBranchTrend')}
        emptyIcon={BarChart3}
        emptyTitle={t('noDataPeriod')}
        emptyIconClassName="bg-blue-100 dark:bg-blue-900/30 text-blue-500"
        chartKey={period}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradientPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={STATUS_COLORS.present} stopOpacity={0.3} />
                <stop offset="95%" stopColor={STATUS_COLORS.present} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradientLate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={STATUS_COLORS.late} stopOpacity={0.3} />
                <stop offset="95%" stopColor={STATUS_COLORS.late} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradientAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={STATUS_COLORS.absent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={STATUS_COLORS.absent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
              {...AXIS_PROPS}
            />
            <YAxis {...AXIS_PROPS} />
            <Tooltip
              labelFormatter={(v) => {
                const d = new Date(v);
                const label = d.toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const entry = data.find((item) => item.date === v);
                if (entry?.restDay) return `${label} (Rest Day)`;
                return label;
              }}
              contentStyle={TOOLTIP_CONTENT_STYLE}
            />
            <Legend {...LEGEND_PROPS} />
            <Area type="monotone" dataKey="present" stroke={STATUS_COLORS.present} strokeWidth={2.5} fill="url(#gradientPresent)" name={tStatus('present')} animationDuration={1200} animationEasing="ease-out" />
            <Area type="monotone" dataKey="late" stroke={STATUS_COLORS.late} strokeWidth={2.5} fill="url(#gradientLate)" name={tStatus('late')} animationDuration={1400} animationEasing="ease-out" />
            <Area type="monotone" dataKey="absent" stroke={STATUS_COLORS.absent} strokeWidth={2.5} fill="url(#gradientAbsent)" name={tStatus('absent')} animationDuration={1600} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartStateWrapper>
    </DashboardSection>
  );
}
