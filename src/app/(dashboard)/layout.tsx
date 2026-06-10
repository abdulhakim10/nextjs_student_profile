import { AuthGuard } from '@/components/auth/auth-guard';
import { RoleRouteGuard } from '@/components/auth/role-route-guard';
import { AppShell } from '@/components/layout/app-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RoleRouteGuard keeps employees (non-admin system_level) on My Page;
  // AppShell renders the full chrome and mounts the AI/search panels for
  // admins only.
  return (
    <AuthGuard>
      <RoleRouteGuard>
        <AppShell>{children}</AppShell>
      </RoleRouteGuard>
    </AuthGuard>
  );
}
