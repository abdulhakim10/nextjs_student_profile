'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { APP_VERSION } from '@/config/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Eye, EyeOff, LogIn, User, Lock } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const {
    appcodeData,
    isAppCodeVerified,
    _hasHydrated,
    setUserData,
    setLoading,
    setError,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAppCodeVerified) {
      router.replace('/auth/appcode');
    }
  }, [_hasHydrated, isAppCodeVerified, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    clearError();
    setLoading(true);

    const firebaseId = '';
    try {
      const response = await authService.login({
        app_version: APP_VERSION,
        username: username.trim(),
        password: password.trim(),
        login_type: 'normal',
        firebase_id: firebaseId,
        platform_code: 1,
      });

      if (response.success && response.data) {
        setUserData(response.data, firebaseId);
        router.push('/dashboard');
      } else {
        setError(response.message || t('loginFailed'));
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || t('loginFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAppcode = () => {
    router.push('/auth/appcode');
  };

  if (!_hasHydrated || !isAppCodeVerified) return null;

  return (
    <div className="p-8">
      <div className="text-center mb-6">
        {appcodeData?.client_logo ? (
          <div className="relative mx-auto mb-4 inline-block">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl" />
            <div className="relative ring-4 ring-primary/10 rounded-full inline-block bg-card">
              <Image
                src={appcodeData.client_logo}
                alt={appcodeData.customer || t('organizationFallback')}
                width={64}
                height={64}
                className="rounded-full"
                unoptimized
              />
            </div>
          </div>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight">
          {appcodeData?.customer || t('signInTitle')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('signInDesc')}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium">
            {t('username')}
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="username"
              type="text"
              placeholder={t('enterUsername')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoFocus
              className="h-11 pl-10 rounded-xl bg-background/60 focus-visible:ring-primary/30"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            {t('password')}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('enterPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-11 pl-10 pr-10 rounded-xl bg-background/60 focus-visible:ring-primary/30"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <div className="space-y-3 pt-1">
          <Button
            type="submit"
            className="group w-full h-11 rounded-xl font-medium text-sm gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
            disabled={isLoading || !username.trim() || !password.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('signingIn')}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 transition-transform group-hover:scale-110" />
                {t('signInBtn')}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-10 rounded-xl text-sm text-muted-foreground hover:text-foreground"
            onClick={handleBackToAppcode}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('changeOrganization')}
          </Button>
        </div>
      </form>
    </div>
  );
}
