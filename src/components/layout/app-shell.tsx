'use client';

/**
 * App shell — the module's full chrome (sidebar + header + AI panel +
 * command palette). Client boundary for the dashboard layout; mounts the
 * AI panel and command palette only for REAL admins (deriveRole — the
 * view override swaps pages/nav only); header buttons match (app-header.tsx).
 */

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { ResponsiveSidebarProvider } from '@/components/layout/responsive-sidebar-provider';
import { SidebarInset } from '@/components/ui/sidebar';
import { AIChatPanel } from '@/components/ai/ai-chat-panel';
import { CommandPalette } from '@/components/command-palette';
import { useAuthStore } from '@/stores/auth.store';
import { deriveRole } from '@/lib/role';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { userData } = useAuthStore();
  const isAdmin = deriveRole(userData) === 'admin';

  return (
    <ResponsiveSidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 dot-pattern">{children}</main>
      </SidebarInset>
      {isAdmin && <AIChatPanel />}
      {isAdmin && <CommandPalette />}
    </ResponsiveSidebarProvider>
  );
}
