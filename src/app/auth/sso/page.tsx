'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { authService, type SSOVerifyData } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Loader2, Link2, ArrowLeft, AlertCircle } from 'lucide-react';
import type { AppcodeData, UserData } from '@/types';

function mapAppcodeData(data: SSOVerifyData): AppcodeData {
  return {
    encrypted_key: data.encrypted_key,
    server_id: data.server_id,
    sid: data.sid,
    client_appname: data.client_appname,
    customer: data.customer,
    client_logo: data.client_logo,
    url: data.url,
    bos_config: data.bos_config,
    app_config: data.app_config,
  };
}

function mapUserData(data: SSOVerifyData): UserData {
  return {
    token: data.token,
    encrypted_user: data.encrypted_user,
    tfa_expired: false,
    is_default_password: false,
    password_expired_in: '',
    server_id: data.server_id,
    user_id: data.user_id,
    user_sid: data.user_sid,
    user_name: data.user_name,
    user_image: data.user_image || '',
    user_phone_num: data.user_phone_num || '',
    user_ic: data.user_ic || '',
    user_email: data.user_email || '',
    user_addr: data.user_addr || '',
    sch_name: data.sch_name || '',
    sch_addr: data.sch_addr || '',
    sch_coordinate: '',
    sch_coordinate_arr: [],
    sch_radius: '',
    system_level: data.system_level || '',
    system_access: data.system_access || '',
    system_config: '',
    bos_config: data.bos_config || '',
  };
}

export default function SSOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { setAppcodeData, setUserData, _hasHydrated } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (verifyAttempted.current) return;

    if (!token) {
      // External-state sync: SSO token comes from URL search param, not local state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Missing SSO token');
      return;
    }

    verifyAttempted.current = true;

    const verify = async () => {
      try {
        const response = await authService.verifySSOToken(token);

        setAppcodeData(mapAppcodeData(response.data));
        setUserData(mapUserData(response.data));
        router.replace('/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'SSO verification failed');
      }
    };

    verify();
  }, [_hasHydrated, token, setAppcodeData, setUserData, router]);

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 ring-4 ring-destructive/5">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Authentication Failed</h2>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 mt-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full h-10 rounded-xl text-sm text-muted-foreground hover:text-foreground"
          onClick={() => router.replace('/auth/appcode')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go to login
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-4 ring-primary/5">
          <Link2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Single Sign-On</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verifying your credentials...
        </p>
      </div>
      <div className="flex justify-center py-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );
}
