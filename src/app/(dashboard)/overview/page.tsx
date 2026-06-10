'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { useTranslation } from '@/i18n';
import { PageHeader } from '@/components/shared/page-header';
import { BranchPill } from '@/components/shared/branch-pill';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';
import { Home } from 'lucide-react';

export default function DashboardPage() {
  const { userData } = useAuthStore();
  const {
    branches,
    selectedSid,
    setSelectedSid,
    loadingBranches,
    isHQ,
    branchName,
    fetchBranches,
  } = useBranchSelector();
  const { t: tGreeting } = useTranslation('greeting');

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? tGreeting('morning')
      : hour < 17
        ? tGreeting('afternoon')
        : tGreeting('evening');

  return (
    <MotionStagger className="space-y-6">
      <MotionCard>
        <PageHeader
          icon={Home}
          accent="primary"
          title={`${greeting}, ${userData?.user_name || 'Admin'}`}
          subtitle="Quick-access landing — KPIs and common actions."
        >
          <BranchPill
            branches={branches}
            selectedSid={selectedSid}
            onBranchChange={setSelectedSid}
            loading={loadingBranches}
            isHQ={isHQ}
            branchName={branchName}
            onDistrictFilter={(d) => fetchBranches(d)}
          />
        </PageHeader>
      </MotionCard>

      {/* Summary cards — module-specific. Replace SummaryCards with your own widgets. */}
      <MotionCard>
        <SummaryCards />
      </MotionCard>
    </MotionStagger>
  );
}
