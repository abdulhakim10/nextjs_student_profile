'use client';

import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';
import { useTranslation } from '@/i18n';

/**
 * Analytics page — charts, heatmaps, and insights live here. Distinct from
 * `/overview` (quick-action landing). Both routes ship in every module so
 * forks can populate them with module-specific content while keeping the
 * convention consistent across the workspace.
 */
export default function DashboardPage() {
  const { t } = useTranslation('navigation');

  return (
    <MotionStagger className="space-y-6">
      <MotionCard>
        <PageHeader
          icon={BarChart3}
          accent="blue"
          title={t('dashboard')}
          subtitle="Analytics, charts and insights."
        />
      </MotionCard>

      <MotionCard>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Add your module&apos;s charts and analytics widgets here.
          </CardContent>
        </Card>
      </MotionCard>
    </MotionStagger>
  );
}
