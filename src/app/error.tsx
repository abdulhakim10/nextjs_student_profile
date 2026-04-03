'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-destructive/10 blur-xl scale-150" />
        <div className="relative rounded-2xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/10 p-5">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Something went wrong</h2>
        <p className="text-muted-foreground max-w-sm">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <Button onClick={reset} className="rounded-xl gap-2">
        <RotateCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
