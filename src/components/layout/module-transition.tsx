'use client';

/**
 * Full-screen branded overlay shown during cross-module SSO transitions.
 * Mounted at every checkpoint where the user is mid-handoff so neither origin's
 * underlying chrome (dashboard, auth card) is visible during the hop.
 *
 * Why no fade-in / no child stagger: the overlay re-mounts on each origin
 * after the hard navigation, so any entry animation would *restart* and the
 * user would see the overlay re-staging itself mid-handoff. Instead the
 * overlay snaps in at full opacity and only the indeterminate progress
 * indicator moves — that motion is continuous-looking across remounts
 * (opacity pulse has no positional phase to reset).
 *
 * Why no portal: when receiver SSO routes mount this, the auth/layout has
 * already been told to skip its brand chrome (see `auth/layout.tsx`), so the
 * overlay has no transform-ancestor between it and the viewport. On main_view
 * it's mounted from the dashboard layout, also at viewport scope.
 */
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

interface ModuleTransitionProps {
  /** Override the default "Securing your session…" copy. */
  message?: string;
}

export function ModuleTransition({ message = 'Securing your session…' }: ModuleTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-muted/40 to-background"
      role="status"
      aria-live="polite"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[80px] animate-float" />
        <div className="absolute right-[-8rem] top-1/3 h-96 w-96 rounded-full bg-purple-500/15 blur-[80px] animate-float-delayed dark:bg-purple-400/10" />
        <div className="absolute -bottom-32 left-1/4 h-[26rem] w-[26rem] rounded-full bg-blue-500/15 blur-[80px] animate-float dark:bg-blue-400/10" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative inline-flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-primary/40 blur-2xl animate-pulse" />
          <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-tr from-primary/40 via-purple-500/30 to-blue-500/40 blur-2xl opacity-60" />

          <div className="relative inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-primary/70 shadow-2xl shadow-primary/40 ring-1 ring-white/25">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent" />
            <motion.div
              aria-hidden
              initial={false}
              animate={{ x: ['-150%', '150%'] }}
              transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.8 }}
              className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
            <ShieldCheck
              className="relative h-10 w-10 text-primary-foreground"
              strokeWidth={1.75}
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}
            />
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          <span className="text-foreground">eboss</span>{' '}
          <span className="text-primary">PRO</span>
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">{message}</p>

        {/* Opacity pulse — no positional phase, so a remount mid-cycle is invisible. */}
        <div className="mt-6 h-[3px] w-56 overflow-hidden rounded-full bg-primary/15">
          <div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}
