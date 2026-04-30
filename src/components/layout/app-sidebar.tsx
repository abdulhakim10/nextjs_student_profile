'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { API_CONFIG } from '@/config/api';
import { NAV_ITEMS, type NavItem } from '@/config/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronsUpDown, LogOut, Sparkles, User } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

/** hrefs that close a conceptual group — adds a soft gap after */
const GROUP_END_HREFS = new Set(['/users']);

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, appcodeData, logout } = useAuthStore();
  const { t: tNav } = useTranslation('navigation');
  const { t: tSidebar } = useTranslation('sidebar');
  const { t: tCommon } = useTranslation('common');

  /**
   * User-initiated logout:
   *   1. Call backend logout (best-effort, ignore failures)
   *   2. Clear local auth state via Zustand logout()
   *   3. Soft redirect to login (preserves appcode, unlike forceLogout)
   */
  const handleLogout = async () => {
    try {
      await authService.logout(API_CONFIG.DEFAULT_APP, API_CONFIG.DEFAULT_USER_TYPE);
    } catch {
      // Proceed even if backend call fails (e.g. network error, token already expired)
    } finally {
      logout();
      router.push('/auth/login');
    }
  };

  const userInitials = userData?.user_name
    ? userData.user_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <Sidebar variant="inset" className="sidebar-premium">
      {/* ── Header — distinct glass card surface ─────────────────── */}
      <SidebarHeader className="px-2 pt-2 pb-2">
        <Link
          href="/dashboard"
          className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/40 bg-white/60 px-2.5 py-2 shadow-sm shadow-black/[0.04] backdrop-blur-md transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:shadow-primary/10 dark:border-white/10 dark:bg-white/5 dark:hover:border-primary/30"
        >
          {/* Animated brand glow */}
          <span className="pointer-events-none absolute -inset-px -z-0 bg-gradient-to-r from-primary/0 via-primary/8 to-primary/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative flex aspect-square size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/30 ring-1 ring-inset ring-white/20 transition-transform duration-300 group-hover:scale-[1.04] group-hover:rotate-[-2deg]">
            {appcodeData?.client_logo ? (
              <Image
                src={appcodeData.client_logo}
                alt="Logo"
                width={28}
                height={28}
                className="rounded object-contain"
                style={{ width: 'auto', height: 'auto' }}
                unoptimized
              />
            ) : (
              <span className="text-sm font-bold tracking-tight">A</span>
            )}
            <span className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/25 via-white/0 to-white/0" />
          </div>
          <div className="relative grid flex-1 text-left leading-tight min-w-0">
            <span className="truncate text-[13.5px] font-semibold tracking-tight">
              {appcodeData?.customer || tSidebar('appName')}
            </span>
            <span className="truncate text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/80">
              {appcodeData?.client_appname || tSidebar('dashboard')}
            </span>
          </div>
          <Sparkles className="relative size-3.5 shrink-0 text-primary/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Link>
      </SidebarHeader>

      {/* ── Nav — floating pill items on a tinted canvas ────────── */}
      <SidebarContent className="px-1.5 py-2">
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item, idx) => {
            const isExactActive = pathname === item.href;
            const isChildActive = item.children?.some(
              (child) => pathname === child.href
            );
            const isActive = isExactActive || Boolean(isChildActive);
            const isGroupEnd = GROUP_END_HREFS.has(item.href);
            const isLast = idx === NAV_ITEMS.length - 1;

            return (
              <div key={item.href}>
                <NavRow
                  item={item}
                  label={tNav(item.titleKey)}
                  isActive={isActive}
                />
                {item.children && (
                  <div className="mt-1 flex flex-col gap-px">
                    {item.children.map((child) => (
                      <SubRow
                        key={child.href}
                        href={child.href}
                        label={tNav(child.titleKey)}
                        isActive={pathname === child.href}
                      />
                    ))}
                  </div>
                )}
                {isGroupEnd && !isLast && <div className="h-2.5" />}
              </div>
            );
          })}
        </nav>
      </SidebarContent>

      {/* ── Footer — distinct glass card ─────────────────────────── */}
      <SidebarFooter className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border border-white/40 bg-white/60 px-2 py-1.5 text-left shadow-sm shadow-black/[0.04] backdrop-blur-md transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:shadow-primary/10 data-[state=open]:border-primary/30 data-[state=open]:shadow-md data-[state=open]:shadow-primary/15 dark:border-white/10 dark:bg-white/5 dark:hover:border-primary/30"
            >
              <span className="pointer-events-none absolute -inset-px -z-0 bg-gradient-to-r from-primary/0 via-primary/8 to-primary/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 group-data-[state=open]:opacity-100" />
              <div className="relative shrink-0">
                <Avatar className="h-8 w-8 rounded-lg shadow-sm ring-1 ring-black/5 dark:ring-white/15">
                  <AvatarImage
                    src={userData?.user_image}
                    alt={userData?.user_name}
                  />
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary via-primary to-primary/75 text-[11px] font-semibold text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
              </div>
              <div className="relative grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate text-[13px] font-semibold tracking-tight">
                  {userData?.user_name || tCommon('user')}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {userData?.user_email || ''}
                </span>
              </div>
              <ChevronsUpDown className="relative ml-auto size-3.5 shrink-0 text-muted-foreground/60 transition-all duration-300 group-hover:text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl"
            side="top"
            align="start"
            sideOffset={8}
          >
            <DropdownMenuItem
              onClick={() => router.push('/settings')}
              className="rounded-lg"
            >
              <User className="mr-2 h-4 w-4" />
              {tCommon('settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="rounded-lg text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {tCommon('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/**
 * Top-level nav row — floating pill on the sidebar canvas.
 * Active state BLOOMS: glass card surface + primary glow underneath + saturated icon.
 * Inactive: soft hover lift, icon picks up a hint of primary on hover.
 */
function NavRow({
  item,
  label,
  isActive,
}: {
  item: NavItem;
  label: string;
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/nav relative flex h-10 items-center gap-3 overflow-hidden rounded-xl px-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        isActive
          ? 'border border-white/50 bg-white/70 shadow-md shadow-primary/15 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.07]'
          : 'border border-transparent text-sidebar-foreground/75 hover:border-white/30 hover:bg-white/35 hover:shadow-sm hover:shadow-black/[0.03] hover:backdrop-blur-sm hover:translate-x-px dark:hover:border-white/[0.06] dark:hover:bg-white/[0.03]'
      )}
    >
      {/* Bloom glow underneath when active */}
      {isActive && (
        <span className="pointer-events-none absolute -inset-px -z-0 bg-gradient-to-r from-primary/0 via-primary/15 to-primary/0 blur-md" />
      )}
      {/* Icon — gets a soft gradient backplate when active, hint of primary on hover */}
      <span
        className={cn(
          'relative flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
          isActive
            ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 ring-1 ring-primary/20 shadow-sm shadow-primary/15'
            : 'text-sidebar-foreground/55 group-hover/nav:text-primary/80'
        )}
      >
        <Icon
          className={cn(
            'size-[15px] transition-all duration-300',
            isActive && 'text-primary'
          )}
          strokeWidth={isActive ? 2.4 : 2}
        />
        {/* Subtle inner highlight on active icon backplate */}
        {isActive && (
          <span className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 via-white/0 to-white/0" />
        )}
      </span>
      <span
        className={cn(
          'relative truncate text-[13px] tracking-tight transition-all duration-300',
          isActive ? 'font-semibold text-foreground' : 'font-medium'
        )}
      >
        {label}
      </span>
      {/* Active dot — far right, signals "this is the page" */}
      {isActive && (
        <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(var(--primary)/60%)]" />
      )}
    </Link>
  );
}

/**
 * Sub-item — quieter, indented under the parent's label.
 * Active = primary-tinted soft pill; otherwise a small dot indicator.
 */
function SubRow({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/sub relative flex h-7 items-center gap-2 rounded-lg pl-[44px] pr-2 transition-all duration-200',
        isActive
          ? 'bg-primary/8 text-primary font-semibold'
          : 'text-sidebar-foreground/55 hover:bg-white/30 hover:text-sidebar-foreground/95 hover:translate-x-px dark:hover:bg-white/[0.03]'
      )}
    >
      <span
        className={cn(
          'absolute left-[28px] h-1 w-1 rounded-full transition-all duration-300',
          isActive
            ? 'bg-primary scale-110 shadow-[0_0_6px_oklch(var(--primary)/70%)]'
            : 'bg-sidebar-foreground/25 scale-75 group-hover/sub:bg-primary/60 group-hover/sub:scale-100'
        )}
      />
      <span className="truncate text-[12.5px] tracking-tight">{label}</span>
    </Link>
  );
}
