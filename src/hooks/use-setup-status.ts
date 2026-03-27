import { useEffect, useState, useCallback } from 'react';
import { checkSetupStatus, type SetupStatus } from '@/lib/setup-status';

export function useSetupStatus(selectedSid: string) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!selectedSid || selectedSid === 'all') {
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const s = await checkSetupStatus(selectedSid);
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [selectedSid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
