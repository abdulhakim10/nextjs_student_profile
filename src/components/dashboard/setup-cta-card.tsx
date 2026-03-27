'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Rocket, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SetupStatus } from '@/lib/setup-status';

interface SetupCTACardProps {
  status: SetupStatus | null;
  loading: boolean;
}

export function SetupCTACard({ status, loading }: SetupCTACardProps) {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();

  if (loading || !status || status.completed) return null;

  const progressPercent = (status.completedSteps / status.totalSteps) * 100;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 p-6 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5">
      {/* Animated background blobs */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl animate-float" />
      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl animate-float-delayed" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="animate-rocket rounded-full bg-primary/10 p-3 shrink-0">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{t('completeSetup')}</h3>
            <p className="text-sm text-muted-foreground">
              {status.completedSteps} {tCommon('of')} {status.totalSteps} {t('stepsDone')}
              {' — '}
              {tCommon('next')}: <span className="font-medium text-foreground">{t(status.steps.find((s) => !s.completed)?.labelKey ?? '')}</span>
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-48 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 animate-progress-shimmer rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={() => router.push('/admin/setup')}
          className="shrink-0 hover:scale-105 active:scale-95 transition-transform duration-200 shadow-md shadow-primary/20"
        >
          {t('continueSetup')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
