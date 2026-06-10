'use client';

import { SidebarProvider } from '@/components/ui/sidebar';

/**
 * SidebarProvider wrapper — the sidebar starts COLLAPSED to the icon rail
 * on every viewport (user decision 2026-06-08: content first, nav stays one
 * click away). Phones (<768px) are handled by the sidebar's built-in
 * off-canvas sheet regardless of this flag. Initial-only — after that the
 * user's toggle wins for the session.
 */
export function ResponsiveSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarProvider defaultOpen={false}>{children}</SidebarProvider>;
}
