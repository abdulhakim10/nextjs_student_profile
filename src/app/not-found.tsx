import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150" />
        <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 p-5">
          <FileQuestion className="h-10 w-10 text-primary" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Page Not Found</h2>
        <p className="text-muted-foreground max-w-sm">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild className="rounded-xl gap-2">
        <Link href="/overview">
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>
      </Button>
    </div>
  );
}
