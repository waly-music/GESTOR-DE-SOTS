import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildOrdenesQuery, fetchQueryPage } from '../services/ordenesService';

const SEED_LIMIT = 200;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Carga una muestra acotada de SOTs una sola vez por sesión para filtros instantáneos.
 * Reduce lecturas al evitar consultas por cada cambio de filtro.
 * @param {{ rol: string, contratista: string|null } | null} profile
 * @param {boolean} [enabled]
 */
export function useSotsSeed(profile, enabled = true) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cacheKey = useMemo(
    () =>
      profile?.rol
        ? `sots_seed_${profile.rol}_${profile.contratista ?? ''}`
        : 'sots_seed_guest',
    [profile?.rol, profile?.contratista],
  );

  const load = useCallback(async () => {
    if (!enabled || !profile?.rol) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed?.ts &&
          Array.isArray(parsed?.rows) &&
          Date.now() - parsed.ts < CACHE_TTL_MS
        ) {
          setRows(parsed.rows);
          setLoading(false);
          return;
        }
      }
    } catch {
      // cache opcional
    }

    try {
      try {
        const q = buildOrdenesQuery(
          { rol: profile.rol, contratista: profile.contratista ?? null },
          {},
          SEED_LIMIT,
        );
        const snap = await fetchQueryPage(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows(list);
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ ts: Date.now(), rows: list }),
          );
        } catch {
          // cache opcional
        }
      } catch (error) {
        console.error('SOT QUERY ERROR:', error?.code, error?.message, error);
        throw error;
      }
    } catch (e) {
      console.error('SOT QUERY ERROR:', e?.code, e?.message, e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [cacheKey, profile?.rol, profile?.contratista, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, error, reload: load };
}
