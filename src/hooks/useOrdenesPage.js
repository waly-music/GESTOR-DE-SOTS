import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildOrdenesQuery,
  fetchQueryPage,
} from '../services/ordenesService';

const PAGE_SIZE = 25;

/**
 * @param {{ rol: string, contratista: string|null } | null} profile
 * @param {{
 *   region: string,
 *   departamento: string,
 *   distrito: string,
 *   contratista: string,
 *   searchSot: string,
 * }} filters
 */
export function useOrdenesPage(profile, filters) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageCursors, setPageCursors] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const cacheRef = useRef({});

  const stableFilters = useMemo(
    () => ({
      region: filters.region || '',
      departamento: filters.departamento || '',
      distrito: filters.distrito || '',
      contratista: filters.contratista || '',
      searchSot: debouncedSearch || '',
    }),
    [filters, debouncedSearch],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.searchSot || '');
    }, 300);
    return () => clearTimeout(t);
  }, [filters.searchSot]);

  const resetPaging = useCallback(() => {
    setPageCursors([]);
    setPageIndex(0);
    setLastDoc(null);
  }, []);

  useEffect(() => {
    resetPaging();
  }, [stableFilters, profile, resetPaging]);

  useEffect(() => {
    if (!profile?.rol) {
      setRows([]);
      setLoading(false);
      return undefined;
    }

    setError(null);

    const cursor =
      pageIndex === 0 ? null : pageCursors[pageIndex - 1] ?? null;
    const cacheKey = JSON.stringify({
      rol: profile.rol,
      contratista: profile.contratista ?? '',
      ...stableFilters,
      pageIndex,
      cursorId: cursor?.id ?? null,
    });

    const cached = cacheRef.current[cacheKey];
    if (cached) {
      setRows(cached.rows);
      setLastDoc(cached.lastDoc);
      setHasMore(cached.hasMore);
      setLoading(false);
      return undefined;
    }
    setLoading(true);

    const q = buildOrdenesQuery(
      { rol: profile.rol, contratista: profile.contratista ?? null },
      {
        region: stableFilters.region || undefined,
        departamento: stableFilters.departamento || undefined,
        distrito: stableFilters.distrito || undefined,
        contratista: stableFilters.contratista || undefined,
        searchSot: stableFilters.searchSot || undefined,
      },
      PAGE_SIZE,
      cursor,
    );

    let cancelled = false;
    fetchQueryPage(q)
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows(list);
        const last = snap.docs[snap.docs.length - 1] ?? null;
        setLastDoc(last);
        setHasMore(snap.docs.length === PAGE_SIZE);
        cacheRef.current[cacheKey] = {
          rows: list,
          lastDoc: last,
          hasMore: snap.docs.length === PAGE_SIZE,
        };
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile, stableFilters, pageIndex, pageCursors]);

  const goNext = useCallback(() => {
    if (!hasMore || !lastDoc) return;
    setPageCursors((prev) => {
      const next = [...prev];
      next[pageIndex] = lastDoc;
      return next;
    });
    setPageIndex((i) => i + 1);
  }, [hasMore, lastDoc, pageIndex]);

  const goPrev = useCallback(() => {
    setPageIndex((i) => Math.max(0, i - 1));
  }, []);

  return {
    rows,
    loading,
    error,
    pageIndex,
    pageSize: PAGE_SIZE,
    hasMore,
    goNext,
    goPrev,
    canPrev: pageIndex > 0,
  };
}
