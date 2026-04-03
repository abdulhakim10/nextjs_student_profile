'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import React from 'react';
import { Search, Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useTranslation } from '@/i18n';
import { useAIChatStore } from '@/stores/ai-chat.store';

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });
}

export function AppHeader() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);
  const { t } = useTranslation('common');
  const { t: tAi } = useTranslation('ai');
  const { setTheme, theme } = useTheme();
  const toggleAI = useAIChatStore((s) => s.togglePanel);

  const openCommandPalette = () => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    );
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <SidebarTrigger className="-ml-1 hover:bg-primary/5 hover:text-primary transition-colors rounded-lg" />
      <Separator orientation="vertical" className="mr-2 h-4 bg-border/60" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="font-medium">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        {/* AI Assistant — primary CTA */}
        <button
          onClick={toggleAI}
          className="group relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-purple-500 to-primary opacity-0 blur-sm group-hover:opacity-40 transition-opacity" />
          <Sparkles className="h-3.5 w-3.5 relative" />
          <span className="relative hidden sm:inline">{tAi('assistant')}</span>
          {/* Online pulse */}
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>
        </button>

        <button
          onClick={openCommandPalette}
          className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('search')}</span>
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/80 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
        <LanguageSwitcher />
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center justify-center rounded-lg border border-border/60 bg-muted/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </header>
  );
}
