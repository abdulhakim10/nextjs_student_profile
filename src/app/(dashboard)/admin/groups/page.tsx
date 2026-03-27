'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Building2, MapPin, Users, Clock } from 'lucide-react';
import { useBranchSelector } from '@/hooks/use-branch-selector';
import { BranchSelector } from '@/components/dashboard/branch-selector';
import { AttendanceSettingsTab } from '@/components/settings/attendance-settings-tab';
import { GroupsTabPanel } from '@/components/admin/groups-tab-panel';
import { WorkingPoliciesTabPanel } from '@/components/admin/working-policies-tab-panel';
import { useTranslation } from '@/i18n';

const STEPS: {
  step: number;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  bg: string;
  text: string;
  darkBg: string;
  darkText: string;
  hasOptional?: boolean;
}[] = [
  {
    step: 1,
    icon: MapPin,
    titleKey: 'stepWhereTitle',
    descriptionKey: 'stepWhereDesc',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    darkBg: 'dark:bg-emerald-900/40',
    darkText: 'dark:text-emerald-400',
  },
  {
    step: 2,
    icon: Users,
    titleKey: 'stepWhoTitle',
    descriptionKey: 'stepWhoDesc',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    darkBg: 'dark:bg-blue-900/40',
    darkText: 'dark:text-blue-400',
  },
  {
    step: 3,
    icon: Clock,
    titleKey: 'stepWhenTitle',
    descriptionKey: 'stepWhenDesc',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    darkBg: 'dark:bg-purple-900/40',
    darkText: 'dark:text-purple-400',
    hasOptional: true,
  },
];

function StepHeader({ config }: { config: (typeof STEPS)[number] }) {
  const Icon = config.icon;
  const { t: tAdmin } = useTranslation('admin');
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`}
      >
        {config.step}
      </div>
      <div>
        <h2 className="text-base font-semibold flex items-center gap-1.5">
          <Icon className={`h-4 w-4 ${config.text.replace('700', '600')} ${config.darkText}`} />
          {tAdmin(config.titleKey)}
        </h2>
        <p className="text-xs text-muted-foreground">
          {tAdmin(config.descriptionKey)}
          {config.hasOptional && (
            <>
              {' '}
              <span className="italic">({tAdmin('optional')})</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default function AttendanceSettingsPage() {
  const { branches, selectedSid, setSelectedSid, loadingBranches } = useBranchSelector();
  const { t } = useTranslation('dashboard');
  const { t: tAdmin } = useTranslation('admin');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{tAdmin('attendanceSettings')}</h1>
        <p className="text-sm text-muted-foreground">
          {tAdmin('attendanceSettingsDesc')}
        </p>
      </div>

      {/* Branch selector */}
      <div className="inline-flex items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2 shadow-sm">
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">{t('branch')}</span>
        <BranchSelector
          branches={branches}
          selectedSid={selectedSid}
          onBranchChange={setSelectedSid}
          loading={loadingBranches}
        />
      </div>

      {/* Step 1: Where */}
      <section className="space-y-3">
        <StepHeader config={STEPS[0]} />
        <AttendanceSettingsTab selectedSid={selectedSid} />
      </section>

      {/* Step 2: Who */}
      <section className="space-y-3">
        <StepHeader config={STEPS[1]} />
        <GroupsTabPanel selectedSid={selectedSid} />
      </section>

      {/* Step 3: When */}
      <section className="space-y-3">
        <StepHeader config={STEPS[2]} />
        <WorkingPoliciesTabPanel selectedSid={selectedSid} />
      </section>
    </div>
  );
}
