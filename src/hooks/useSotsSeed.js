import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  buildOrdenesQuery,
  fetchQueryPage,
  SOTS_COLLECTION,
} from '../services/ordenesService';

const SEED_LIMIT = 200;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Muestra acotada de SOTs + opción "Cargar más" con paginación real (`startAfter`).
 * Caché de sesión solo para la primera página (evita JSON enorme y cursor obsoleto).
 */
export function useSotsSeed(profile, enabled = true, queryFilters = {}, seedLimit = SEED_LIMIT) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  const lastDocRef = useRef(null);
  const asesorUsedFallbackRef = useRef(false);
  const rowsRef = useRef([]);
  rowsRef.current = rows;

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        region: queryFilters.region ?? '',
        departamento: queryFilters.departamento ?? '',
        distrito: queryFilters.distrito ?? '',
        contratista: queryFilters.contratista ?? '',
      }),
    [
      queryFilters.region,
      queryFilters.departamento,
      queryFilters.distrito,
      queryFilters.contratista,
    ],
  );

  const cacheKey = useMemo(
    () =>
      profile?.rol
        ? `sots_seed_${profile.rol}_${profile.contratista ?? ''}_${filtersKey}_${seedLimit}`
        : 'sots_seed_guest',
    [profile?.rol, profile?.contratista, filtersKey, seedLimit],
  );

  const fetchPage = useCallback(
    async (cursor, options) => {
      const q = buildOrdenesQuery(
        { rol: profile.rol, contratista: profile.contratista ?? null },
        queryFilters,
        seedLimit,
        cursor,
        options,
      );
      return fetchQueryPage(q);
    },
    [profile?.rol, profile?.contratista, queryFilters, seedLimit],
  );

  const load = useCallback(async () => {
    if (!enabled || !profile?.rol) {
      setRows([]);
      setLoading(false);
      setError(null);
      setHasMore(false);
      lastDocRef.current = null;
      asesorUsedFallbackRef.current = false;
      return;
    }

    setLoading(true);
    setError(null);
    lastDocRef.current = null;
    asesorUsedFallbackRef.current = false;

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
          setHasMore(parsed.rows.length === seedLimit);
          setLoading(false);
          return;
        }
      }
    } catch {
      // cache opcional
    }

    try {
      try {
        const snap = await fetchPage(null, {});
        if (import.meta.env.DEV) {
          console.debug('[useSotsSeed] filas:', snap.docs.length);
        }
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
        setHasMore(snap.docs.length === seedLimit);
        setRows(list);
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ ts: Date.now(), rows: list }),
          );
        } catch {
          // cache opcional
        }
      } catch (err) {
        console.error('SOT QUERY ERROR:', err?.code, err?.message, err);
        if (profile?.rol === 'asesor') {
          try {
            const fallbackSnap = await fetchPage(null, {
              skipAsesorGestionFilter: true,
            });
            asesorUsedFallbackRef.current = true;
            if (import.meta.env.DEV) {
              console.debug('[useSotsSeed] fallback filas:', fallbackSnap.docs.length);
            }
            const fallbackList = fallbackSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            lastDocRef.current =
              fallbackSnap.docs[fallbackSnap.docs.length - 1] ?? null;
            setHasMore(fallbackSnap.docs.length === seedLimit);
            setRows(fallbackList);
            try {
              sessionStorage.setItem(
                cacheKey,
                JSON.stringify({ ts: Date.now(), rows: fallbackList }),
              );
            } catch {
              // cache opcional
            }
            return;
          } catch (fallbackError) {
            console.error(
              'SOT QUERY ERROR (fallback):',
              fallbackError?.code,
              fallbackError?.message,
              fallbackError,
            );
          }
        }
        throw err;
      }
    } catch (e) {
      console.error('SOT QUERY ERROR:', e?.code, e?.message, e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [cacheKey, enabled, fetchPage, profile?.rol, seedLimit]);

  const loadMore = useCallback(async () => {
    if (!enabled || !profile?.rol || !hasMore || loadingMore || loading) {
      return;
    }
    let cursor = lastDocRef.current;
    if (!cursor && rowsRef.current.length > 0) {
      const lastId = rowsRef.current[rowsRef.current.length - 1].id;
      const snap = await getDoc(doc(db, SOTS_COLLECTION, lastId));
      if (snap.exists()) cursor = snap;
    }
    if (!cursor) return;

    setLoadingMore(true);
    try {
      const opt =
        profile?.rol === 'asesor' && asesorUsedFallbackRef.current
          ? { skipAsesorGestionFilter: true }
          : {};
      const snap = await fetchPage(cursor, opt);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (list.length === 0) {
        setHasMore(false);
        return;
      }
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMore(snap.docs.length === seedLimit);
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        for (const r of list) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            merged.push(r);
          }
        }
        return merged;
      });
    } catch (e) {
      console.error('[useSotsSeed] loadMore', e);
      setError(e.message ?? String(e));
    } finally {
      setLoadingMore(false);
    }
  }, [
    enabled,
    profile?.rol,
    fetchPage,
    hasMore,
    loadingMore,
    loading,
    seedLimit,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    rows,
    loading,
    loadingMore,
    hasMore,
    error,
    reload: load,
    loadMore,
  };
}
