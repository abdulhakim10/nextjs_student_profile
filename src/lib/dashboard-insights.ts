import type { DashboardSummary, AttendanceChartData } from '@/types';
import type { TranslationFn } from '@/i18n';

export interface Insight {
  id: string;
  icon: string;
  title: string;
  description: string;
  severity: 'positive' | 'negative' | 'warning' | 'neutral';
}

export function computeInsights(
  summary: DashboardSummary | null,
  trendData: AttendanceChartData[],
  t?: TranslationFn
): Insight[] {
  const tr = t ?? ((k: string) => k);

  if (!summary) return [{ id: 'no-data', icon: '\u{1F4CA}', title: tr('noData'), description: tr('selectBranch'), severity: 'neutral' }];

  const insights: Insight[] = [];
  const rate = summary.attendance_rate;

  if (rate >= 95) {
    insights.push({
      id: 'excellent-rate',
      icon: '\u{1F3C6}',
      title: tr('excellentAttendance'),
      description: `${rate}% ${tr('attendanceRateToday')}`,
      severity: 'positive',
    });
  } else if (rate < 80) {
    insights.push({
      id: 'low-rate',
      icon: '\u26A0\uFE0F',
      title: tr('lowAttendanceAlert'),
      description: `${rate}% ${tr('onlyAttendanceRate')}`,
      severity: 'negative',
    });
  }

  if (summary.late_today > 0) {
    const latePercent = summary.total_staff > 0
      ? Math.round((summary.late_today / summary.total_staff) * 100)
      : 0;
    insights.push({
      id: 'late-arrivals',
      icon: '\u23F0',
      title: `${summary.late_today} ${summary.late_today > 1 ? tr('lateArrivals') : tr('lateArrival')}`,
      description: latePercent > 15 ? `${latePercent}% ${tr('staffLatePercent')}` : tr('fewEmployeesLate'),
      severity: latePercent > 15 ? 'warning' : 'neutral',
    });
  }

  if (summary.absent_today === 0 && summary.total_staff > 0) {
    insights.push({
      id: 'perfect-day',
      icon: '\u2728',
      title: tr('perfectDay'),
      description: tr('zeroAbsences'),
      severity: 'positive',
    });
  }

  if (trendData.length >= 2) {
    const today = trendData[trendData.length - 1];
    const yesterday = trendData[trendData.length - 2];
    const diff = today.present - yesterday.present;
    if (diff > 0) {
      insights.push({
        id: 'trend-up',
        icon: '\u{1F4C8}',
        title: tr('improving'),
        description: `${diff} ${tr('morePresentThanYesterday')}`,
        severity: 'positive',
      });
    } else if (diff < 0) {
      insights.push({
        id: 'trend-down',
        icon: '\u{1F4C9}',
        title: tr('declining'),
        description: `${Math.abs(diff)} ${tr('fewerPresentThanYesterday')}`,
        severity: 'negative',
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: 'summary',
      icon: '\u{1F4CA}',
      title: tr('dailySummary'),
      description: `${summary.present_today} ${tr('present')}, ${summary.absent_today} ${tr('absent')}, ${summary.late_today} ${tr('late')}`,
      severity: 'neutral',
    });
  }

  return insights;
}
