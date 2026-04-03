'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { NAV_ITEMS } from '@/config/navigation';
import { useTranslation } from '@/i18n';
import { useAIChatStore } from '@/stores/ai-chat.store';
import {
  MessageSquare,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { setOpen: setAIChatOpen } = useAIChatStore();
  const { t: tNav } = useTranslation('navigation');
  const { t: tCommon } = useTranslation('common');
  const { t: tCmd } = useTranslation('commandPalette');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleNavigation = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const handleOpenAI = () => {
    setOpen(false);
    setAIChatOpen(true);
  };

  const handleThemeToggle = () => {
    setOpen(false);
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Flatten nav items into a searchable list
  const navItems = NAV_ITEMS.flatMap((item) => {
    if (item.children) {
      return item.children.map((child) => ({
        title: tNav(child.titleKey),
        href: child.href,
        icon: item.icon,
      }));
    }
    return [{ title: tNav(item.titleKey), href: item.href, icon: item.icon }];
  });

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput placeholder={tCmd('placeholder')} />
      <CommandList>
        <CommandEmpty>{tCommon('noResults')}</CommandEmpty>

        <CommandGroup heading={tCmd('navigation')}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                onSelect={() => handleNavigation(item.href)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
                <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={tCmd('actions')}>
          <CommandItem onSelect={handleOpenAI}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>{tCmd('aiAssistant')}</span>
          </CommandItem>
          <CommandItem onSelect={handleThemeToggle}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>{theme === 'dark' ? tCmd('toggleLight') : tCmd('toggleDark')}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
