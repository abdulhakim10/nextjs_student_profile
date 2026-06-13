'use client';

/**
 * App Launcher (receiver side) — popover that lets a SSO'd ADMIN jump back
 * to the main dashboard or switch to another module. For REAL employees
 * (deriveRole — the employee VIEW override does not hide it) it collapses
 * to a back-to-dashboard button — module switching is the admin surface.
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
import { useTheme } from 'next-themes';
import { Home, Clock, Wallet, Receipt, Briefcase, Plane, FileText, type LucideIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { STORAGE_KEYS } from '@/config/constants';
import { CURRENT_MODULE, canAccessModule, type ModuleKey } from '@/config/modules';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { deriveRole } from '@/lib/role';
import { useTranslation } from '@/i18n';
import type { Translations } from '@/i18n';
import { isTheme } from '@/lib/theme';

type LauncherKey = keyof Translations['appLauncher'];

/** Accent palette for the "you are here" highlight — keyed names so the
 *  Tailwind JIT can see the literal class strings below and emit the CSS. */
type Accent = 'violet' | 'amber' | 'rose' | 'sky' | 'emerald' | 'teal' | 'blue';

/** Per-accent class bundle. Each module tile picks one matching its gradient
 *  so the active highlight reads as "this tile's color got brighter", not as
 *  a generic chrome accent. Class strings are spelled out (no template
 *  interpolation) so Tailwind's content scan picks them up. */
const ACCENT: Record<
  Accent,
  { ring: string; text: string; bg: string; dot: string; glow: string }
> = {
  violet: {
    ring: 'ring-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
    dot: 'bg-violet-500',
    glow: 'shadow-violet-500/50',
  },
  amber: {
    ring: 'ring-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-500',
    glow: 'shadow-amber-500/50',
  },
  blue: {
    ring: 'ring-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-500',
    glow: 'shadow-blue-500/50',
  },
  rose: {
    ring: 'ring-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    dot: 'bg-rose-500',
    glow: 'shadow-rose-500/50',
  },
  sky: {
    ring: 'ring-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
    dot: 'bg-sky-500',
    glow: 'shadow-sky-500/50',
  },
  emerald: {
    ring: 'ring-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-500',
    glow: 'shadow-emerald-500/50',
  },
  teal: {
    ring: 'ring-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/10',
    dot: 'bg-teal-500',
    glow: 'shadow-teal-500/50',
  },
};

type TileBase = {
  /** Key under the `appLauncher` namespace — resolved at render. Typed against
   *  the JSON shape so a typo would fail to compile. */
  labelKey: LauncherKey;
  icon: LucideIcon;
  /** Tailwind gradient classes — kept simple; receivers don't import main's landing tokens. */
  gradient: string;
};

/** Discriminated by `kind`. Module tiles route via main's `?launch=` so main
 *  is the single source of truth for the SSO handshake (shared secret +
 *  module URL registry live there, not in receivers). Only module tiles can
 *  be "current" so `accent` lives on that variant. */
type Tile =
  | (TileBase & { kind: 'home' })
  | (TileBase & { kind: 'module'; moduleKey: ModuleKey; accent: Accent });

// Mirrors main_view's App Launcher tile list. When adding a module: add the
// tile here, its `system_access` entry in config/modules.ts
// MODULE_ACCESS_KEYS (and main_view's copy), and the `labelKey` string in
// en.json + ms.json (`appLauncher` namespace). main_view handles the SSO
// redirect destination via its own MODULE_URLS registry.
// `accent` matches the gradient's dominant color so the active highlight
// reads coherently with the tile's identity.
const TILES: Tile[] = [
  { kind: 'home',                              labelKey: 'home',        icon: Home,      gradient: 'from-slate-500 to-slate-600' },
  { kind: 'module', moduleKey: 'attendance',   labelKey: 'attendance',  icon: Clock,     gradient: 'from-violet-500 to-indigo-500',   accent: 'violet' },
  { kind: 'module', moduleKey: 'salary',       labelKey: 'payroll',     icon: Wallet,    gradient: 'from-blue-500 to-indigo-500',     accent: 'blue' },
  { kind: 'module', moduleKey: 'claim',        labelKey: 'claims',      icon: Receipt,   gradient: 'from-rose-500 to-pink-500',       accent: 'rose' },
  { kind: 'module', moduleKey: 'recruitment',  labelKey: 'recruitment', icon: Briefcase, gradient: 'from-sky-500 to-cyan-500',         accent: 'sky' },
  { kind: 'module', moduleKey: 'leave',        labelKey: 'leave',       icon: Plane,     gradient: 'from-emerald-500 to-teal-500',     accent: 'emerald' },
  { kind: 'module', moduleKey: 'cms',          labelKey: 'cms',         icon: FileText,  gradient: 'from-teal-500 to-cyan-500',         accent: 'teal' },
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
 *
 * `theme=<pref>` does the same for the user's dark/light preference, since
 * `next-themes` persists per-origin to localStorage['theme']. Key matches
 * `SSO_THEME_QUERY_KEY` in main_view's sso.ts.
 */
const LAUNCH_QUERY_KEY = 'launch';
const LANG_QUERY_KEY = 'lang';
const THEME_QUERY_KEY = 'theme';
function buildTargetUrl(
  mainOrigin: string,
  tile: Tile,
  locale: string,
  theme: string,
): string {
  const langQuery = `${LANG_QUERY_KEY}=${encodeURIComponent(locale)}`;
  const themeQuery = `${THEME_QUERY_KEY}=${encodeURIComponent(theme)}`;
  switch (tile.kind) {
    case 'home':
      return `${mainOrigin}/dashboard?${langQuery}&${themeQuery}`;
    case 'module':
      return `${mainOrigin}/dashboard?${LAUNCH_QUERY_KEY}=${encodeURIComponent(tile.moduleKey)}&${langQuery}&${themeQuery}`;
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
  const { theme } = useTheme();
const { t } = useTranslation('appLauncher');
  const userData = useAuthStore((s) => s.userData);

  // Read from localStorage on mount. Done in effect to keep SSR-safe and to
  // re-read after hydration (Zustand persist doesn't cover SSO_RETURN_URL).
  useEffect(() => {
    setMainOrigin(readMainOrigin());
  }, []);

  // Hide entirely when not entered via SSO — no greyed trigger, no popover.
  if (!mainOrigin) return null;

  // No self-filter — a click on the current module's tile just does a fresh
  // SSO roundtrip via main, which is harmless. Keeps the launcher byte-
  // identical across all five receivers.
  const handleSelect = (tile: Tile) => {
    setOpen(false);
    // Snapshot locale + theme at click time — passed in URL so main's dashboard
    // can sync its stores before the next SSO hop reads them from there.
    // Theme defaults to 'system' if next-themes hasn't hydrated (rare; click
    // requires a fully interactive page).
    const locale = useLanguageStore.getState().locale;
    const themePref = isTheme(theme) ? theme : 'system';
    window.location.href = buildTargetUrl(mainOrigin, tile, locale, themePref);
  };

  // Whole-module switching is keyed to the REAL role (deriveRole): an admin
  // browsing the employee view keeps the grid (so he can relaunch a module
  // as admin); real employees get a single back-to-dashboard button.
  if (deriveRole(userData) !== 'admin') {
    const homeTile = TILES.find((tile) => tile.kind === 'home');
    if (!homeTile) return null;
    const HomeIcon = homeTile.icon;
    return (
      <button
        type="button"
        aria-label={t('home')}
        title={t('home')}
        onClick={() => handleSelect(homeTile)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
      >
        <HomeIcon className="h-4 w-4" />
      </button>
    );
  }

  // Same `system_access` filter main's launcher applies — a module the
  // user's plan doesn't include shows no tile here either (main's `?launch=`
  // guard would bounce the click anyway; hiding it keeps both launchers
  // consistent). The 'home' tile always shows.
  const visibleTiles = TILES.filter(
    (tile) =>
      tile.kind === 'home' ||
      canAccessModule(userData?.system_access, tile.moduleKey),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('ariaLabel')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground data-[state=open]:bg-primary/10 data-[state=open]:text-primary"
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
          {t('switchTo')}
        </p>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {visibleTiles.map((tile) => {
            const Icon = tile.icon;
            // "You are here" — only module tiles can match the build's
            // CURRENT_MODULE; the 'home' tile never highlights. When current,
            // we pull the tile's own accent palette so the highlight color
            // matches the tile's identity (amber for payroll, violet for
            // attendance, etc.) instead of using a generic chrome accent.
            const isCurrent =
              tile.kind === 'module' &&
              CURRENT_MODULE !== null &&
              tile.moduleKey === CURRENT_MODULE;
            const accent = isCurrent ? ACCENT[tile.accent] : null;
            return (
              <button
                key={tileKey(tile)}
                type="button"
                onClick={() => handleSelect(tile)}
                aria-current={isCurrent ? 'page' : undefined}
                className={`group relative flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-colors ${
                  accent ? accent.bg : 'hover:bg-accent'
                }`}
              >
                {accent && (
                  <span aria-hidden className="absolute right-1.5 top-1.5 flex h-2 w-2">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${accent.dot}`}
                    />
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ring-2 ring-popover ${accent.dot}`}
                    />
                  </span>
                )}
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tile.gradient} text-white transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:shadow-lg ${
                    accent
                      ? `scale-105 shadow-lg ring-2 ring-offset-2 ring-offset-popover ${accent.ring} ${accent.glow}`
                      : 'shadow-sm'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span
                  className={`text-[11px] leading-tight transition-colors ${
                    accent
                      ? `font-semibold ${accent.text}`
                      : 'font-medium group-hover:text-foreground'
                  }`}
                >
                  {t(tile.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
