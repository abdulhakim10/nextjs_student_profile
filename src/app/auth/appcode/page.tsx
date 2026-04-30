'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function AppcodePage() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const { setAppcodeData, setLoading, setError, isLoading, error, clearError } =
    useAuthStore();
  const [appcode, setAppcode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appcode.trim()) return;

    clearError();
    setLoading(true);

    try {
      const response = await authService.validateAppcode(appcode.trim());

      if (response.success && response.data) {
        setAppcodeData(response.data);
        router.push('/auth/login');
      } else {
        setError(response.message || t('invalidAppcode'));
      }
    } catch (err: unknown) {
      console.error('Appcode validation error:', err);
      const error = err as {
        response?: {
          data?: {
            message?: string;
            success?: boolean;
          };
          status?: number;
        };
        message?: string;
      };

      let errorMessage = t('failedValidateAppcode');

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status) {
        errorMessage = t('serverError').replace('{status}', String(error.response.status));
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">{t('welcomeBack')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('welcomeBackDesc')}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="appcode" className="text-sm font-medium">
            {t('organizationCode')}
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="appcode"
              type="text"
              placeholder={t('enterAppcode')}
              value={appcode}
              onChange={(e) => setAppcode(e.target.value)}
              disabled={isLoading}
              autoFocus
              className="h-11 pl-10 rounded-xl bg-background/60 focus-visible:ring-primary/30"
            />
          </div>
        </div>
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <Button
          type="submit"
          className="group w-full h-11 rounded-xl font-medium text-sm gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
          disabled={isLoading || !appcode.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('validating')}
            </>
          ) : (
            <>
              {t('continueBtn')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
