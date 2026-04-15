'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for Zustand to hydrate before redirecting
    if (!_hasHydrated) return;

    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // Show loader while hydrating
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If authenticated, don't render auth pages (redirect is happening)
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 dot-pattern relative overflow-hidden p-4">
      {/* Decorative floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-16 h-48 w-48 rounded-full bg-primary/5 blur-2xl animate-float-delayed" />
        <div className="absolute -bottom-16 left-1/4 h-56 w-56 rounded-full bg-primary/3 blur-3xl animate-float" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4 shadow-sm">
            <span className="text-2xl font-bold text-primary">A</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Admin Dashboard
          </h1>
        </div>

        {/* Card container */}
        <div className="bg-card rounded-2xl shadow-lg border border-border/50">
          {children}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Secure admin portal
        </p>
      </div>
    </div>
  );
}
