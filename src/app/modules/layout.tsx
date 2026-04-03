import { AuthGuard } from '@/components/auth/auth-guard';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AIChatPanel } from '@/components/ai/ai-chat-panel';
import { CommandPalette } from '@/components/command-palette';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 overflow-auto p-6 dot-pattern">{children}</main>
        </SidebarInset>
        <AIChatPanel />
        <CommandPalette />
      </SidebarProvider>
    </AuthGuard>
  );
}
