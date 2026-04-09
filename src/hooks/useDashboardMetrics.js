import { useCallback, useEffect, useState } from 'react';
import { getDashboardMetrics } from '../services/ordenesService';

export function useDashboardMetrics(profile) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!profile?.role) {
      setMetrics(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const m = await getDashboardMetrics({
        role: profile.role,
        contratista: profile.contratista ?? null,
      });
      setMetrics(m);
    } catch (e) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, loading, error, refresh };
}
