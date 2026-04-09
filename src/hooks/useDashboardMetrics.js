import { useCallback, useEffect, useState } from 'react';
import { getDashboardMetrics } from '../services/ordenesService';
import { canViewGlobalMetrics } from '../utils/roles';

const METRICS_TTL_MS = 60 * 1000;

export function useDashboardMetrics(profile) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!profile?.rol || !canViewGlobalMetrics(profile)) {
      setMetrics(null);
      setLoading(false);
      return;
    }
    const cacheKey = `metrics_${profile.rol}_${profile.contratista ?? ''}`;
    const now = Date.now();
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.ts && now - parsed.ts < METRICS_TTL_MS && parsed?.value) {
          setMetrics(parsed.value);
          setLoading(false);
          setError(null);
          return;
        }
      }
    } catch {
      // cache opcional
    }

    setLoading(true);
    setError(null);
    try {
      const m = await getDashboardMetrics({
        rol: profile.rol,
        contratista: profile.contratista ?? null,
      });
      setMetrics(m);
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ ts: Date.now(), value: m }),
        );
      } catch {
        // cache opcional
      }
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
