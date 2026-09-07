'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth.store';
import { resolveViewRole, roleHome } from '@/lib/role';
import { navItemsForRole, type NavItem } from '@/config/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

/** hrefs that close a conceptual group — adds a soft gap after */
const GROUP_END_HREFS = new Set(['/students']);

export function AppSidebar() {
  const pathname = usePathname();
  const { userData, appcodeData } = useAuthStore();
  const { t: tNav } = useTranslation('navigation');
  const { t: tSidebar } = useTranslation('sidebar');

  // Role-split view: admins get the admin tabs (no My Page); employees
  // get ONLY My Page. See lib/role.ts.
  const role = resolveViewRole(userData);
  const navItems = navItemsForRole(role);

  return (
    <Sidebar variant="inset" collapsible="icon" className="sidebar-premium">
      {/* ── Header — distinct glass card surface ─────────────────── */}
      <SidebarHeader className="px-2 pt-2 pb-2 group-data-[collapsible=icon]:px-1">
        <Link
          href={roleHome(role)}
          className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/40 bg-white/60 px-2.5 py-2 shadow-sm shadow-black/[0.04] backdrop-blur-md transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:shadow-primary/10 dark:border-white/10 dark:bg-white/5 dark:hover:border-primary/30 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
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
          <div className="relative grid flex-1 text-left leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[13.5px] font-semibold tracking-tight">
              {appcodeData?.customer || tSidebar('appName')}
            </span>
            <span className="truncate text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/80">
              {appcodeData?.client_appname || tSidebar('dashboard')}
            </span>
          </div>
          <Sparkles className="relative size-3.5 shrink-0 text-primary/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-data-[collapsible=icon]:hidden" />
        </Link>
      </SidebarHeader>

      {/* ── Nav — floating pill items on a tinted canvas ────────── */}
      <SidebarContent className="px-1.5 py-2">
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item, idx) => {
            const isExactActive = pathname === item.href;
            const isChildActive = item.children?.some(
              (child) => pathname === child.href
            );
            const isActive = isExactActive || Boolean(isChildActive);
            const isGroupEnd = GROUP_END_HREFS.has(item.href);
            const isLast = idx === navItems.length - 1;

            return (
              <div key={item.href}>
                <NavRow
                  item={item}
                  label={tNav(item.titleKey)}
                  isActive={isActive}
                  subItems={item.children?.map((child) => ({
                    href: child.href,
                    label: tNav(child.titleKey),
                    isActive: pathname === child.href,
                  }))}
                />
                {item.children && (
                  /* Sub-lists have no icon to collapse down to — hide the
                     whole block on the icon rail (same as claim). */
                  <div className="mt-1 flex flex-col gap-px group-data-[collapsible=icon]:hidden">
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
    </Sidebar>
  );
}

/**
 * Top-level nav row — floating pill on the sidebar canvas.
 * Active state BLOOMS: glass card surface + primary glow underneath + saturated icon.
 * Inactive: soft hover lift, icon picks up a hint of primary on hover.
 *
 * On the collapsed icon rail the row gains a glass FLYOUT (HoverCard, right
 * side): the item name as a clickable header plus, for group items, its
 * children as clickable rows with the active one highlighted — never the
 * browser's native title tooltip.
 */
function NavRow({
  item,
  label,
  isActive,
  subItems,
}: {
  item: NavItem;
  label: string;
  isActive: boolean;
  subItems?: { href: string; label: string; isActive: boolean }[];
}) {
  const { state } = useSidebar();
  const Icon = item.icon;
  const row = (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/nav relative flex h-10 items-center gap-3 overflow-hidden rounded-xl px-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
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
          'relative truncate text-[13px] tracking-tight transition-all duration-300 group-data-[collapsible=icon]:hidden',
          isActive ? 'font-semibold text-foreground' : 'font-medium'
        )}
      >
        {label}
      </span>
      {/* Active dot — far right, signals "this is the page" */}
      {isActive && (
        <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(var(--primary)/60%)] group-data-[collapsible=icon]:hidden" />
      )}
    </Link>
  );

  // Expanded sidebar — labels are visible, no flyout needed.
  if (state !== 'collapsed') return row;

  return (
    <HoverCard openDelay={80} closeDelay={150}>
      <HoverCardTrigger asChild>{row}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-auto min-w-44 max-w-64 rounded-2xl border-border/40 p-1.5 shadow-xl shadow-black/5"
      >
        {/* Header — the item itself, clickable like the rail icon */}
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors',
            isActive
              ? 'bg-primary/8 text-primary'
              : 'hover:bg-accent hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          <span className="truncate text-sm font-semibold tracking-tight">{label}</span>
        </Link>
        {/* Children — the group fans out right here, active one lit */}
        {subItems && subItems.length > 0 && (
          <div className="mt-1 flex flex-col gap-px border-t border-border/40 pt-1">
            {subItems.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] tracking-tight transition-colors',
                  sub.isActive
                    ? 'bg-primary/8 font-semibold text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'h-1 w-1 shrink-0 rounded-full',
                    sub.isActive ? 'bg-primary' : 'bg-muted-foreground/40',
                  )}
                />
                <span className="truncate">{sub.label}</span>
              </Link>
            ))}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
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
