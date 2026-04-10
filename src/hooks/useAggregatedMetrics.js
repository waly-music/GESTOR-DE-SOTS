import { useCallback, useEffect, useRef, useState } from 'react';
import { getDashboardMetrics } from '../services/ordenesService';
import { canViewGlobalMetrics } from '../utils/roles';

/**
 * Totales reales desde `metricas/global` o `metricas/contratista_*` (1 lectura).
 * Mantenidos por Cloud Function `syncSotMetrics`; no dependen del límite de la query de tabla.
 *
 * - Dependencias estables (`rol` / `contratista`) para no disparar refetch por identidad de objeto `profile`.
 * - Refresco "suave": no limpia los números mientras se vuelve a leer (menos parpadeo en UI).
 */
export function useAggregatedMetrics(profile, enabled = true) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const metricsRef = useRef(null);
  metricsRef.current = metrics;

  const rol = profile?.rol;
  const contratista = profile?.contratista ?? null;

  const refresh = useCallback(async () => {
    const slice = { rol, contratista };
    if (!enabled || !rol || !canViewGlobalMetrics(slice)) {
      setMetrics(null);
      setLoading(false);
      setError(null);
      return;
    }
    const firstLoad = metricsRef.current == null;
    if (firstLoad) {
      setLoading(true);
    }
    setError(null);
    try {
      const m = await getDashboardMetrics(slice);
      setMetrics(m);
    } catch (e) {
      setError(e.message ?? String(e));
      if (firstLoad) setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, rol, contratista]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, loading, error, refresh };
}
