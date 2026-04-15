'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { API_CONFIG } from '@/config/api';
import { NAV_ITEMS } from '@/config/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronUp, LogOut, User } from 'lucide-react';
import { useTranslation } from '@/i18n';

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
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20">
                  {appcodeData?.client_logo ? (
                    <Image
                      src={appcodeData.client_logo}
                      alt="Logo"
                      width={32}
                      height={32}
                      className="rounded-lg"
                      unoptimized
                    />
                  ) : (
                    <span className="text-sm font-bold">A</span>
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {appcodeData?.customer || tSidebar('appName')}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {appcodeData?.client_appname || tSidebar('dashboard')}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
            {tNav('label')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.children &&
                    item.children.some((child) => pathname === child.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={tNav(item.titleKey)}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{tNav(item.titleKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.children && (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === child.href}
                            >
                              <Link href={child.href}>{tNav(child.titleKey)}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8 rounded-xl ring-2 ring-primary/10">
                    <AvatarImage
                      src={userData?.user_image}
                      alt={userData?.user_name}
                    />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-medium text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {userData?.user_name || tCommon('user')}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userData?.user_email || ''}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => router.push('/settings')} className="rounded-lg">
                  <User className="mr-2 h-4 w-4" />
                  {tCommon('settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {tCommon('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
