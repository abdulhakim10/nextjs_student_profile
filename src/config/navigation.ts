import {
  Home,
  LayoutDashboard,
  Users,
  Settings,
  BookOpen,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Translations } from '@/i18n';
import type { Role } from '@/lib/role';

type NavigationKey = keyof Translations['navigation'];

export interface NavChild {
  titleKey: NavigationKey;
  href: string;
}

export interface NavItem {
  titleKey: NavigationKey;
  href: string;
  icon: LucideIcon;
  /** Which view roles see this tab — admins get the admin chrome without
   *  My Page; employees get ONLY My Page (see lib/role.ts). Backend
   *  enforces the real gate server-side, so this is UX, not security. */
  roles: Role[];
  children?: NavChild[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    titleKey: 'overview',
    href: '/overview',
    icon: Home,
    roles: ['admin'],
  },
  {
    titleKey: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    titleKey: 'users',
    href: '/users',
    icon: Users,
    roles: ['admin'],
  },
  // TEMPLATE: rename to the module's own-data page when forking
  // (attendance "My Attendance" /profile, salary "My Payroll" /my-payroll…).
  {
    titleKey: 'myPage',
    href: '/my-page',
    icon: UserCircle,
    roles: ['employee'],
  },
  // Tutorial + Settings are admin tabs — the employee view shows ONLY
  // My Page (Settings stays reachable via the avatar dropdown).
  {
    titleKey: 'tutorial',
    href: '/tutorial',
    icon: BookOpen,
    roles: ['admin'],
  },
  {
    titleKey: 'settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

/** The sidebar tabs a given role actually sees. */
export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
