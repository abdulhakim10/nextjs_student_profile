'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, UserPlus, TrendingUp } from 'lucide-react';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';
import { AnimatedNumber } from '@/components/dashboard/animated-number';
import { useTranslation } from '@/i18n';

const CARD_CONFIG = [
  {
    key: 'totalUsers',
    value: 128,
    icon: Users,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    tint: 'bg-blue-50/50 dark:bg-blue-950/20',
    accent: 'hover:shadow-blue-200/40 dark:hover:shadow-blue-800/20',
  },
  {
    key: 'activeUsers',
    value: 96,
    icon: UserCheck,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    tint: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    accent: 'hover:shadow-emerald-200/40 dark:hover:shadow-emerald-800/20',
  },
  {
    key: 'newThisMonth',
    value: 12,
    icon: UserPlus,
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    tint: 'bg-amber-50/50 dark:bg-amber-950/20',
    accent: 'hover:shadow-amber-200/40 dark:hover:shadow-amber-800/20',
  },
  {
    key: 'growthRate',
    value: 15,
    icon: TrendingUp,
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    tint: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    accent: 'hover:shadow-indigo-200/40 dark:hover:shadow-indigo-800/20',
    isPercentage: true,
  },
];

export function SummaryCards() {
  const { t } = useTranslation('dashboard');

  return (
    <MotionStagger className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {CARD_CONFIG.map((card) => {
        const Icon = card.icon;
        return (
          <MotionCard key={card.key}>
            <Card
              className={`overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-md ${card.accent} ${card.tint}`}
            >
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t(card.key)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-2xl font-bold tracking-tight">
                        <AnimatedNumber value={card.value} suffix={card.isPercentage ? '%' : ''} />
                      </p>
                    </div>
                  </div>
                  <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionCard>
        );
      })}
    </MotionStagger>
  );
}
