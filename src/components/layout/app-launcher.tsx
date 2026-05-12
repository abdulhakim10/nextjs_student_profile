'use client';

/**
 * App Launcher (receiver side) — popover that lets a SSO'd user jump
 * back to the main dashboard or switch to another module.
 *
 * Visibility: only rendered when SSO_RETURN_URL is present in localStorage
 * (= user entered via SSO from main_view). Users who logged in directly to
 * this module won't see the trigger at all.
 *
 * Routing: tile clicks navigate to `${main_origin}/dashboard` (Home) or
 * `${main_origin}/dashboard?launch=<key>` (other modules). Main_view's
 * dashboard handles the `?launch=` query by calling launchModule(),
 * keeping SSO_SHARED_SECRET centralized in main.
 */
import { useEffect, useState } from 'react';
import { Home, Clock, Wallet, Receipt, Briefcase, Plane, type LucideIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { STORAGE_KEYS } from '@/config/constants';
import { type ModuleKey } from '@/config/modules';

/** Slug for an unbuilt module whose tile routes to main's /maintenance page. */
type MaintenanceKey = 'claims' | 'recruitment' | 'leave';

type TileBase = {
  label: string;
  icon: LucideIcon;
  /** Tailwind gradient classes — kept simple; receivers don't import main's landing tokens. */
  gradient: string;
};

/** Discriminated by `kind` so each destination carries only the fields it needs. */
type Tile =
  | (TileBase & { kind: 'home' })
  | (TileBase & { kind: 'module'; moduleKey: ModuleKey })
  | (TileBase & { kind: 'maintenance'; maintenanceKey: MaintenanceKey });

// Mirrors main_view's App Launcher PRO list. Built modules SSO via main;
// unbuilt ones route to main's /maintenance page.
const TILES: Tile[] = [
  { kind: 'home', label: 'Main Dashboard', icon: Home, gradient: 'from-slate-500 to-slate-600' },
  { kind: 'module', moduleKey: 'attendance', label: 'Attendance', icon: Clock, gradient: 'from-violet-500 to-indigo-500' },
  { kind: 'module', moduleKey: 'salary', label: 'Payroll', icon: Wallet, gradient: 'from-amber-500 to-orange-500' },
  { kind: 'maintenance', maintenanceKey: 'claims', label: 'Claims', icon: Receipt, gradient: 'from-rose-500 to-pink-500' },
  { kind: 'maintenance', maintenanceKey: 'recruitment', label: 'Recruitment', icon: Briefcase, gradient: 'from-sky-500 to-cyan-500' },
  { kind: 'maintenance', maintenanceKey: 'leave', label: 'Leave', icon: Plane, gradient: 'from-emerald-500 to-teal-500' },
];

/**
 * Build the target URL on main_view. The `launch=<key>` query is read by
 * main_view's dashboard auto-launch effect — the key name MUST match
 * `SSO_LAUNCH_QUERY_KEY` in main_view/src/lib/sso.ts (kept inline here
 * since receivers don't share that module).
 */
const LAUNCH_QUERY_KEY = 'launch';
function buildTargetUrl(mainOrigin: string, tile: Tile): string {
  switch (tile.kind) {
    case 'home':
      return `${mainOrigin}/dashboard`;
    case 'module':
      return `${mainOrigin}/dashboard?${LAUNCH_QUERY_KEY}=${encodeURIComponent(tile.moduleKey)}`;
    case 'maintenance':
      return `${mainOrigin}/maintenance?module=${encodeURIComponent(tile.maintenanceKey)}`;
  }
}

function tileKey(tile: Tile): string {
  switch (tile.kind) {
    case 'home':
      return 'home';
    case 'module':
      return tile.moduleKey;
    case 'maintenance':
      return tile.maintenanceKey;
  }
}

/** Pull the main_view origin from the saved SSO return URL. */
function readMainOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEYS.SSO_RETURN_URL);
  if (!stored) return null;
  try {
    return new URL(stored).origin;
  } catch {
    return null;
  }
}

export function AppLauncher() {
  const [open, setOpen] = useState(false);
  const [mainOrigin, setMainOrigin] = useState<string | null>(null);

  // Read from localStorage on mount. Done in effect to keep SSR-safe and to
  // re-read after hydration (Zustand persist doesn't cover SSO_RETURN_URL).
  useEffect(() => {
    setMainOrigin(readMainOrigin());
  }, []);

  // Hide entirely when not entered via SSO — no greyed trigger, no popover.
  if (!mainOrigin) return null;

  // No self-filter — a click on the current module's tile just does a fresh
  // SSO roundtrip via main, which is harmless. Keeps the launcher byte-
  // identical across all receivers (base/attendance/salary).
  const handleSelect = (tile: Tile) => {
    setOpen(false);
    window.location.href = buildTargetUrl(mainOrigin, tile);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Switch module"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-primary/10 data-[state=open]:text-primary"
        >
          <span className="grid grid-cols-3 gap-[2px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="h-1 w-1 rounded-[1px] bg-current" aria-hidden />
            ))}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[320px] rounded-2xl p-3"
      >
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Switch to
        </p>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tileKey(tile)}
                type="button"
                onClick={() => handleSelect(tile)}
                className="group flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-colors hover:bg-accent"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tile.gradient} text-white shadow-sm transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:shadow-lg`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span className="text-[11px] font-medium leading-tight group-hover:text-foreground">
                  {tile.label}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
