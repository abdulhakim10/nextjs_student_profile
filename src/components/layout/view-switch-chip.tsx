'use client';

/**
 * View-switch chip — lets a REAL admin (deriveRole, never the override)
 * toggle between the module's admin and employee views, mirroring
 * main_view's hero-band chip. Hidden for real employees — they have no
 * other view to switch to. Switching writes the per-tab override and
 * hard-navigates to the target view's home: sessionStorage isn't
 * reactive, so a full load is what makes every resolveViewRole consumer
 * (sidebar, guards, entry redirects) re-read it.
 */
import { ArrowLeftRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { deriveRole, resolveViewRole, roleHome, setViewRole } from '@/lib/role';
import { useTranslation } from '@/i18n';

export function ViewSwitchChip() {
  const userData = useAuthStore((s) => s.userData);
  const { t } = useTranslation('dashboard');

  // Real-role gate — same rule as the App Launcher / AI / search.
  if (deriveRole(userData) !== 'admin') return null;

  const otherView = resolveViewRole(userData) === 'admin' ? 'employee' : 'admin';

  const handleSwitch = () => {
    setViewRole(otherView);
    // assign() (not an href mutation) keeps the React Compiler happy.
    window.location.assign(roleHome(otherView));
  };

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border/70 bg-background/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-primary lg:flex"
    >
      <ArrowLeftRight className="h-3 w-3" />
      {otherView === 'admin' ? t('viewAdmin') : t('viewEmployee')}
    </button>
  );
}