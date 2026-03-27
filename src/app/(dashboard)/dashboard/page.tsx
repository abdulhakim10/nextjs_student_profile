'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { useSetupStatus } from '@/hooks/use-setup-status';
import { useTranslation } from '@/i18n';
import { BranchSelector } from '@/components/dashboard/branch-selector';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { AttendanceChart } from '@/components/dashboard/attendance-chart';
import { AttendanceBreakdown } from '@/components/dashboard/attendance-breakdown';
import { AlertsExceptions } from '@/components/dashboard/alerts-exceptions';
import { AISmartInsights } from '@/components/dashboard/ai-smart-insights';
import { WeeklyHeatmap } from '@/components/dashboard/weekly-heatmap';
import { LateDistribution } from '@/components/dashboard/late-distribution';
import { TopPerformers } from '@/components/dashboard/top-performers';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';
import { SetupCTACard } from '@/components/dashboard/setup-cta-card';
import { UnassignedStaffAlert } from '@/components/dashboard/unassigned-staff-alert';
import { Building2, CalendarDays } from 'lucide-react';

export default function DashboardPage() {
  const { userData } = useAuthStore();
  const { branches, selectedSid, setSelectedSid, loadingBranches } =
    useBranchSelector();
  const { status: setupStatus, loading: setupLoading } = useSetupStatus(selectedSid);
  const { t: tDashboard } = useTranslation('dashboard');
  const { t: tGreeting } = useTranslation('greeting');
  const { locale } = useTranslation('common');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? tGreeting('morning') : hour < 17 ? tGreeting('afternoon') : tGreeting('evening');
  const greetingEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

  const todayFormatted = new Date().toLocaleDateString(
    locale === 'ms' ? 'ms-MY' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <MotionStagger className="space-y-6">
      {/* Setup CTA — shown when setup is incomplete */}
      <MotionCard>
        <SetupCTACard status={setupStatus} loading={setupLoading} />
      </MotionCard>

      {/* Unassigned staff alert — shown only when setup is complete */}
      <MotionCard>
        <UnassignedStaffAlert
          selectedSid={selectedSid}
          setupCompleted={setupStatus?.completed ?? false}
        />
      </MotionCard>

      {/* Greeting + Branch selector */}
      <MotionCard>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div>
              <h1 className="animate-text-reveal text-xl font-bold tracking-tight flex items-center gap-2">
                {greeting}, {userData?.user_name || 'Admin'}
                <span className="text-lg">{greetingEmoji}</span>
              </h1>
              <p className="animate-text-reveal-delayed text-sm text-muted-foreground mt-0.5">{tDashboard('subtitle')}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <BranchSelector
                branches={branches}
                selectedSid={selectedSid}
                onBranchChange={setSelectedSid}
                loading={loadingBranches}
              />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{todayFormatted}</span>
          </div>
        </div>
      </MotionCard>

      {/* Row 2: Summary Cards */}
      <MotionCard>
        <SummaryCards selectedSid={selectedSid} />
      </MotionCard>

      {/* Row 3: Attendance Trend (hero 2/3) + Breakdown Donut (1/3) */}
      <MotionCard>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AttendanceChart selectedSid={selectedSid} />
          </div>
          <AttendanceBreakdown selectedSid={selectedSid} />
        </div>
      </MotionCard>

      {/* Row 4: Weekly Heatmap (1/2) + Clock-in Timeline (1/2) */}
      <MotionCard>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <WeeklyHeatmap selectedSid={selectedSid} />
          <LateDistribution selectedSid={selectedSid} />
        </div>
      </MotionCard>

      {/* Row 5: Smart Insights + Alerts + Top Performers (equal thirds) */}
      <MotionCard>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AISmartInsights selectedSid={selectedSid} />
          <AlertsExceptions selectedSid={selectedSid} />
          <TopPerformers selectedSid={selectedSid} />
        </div>
      </MotionCard>
    </MotionStagger>
  );
}
