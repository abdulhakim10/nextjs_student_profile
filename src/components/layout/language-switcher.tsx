'use client';

import { useLanguageStore } from '@/stores/language.store';
import { SUPPORTED_LOCALES } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

export function LanguageSwitcher({ ghost = false }: { ghost?: boolean }) {
  const { locale, setLocale } = useLanguageStore();
  const current = SUPPORTED_LOCALES.find((l) => l.code === locale)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* `ghost` — borderless header variant (the app-header groups its
            utility icons without per-button chrome); default stays the
            bordered pill the auth pages float over their mesh background. */}
        <button
          className={
            ghost
              ? 'flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground data-[state=open]:bg-primary/10 data-[state=open]:text-primary'
              : 'flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          }
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{current.flag} {current.code.toUpperCase()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {SUPPORTED_LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={`gap-2 ${locale === l.code ? 'bg-accent' : ''}`}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
