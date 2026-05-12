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
import { useLanguageStore } from '@/stores/language.store';

type TileBase = {
  label: string;
  icon: LucideIcon;
  /** Tailwind gradient classes — kept simple; receivers don't import main's landing tokens. */
  gradient: string;
};

/** Discriminated by `kind`. Module tiles route via main's `?launch=` so main
 *  is the single source of truth for which modules are live (it falls back to
 *  /maintenance for not-yet-deployed modules via `isModuleLive()`). */
type Tile =
  | (TileBase & { kind: 'home' })
  | (TileBase & { kind: 'module'; moduleKey: ModuleKey });

// Mirrors main_view's App Launcher PRO list. Adding a module here is enough —
// main_view decides at runtime whether it SSO-launches or shows /maintenance,
// based on its own `NEXT_PUBLIC_LIVE_MODULES` env var.
const TILES: Tile[] = [
  { kind: 'home',   label: 'Main Dashboard', icon: Home,      gradient: 'from-slate-500 to-slate-600' },
  { kind: 'module', moduleKey: 'attendance',  label: 'Attendance',  icon: Clock,     gradient: 'from-violet-500 to-indigo-500' },
  { kind: 'module', moduleKey: 'salary',      label: 'Payroll',     icon: Wallet,    gradient: 'from-amber-500 to-orange-500' },
  { kind: 'module', moduleKey: 'claim',       label: 'Claims',      icon: Receipt,   gradient: 'from-rose-500 to-pink-500' },
  { kind: 'module', moduleKey: 'recruitment', label: 'Recruitment', icon: Briefcase, gradient: 'from-sky-500 to-cyan-500' },
  { kind: 'module', moduleKey: 'leave',       label: 'Leave',       icon: Plane,     gradient: 'from-emerald-500 to-teal-500' },
];

/**
 * Build the target URL on main_view. The `launch=<key>` query is read by
 * main_view's dashboard auto-launch effect — the key name MUST match
 * `SSO_LAUNCH_QUERY_KEY` in main_view/src/lib/sso.ts (kept inline here
 * since receivers don't share that module).
 *
 * `lang=<code>` carries the user's locale across origins. main_view's
 * dashboard reads it and updates its own language store before any further
 * SSO hop, so the receiver-to-receiver chain doesn't reset to main's
 * stale default. The key matches `SSO_LANG_QUERY_KEY` in main_view's sso.ts.
 */
const LAUNCH_QUERY_KEY = 'launch';
const LANG_QUERY_KEY = 'lang';
function buildTargetUrl(mainOrigin: string, tile: Tile, locale: string): string {
  const langQuery = `${LANG_QUERY_KEY}=${encodeURIComponent(locale)}`;
  switch (tile.kind) {
    case 'home':
      return `${mainOrigin}/dashboard?${langQuery}`;
    case 'module':
      return `${mainOrigin}/dashboard?${LAUNCH_QUERY_KEY}=${encodeURIComponent(tile.moduleKey)}&${langQuery}`;
  }
}

function tileKey(tile: Tile): string {
  switch (tile.kind) {
    case 'home':
      return 'home';
    case 'module':
      return tile.moduleKey;
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
    // Snapshot locale at click time — passed in URL so main's dashboard can
    // sync its store before the next SSO hop reads it from there.
    const locale = useLanguageStore.getState().locale;
    window.location.href = buildTargetUrl(mainOrigin, tile, locale);
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
