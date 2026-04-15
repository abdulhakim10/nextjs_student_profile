import {
  LayoutDashboard,
  Users,
  Settings,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import type { Translations } from '@/i18n';

type NavigationKey = keyof Translations['navigation'];

export interface NavChild {
  titleKey: NavigationKey;
  href: string;
}

export interface NavItem {
  titleKey: NavigationKey;
  href: string;
  icon: LucideIcon;
  children?: NavChild[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    titleKey: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    titleKey: 'users',
    href: '/users',
    icon: Users,
  },
  {
    titleKey: 'tutorial',
    href: '/tutorial',
    icon: BookOpen,
  },
  {
    titleKey: 'settings',
    href: '/settings',
    icon: Settings,
  },
];
