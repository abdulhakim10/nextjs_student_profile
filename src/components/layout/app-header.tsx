'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Building2, Search, Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { UserMenu } from '@/components/layout/user-menu';
import { AppLauncher } from '@/components/layout/app-launcher';
import { VersionBadge } from '@/components/layout/version-badge';
import { ViewSwitchChip } from '@/components/layout/view-switch-chip';
import { useTranslation } from '@/i18n';
import { useAIChatStore } from '@/stores/ai-chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { deriveRole } from '@/lib/role';

export function AppHeader() {
  const { t } = useTranslation('common');
  const { t: tDash } = useTranslation('dashboard');
  const { setTheme, theme } = useTheme();
  const toggleAI = useAIChatStore((s) => s.togglePanel);
  const { appcodeData, userData } = useAuthStore();
  // AI assistant + ⌘K search follow the REAL role (deriveRole) — an admin
  // browsing the employee view keeps his tools; real employees never see
  // them (their panels are not even mounted, see app-shell.tsx).
  const isAdmin = deriveRole(userData) === 'admin';

  const openCommandPalette = () => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    );
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <SidebarTrigger className="-ml-1 hover:bg-primary/5 hover:text-primary transition-colors rounded-lg" />
      <Separator orientation="vertical" className="mr-2 h-4 bg-border/60" />
      {/* Organization identity — matches every other module's top bar
          (the sidebar brand block names the module). */}
      <div className="flex min-w-0 items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate text-sm font-bold uppercase tracking-wide">
          {appcodeData?.customer || appcodeData?.client_appname || ''}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ViewSwitchChip />
        <VersionBadge />
        {isAdmin && (
          <>
            {/* AI Assistant — primary CTA */}
            <button
              onClick={toggleAI}
              className="group relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 blur-sm group-hover:opacity-40 transition-opacity" />
              <Sparkles className="h-3.5 w-3.5 relative" />
              <span className="relative hidden lg:inline">{tDash('aiAssistant')}</span>
              {/* Online pulse */}
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
            </button>
          </>
        )}
        <span aria-hidden className="hidden h-5 w-px bg-border/60 sm:block" />
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              onClick={openCommandPalette}
              aria-label={t('search')}
              title={t('search')}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          <LanguageSwitcher ghost />
          <AppLauncher />
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <span aria-hidden className="hidden h-5 w-px bg-border/60 sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
