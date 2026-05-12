'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/stores/auth.store';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { Loader2, Sun, Moon, ShieldCheck, Fingerprint } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { t } = useTranslation('auth');
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // /auth/sso always runs to its own completion — it re-authenticates with a
  // fresh token from the launcher and re-seeds LAST_ACTIVITY. If we bounced
  // SSO arrivals on stale `isAuthenticated: true`, the receiver would land on
  // /dashboard with stale state and the idle timer would fire immediately.
  const isSSO = pathname.startsWith('/auth/sso');

  useEffect(() => {
    if (!_hasHydrated) return;
    if (isSSO) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, isSSO, router]);

  if (!_hasHydrated || (isAuthenticated && !isSSO)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // /auth/sso renders its own full-screen ModuleTransition overlay — skip the
  // brand chrome wrapper so the overlay sits at viewport scope (no transform-
  // ancestor) and the user never sees the auth card behind it.
  if (isSSO) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Mesh-gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-muted/40 to-background" />
      <div className="absolute inset-0 -z-10 dot-pattern opacity-40" />
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[120px] animate-float" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-purple-500/15 dark:bg-purple-400/10 blur-[110px] animate-float-delayed" />
        <div className="absolute -bottom-32 left-1/4 h-[26rem] w-[26rem] rounded-full bg-blue-500/15 dark:bg-blue-400/10 blur-[120px] animate-float" />
      </div>

      {/* Top-right toolbar: language + theme */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={t('toggleTheme')}
          className="flex items-center justify-center rounded-lg border border-border/60 bg-card/70 backdrop-blur p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:scale-105"
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Branding */}
        <div className="text-center mb-7">
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 14 }}
            className="relative inline-flex items-center justify-center h-16 w-16 mb-3"
          >
            {/* Pulsing primary halo */}
            <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-2xl animate-pulse" />
            {/* Multi-color secondary glow (purple + blue tint) */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-primary/40 via-purple-500/30 to-blue-500/40 blur-2xl opacity-60" />

            {/* Main icon tile */}
            <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/70 shadow-2xl shadow-primary/40 ring-1 ring-white/25 overflow-hidden">
              {/* Top sheen — gives a glassy highlight */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
              {/* Bottom shadow — adds depth */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent" />
              {/* Diagonal sheen sweep */}
              <motion.div
                aria-hidden
                initial={{ x: '-150%' }}
                animate={{ x: '150%' }}
                transition={{ duration: 2.4, ease: 'easeInOut', delay: 0.6, repeat: Infinity, repeatDelay: 4 }}
                className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
              {/* Tiny dot grid for texture */}
              <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_25%_25%,white_1px,transparent_1px)] [background-size:6px_6px]" />

              {/* Brand icon — swap for your module's mark (default: fingerprint) */}
              <Fingerprint
                className="relative h-8 w-8 text-primary-foreground"
                strokeWidth={1.75}
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}
              />

              {/* Corner accent dot */}
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-white/70 shadow-sm shadow-white/40" />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-2xl font-bold tracking-tight"
          >
            <span className="text-foreground">eboss</span>
            {' '}
            <span className="text-primary">PRO</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.4 }}
            className="text-sm text-muted-foreground mt-1"
          >
            {t('appTagline')}
          </motion.p>
        </div>

        {/* Card with glass effect + gradient top accent */}
        <div className="relative rounded-3xl shadow-2xl shadow-primary/10 border border-border/60 bg-card/80 backdrop-blur-xl overflow-hidden">
          {/* Top gradient accent strip */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
          {/* Smooth fade between appcode ↔ login pages */}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground mt-6">
          <ShieldCheck className="h-3 w-3" />
          {t('secureFooter')}
        </p>
      </motion.div>
    </div>
  );
}

