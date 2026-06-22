'use client';

import Link from 'next/link';
import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import { Info, CalendarClock, ArrowRight } from 'lucide-react';
import { APP_VERSION, APP_VERSION_DATE } from '@/lib/version';
import { formatDate } from '@/lib/date-utils';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'App';

/** Header chrome — small clickable version pill that opens a designed
 *  HoverCard with version + release date on hover. Click navigates to
 *  /settings where the full About card lives. Hidden under `md`. */
export function VersionBadge() {
  return (
    <HoverCardPrimitive.Root openDelay={150} closeDelay={120}>
      <HoverCardPrimitive.Trigger asChild>
        <Link
          href="/settings"
          className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 backdrop-blur px-2.5 py-1 text-[10px] font-mono font-medium text-muted-foreground shadow-sm transition-colors hover:border-border hover:text-foreground"
        >
          v{APP_VERSION}
        </Link>
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50 w-[260px] rounded-xl border border-border/60 bg-card text-foreground shadow-xl shadow-black/5 backdrop-blur outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2"
        >
          <div className="p-3.5">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                <Info className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold tracking-tight leading-none">{APP_NAME}</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-none">Current build</p>
              </div>
            </div>

            <div className="mt-3.5 space-y-2 rounded-lg bg-muted/40 p-2.5">
              <Row label="Version">
                <span className="inline-flex items-center rounded-md border border-border/60 bg-card px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-foreground shadow-sm">
                  v{APP_VERSION}
                </span>
              </Row>
              <Row label="Released">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground tabular-nums">
                  <CalendarClock className="h-3 w-3 text-muted-foreground" strokeWidth={2.5} />
                  {formatDate(APP_VERSION_DATE)}
                </span>
              </Row>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
              <span>Open settings</span>
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </div>
          </div>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
