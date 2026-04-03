'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/i18n';
import { CalendarDays } from 'lucide-react';

export default function DashboardPage() {
  const { userData } = useAuthStore();
  const { t: tGreeting } = useTranslation('greeting');
  const { locale } = useTranslation('common');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? tGreeting('morning') : hour < 17 ? tGreeting('afternoon') : tGreeting('evening');

  const todayFormatted = new Date().toLocaleDateString(
    locale === 'ms' ? 'ms-MY' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {greeting}, {userData?.user_name || 'Admin'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome to your dashboard.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{todayFormatted}</span>
        </div>
      </div>
    </div>
  );
}
