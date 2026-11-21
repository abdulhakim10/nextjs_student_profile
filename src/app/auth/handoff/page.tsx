'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguageStore } from '@/stores/language.store';
import { isLocale } from '@/i18n/types';
import { isTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { STORAGE_KEYS } from '@/config/constants';
import { resolveViewRole, roleHome } from '@/lib/role';
import { ModuleTransition } from '@/components/layout/module-transition';
import type { AppcodeData, UserData } from '@/types';

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/**
 * /auth/handoff?next=/students&lang=…&theme=…#h=<sealed login>
 *
 * Landing page for the SPS portal's Student Profile card: exchanges the sealed
 * login (in the #fragment, so it never hits server logs) for our session
 * cookies via /api/handoff, then goes to `next` — the user never sees a login.
 */
export default function HandoffPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAppcodeData, setUserData, _hasHydrated } = useAuthStore();
  const { setTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!_hasHydrated || attempted.current) return;
    attempted.current = true;

    const h = new URLSearchParams(window.location.hash.slice(1)).get('h');
    // Drop the blob from the address bar / history right away
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    const run = async () => {
      if (!h) throw new Error('Missing sign-in link');
      const res = await fetch('/api/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ h }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Sign-in failed');

      const a = (json.data.appcode ?? {}) as Record<string, unknown>;
      const p = (json.data.profile ?? {}) as Record<string, unknown>;
      const appcode: AppcodeData = {
        app_code: a.app_code ? str(a.app_code) : undefined,
        server_id: str(a.server_id),
        sid: str(a.sid),
        client_appname: str(a.client_appname),
        customer: str(a.customer),
        client_logo: str(a.client_logo),
        url: str(a.url),
        bos_config: str(a.bos_config),
        app_config: str(a.app_config),
      };
      const user: UserData = {
        tfa_expired: false,
        is_default_password: false,
        password_expired_in: '',
        server_id: str(p.server_id || a.server_id),
        user_id: str(p.user_id),
        user_sid: str(p.user_sid),
        user_name: str(p.user_name),
        user_image: str(p.user_image),
        user_phone_num: str(p.user_phone_num),
        user_ic: str(p.user_ic),
        user_email: str(p.user_email),
        user_addr: str(p.user_addr),
        sch_name: str(p.sch_name),
        sch_addr: str(p.sch_addr),
        sch_coordinate: '',
        sch_coordinate_arr: [],
        sch_radius: '',
        system_level: str(p.system_level),
        system_access: str(p.system_access),
        system_config: '',
        bos_config: str(p.bos_config),
      };
      setAppcodeData(appcode);
      setUserData(user);

      // Not entered from the main hub — idle expiry should use our own login
      localStorage.removeItem(STORAGE_KEYS.SSO_RETURN_URL);
      sessionStorage.removeItem(STORAGE_KEYS.ROLE_OVERRIDE);

      const lang = searchParams.get('lang');
      if (lang && isLocale(lang) && useLanguageStore.getState().locale !== lang) useLanguageStore.getState().setLocale(lang);
      const theme = searchParams.get('theme');
      if (theme && isTheme(theme)) setTheme(theme);

      // Internal paths only, so a crafted link can't bounce the user off-site
      const next = searchParams.get('next');
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : roleHome(resolveViewRole(user)));
    };

    run().catch((err) => setError(err instanceof Error ? err.message : 'Sign-in failed'));
  }, [_hasHydrated, searchParams, setAppcodeData, setUserData, setTheme, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 ring-4 ring-destructive/5">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Authentication Failed</h2>
            <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
          <Button variant="ghost" className="h-10 w-full rounded-xl text-sm text-muted-foreground hover:text-foreground" onClick={() => router.replace('/auth/appcode')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  return <ModuleTransition />;
}
