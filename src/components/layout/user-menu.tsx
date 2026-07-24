'use client';

/**
 * User menu — avatar dropdown at the header's top-right, mirroring
 * main_view's placement so the profile button sits in the same corner in
 * every app of the suite (it lived in the sidebar footer before
 * 2026-06-07). Items: Settings + Sign out.
 */

import { useRouter } from 'next/navigation';
import { LogOut, User, LifeBuoy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { API_CONFIG } from '@/config/api';
import { getLogoutRedirectTarget } from '@/lib/auth';
import { openSupportPortal } from '@/lib/support-portal';
import { useTranslation } from '@/i18n';

export function UserMenu() {
  const router = useRouter();
  const { userData, logout } = useAuthStore();
  const { t: tCommon } = useTranslation('common');
  const { t: tSupport } = useTranslation('support');

  const userInitials = userData?.user_name
    ? userData.user_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  /**
   * User-initiated logout:
   *   1. Call backend logout (best-effort, ignore failures)
   *   2. Clear local auth state via Zustand logout()
   *   3. Soft redirect to login (preserves appcode, unlike forceLogout)
   */
  const handleLogout = async () => {
    // Resolve redirect target BEFORE clearing session — logout() removes SSO_RETURN_URL.
    const target = getLogoutRedirectTarget();
    try {
      await authService.logout(API_CONFIG.DEFAULT_APP, API_CONFIG.DEFAULT_USER_TYPE);
    } catch {
      // Proceed even if backend call fails (e.g. network error, token already expired)
    } finally {
      logout();
      // Hard navigation — target may be cross-origin (main_view login for SSO users)
      // and even for same-origin paths we want full state teardown post-logout.
      window.location.href = target;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={userData?.user_name || tCommon('user')}
          className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-primary/20 data-[state=open]:ring-primary/30"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={userData?.user_image} alt={userData?.user_name} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-[11px] font-semibold text-primary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-60 rounded-xl">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">
              {userData?.user_name || tCommon('user')}
            </span>
            <span className="truncate text-[11px] font-normal text-muted-foreground">
              {userData?.user_email || ''}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/settings')}
          className="rounded-md"
        >
          <User className="mr-2 h-4 w-4" />
          {tCommon('settings')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openSupportPortal(userData)}
          className="rounded-md"
        >
          <LifeBuoy className="mr-2 h-4 w-4" />
          {tSupport('needSupport')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="rounded-md text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {tCommon('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
