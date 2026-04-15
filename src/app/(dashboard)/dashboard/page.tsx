'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/i18n';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { MotionStagger, MotionCard } from '@/components/dashboard/motion-wrapper';
import { CalendarDays } from 'lucide-react';

export default function DashboardPage() {
  const { userData } = useAuthStore();
  const { t: tDashboard } = useTranslation('dashboard');
  const { t: tGreeting } = useTranslation('greeting');
  const { locale } = useTranslation('common');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? tGreeting('morning') : hour < 17 ? tGreeting('afternoon') : tGreeting('evening');
  const greetingEmoji = hour < 12 ? '\u{1F305}' : hour < 17 ? '\u{2600}\u{FE0F}' : '\u{1F319}';

  const todayFormatted = new Date().toLocaleDateString(
    locale === 'ms' ? 'ms-MY' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <MotionStagger className="space-y-6">
      <MotionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="animate-text-reveal text-xl font-bold tracking-tight flex items-center gap-2">
              {greeting}, {userData?.user_name || 'Admin'}
              <span className="text-lg">{greetingEmoji}</span>
            </h1>
            <p className="animate-text-reveal-delayed text-sm text-muted-foreground mt-0.5">{tDashboard('subtitle')}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{todayFormatted}</span>
          </div>
        </div>
      </MotionCard>

      <MotionCard>
        <SummaryCards />
      </MotionCard>
    </MotionStagger>
  );
}
