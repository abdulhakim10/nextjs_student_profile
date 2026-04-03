import {
  LayoutDashboard,
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
];
