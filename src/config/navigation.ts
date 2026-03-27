import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  ShieldCheck,
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
    titleKey: 'attendance',
    href: '/attendance',
    icon: ClipboardList,
    children: [
      { titleKey: 'viewAttendance', href: '/attendance' },
      { titleKey: 'reports', href: '/attendance/reports' },
    ],
  },
  {
    titleKey: 'admin',
    href: '/admin/groups',
    icon: ShieldCheck,
    children: [
      { titleKey: 'setupGuide', href: '/admin/setup' },
      { titleKey: 'attendanceSettings', href: '/admin/groups' },
      { titleKey: 'attendanceProfile', href: '/admin/employee-profiles' },
    ],
  },
  {
    titleKey: 'settings',
    href: '/settings',
    icon: Settings,
  },
];
