import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ExcelUpload } from '../components/ExcelUpload';
import {
  canLoadExcel,
  canViewGlobalMetrics,
  isAdmin,
} from '../utils/roles';
import { fetchAllOrdenesForExport } from '../services/ordenesService';
import { exportRowsToExcel } from '../utils/excelParser';
import { GestionModal } from '../components/GestionModal';
import { MetricCards } from '../components/MetricCards';
import { OrdersTable } from '../components/OrdersTable';
import { DashboardCharts } from '../components/DashboardCharts';
import { useSotsSeed } from '../hooks/useSotsSeed';
import { isAsesor, isSupervisor } from '../utils/roles';
import { saveGestion, updateOrdenObservacion } from '../services/ordenesService';
import { getFiltrosOptions, getFiltrosSeedRows } from '../services/filtrosService';

const STORAGE_FILTERS_KEY = 'sot_dashboard_filters_v2';

function fechaCitaIso(o) {
  const f = o.gestion?.fecha;
  if (!f) return '';
  if (typeof f.toDate === 'function') {
    return f.toDate().toISOString().slice(0, 10);
  }
  try {
    return new Date(f).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function gestionadoPorLabel(o) {
  const gp = o.gestionadoPor;
  if (gp?.nombre || gp?.email) {
    return [gp.nombre, gp.email].filter(Boolean).join(' · ');
  }
  const g = o.gestion;
  if (g?.usuarioNombre || g?.usuarioEmail) {
    return [g.usuarioNombre, g.usuarioEmail].filter(Boolean).join(' · ');
  }
  return '';
}

function buildExportRows(list) {
  return list.map((o) => ({
    SOT: o.sot,
    REGION: o.region,
    DEPARTAMENTO: o.departamento,
    DISTRITO: o.distrito,
    CONTRATISTA: o.contratista,
    GESTION: o.gestionTipo ?? o.gestion?.tipoGestion ?? '',
    GESTIONADO_POR: gestionadoPorLabel(o),
    FECHA_CITA: fechaCitaIso(o),
    RANGO: o.gestion?.rangoHorario ?? '',
    USUARIO: o.gestion?.usuarioEmail ?? '',
  }));
}

function normalizeFilterValue(v) {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_FILTERS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return {
          region: saved.region ?? '',
          departamento: saved.departamento ?? '',
          distrito: saved.distrito ?? '',
          contratista: saved.contratista ?? '',
          searchSot: saved.searchSot ?? '',
        };
      }
    } catch {
      // ignore
    }
    return {
      region: '',
      departamento: '',
      distrito: '',
      contratista: '',
      searchSot: '',
    };
  });
  const [modalOrden, setModalOrden] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [searchDebounced, setSearchDebounced] = useState(filters.searchSot);
  const [savingObsId, setSavingObsId] = useState(null);
  const [rowsLocal, setRowsLocal] = useState([]);
  const [actionMsg, setActionMsg] = useState(null);
  const [filterSeedRows, setFilterSeedRows] = useState([]);
  const [baseFilterOptions, setBaseFilterOptions] = useState({
    regions: [],
    departamentos: [],
    distritos: [],
    contratistas: [],
  });
  const debounceTimersRef = useRef(new Map());
  const latestTaskRef = useRef(new Map());

  const profileForQuery = useMemo(
    () =>
      profile
        ? { rol: profile.rol, contratista: profile.contratista ?? null }
        : null,
    [profile],
  );

  const roleNeedsStrictFilters = isAsesor(profile) || isSupervisor(profile);
  const missingRequiredFilters =
    roleNeedsStrictFilters &&
    (!filters.region ||
      !filters.departamento ||
      !filters.distrito ||
      !filters.contratista);

  const strictQueryFilters = useMemo(
    () =>
      roleNeedsStrictFilters && !missingRequiredFilters
        ? {
            // Consulta base robusta por contratista; los demás filtros se validan en cliente.
            contratista: filters.contratista || undefined,
          }
        : {},
    [
      roleNeedsStrictFilters,
      missingRequiredFilters,
      filters.region,
      filters.departamento,
      filters.distrito,
      filters.contratista,
    ],
  );

  useEffect(() => {
    if (!roleNeedsStrictFilters || missingRequiredFilters) return;
    console.log('ASESOR QUERY:', {
      region: filters.region,
      departamento: filters.departamento,
      distrito: filters.distrito,
      contratista: filters.contratista,
    });
  }, [
    roleNeedsStrictFilters,
    missingRequiredFilters,
    filters.region,
    filters.departamento,
    filters.distrito,
    filters.contratista,
  ]);

  const seed = useSotsSeed(
    profileForQuery,
    !missingRequiredFilters,
    strictQueryFilters,
    roleNeedsStrictFilters ? 500 : 200,
  );

  useEffect(() => {
    setRowsLocal(seed.rows);
  }, [seed.rows]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const options = await getFiltrosOptions();
        if (!alive) return;
        setBaseFilterOptions(options);
      } catch {
        if (!alive) return;
        setBaseFilterOptions({
          regions: [],
          departamentos: [],
          distritos: [],
          contratistas: [],
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isAsesor(profile)) return;
    const own = String(profile?.contratista ?? '').trim();
    if (!own) return;
    setFilters((f) => (f.contratista ? f : { ...f, contratista: own }));
  }, [profile?.rol, profile?.contratista]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const selected = String(filters.contratista ?? '').trim();
      const own = isAsesor(profile) ? String(profile?.contratista ?? '').trim() : '';
      const effectiveContractor = selected || own;
      try {
        const rows = await getFiltrosSeedRows(effectiveContractor || null);
        if (!alive) return;
        setFilterSeedRows(rows);
      } catch {
        if (!alive) return;
        setFilterSeedRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [filters.contratista, profile?.rol, profile?.contratista]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(filters.searchSot || '');
    }, 250);
    return () => clearTimeout(t);
  }, [filters.searchSot]);

  useEffect(() => {
    localStorage.setItem(STORAGE_FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);

  const options = useMemo(() => {
    const optionsSource = filterSeedRows.length
      ? filterSeedRows
      : baseFilterOptions.contratistas.length
        ? baseFilterOptions.contratistas.map((c) => ({ contratista: c }))
        : [];

    const regions = new Set(
      (filterSeedRows.length ? filterSeedRows : [])
        .map((x) => x.region)
        .filter(Boolean),
    );
    const departamentos = new Set(
      (filterSeedRows.length ? filterSeedRows : [])
        .filter((x) => !filters.region || x.region === filters.region)
        .map((x) => x.departamento)
        .filter(Boolean),
    );
    const distritos = new Set(
      (filterSeedRows.length ? filterSeedRows : [])
        .filter(
          (x) =>
            (!filters.region || x.region === filters.region) &&
            (!filters.departamento || x.departamento === filters.departamento),
        )
        .map((x) => x.distrito)
        .filter(Boolean),
    );
    const contratistas = new Set(
      optionsSource
        .filter(
          (x) =>
            (!x.region || !filters.region || x.region === filters.region) &&
            (!x.departamento ||
              !filters.departamento ||
              x.departamento === filters.departamento) &&
            (!x.distrito || !filters.distrito || x.distrito === filters.distrito),
        )
        .map((x) => x.contratista)
        .filter(Boolean),
    );
    if (!filterSeedRows.length) {
      for (const v of baseFilterOptions.regions) regions.add(v);
      for (const v of baseFilterOptions.departamentos) departamentos.add(v);
      for (const v of baseFilterOptions.distritos) distritos.add(v);
      for (const v of baseFilterOptions.contratistas) contratistas.add(v);
    }
    return {
      regions: [...regions].sort((a, b) => a.localeCompare(b)),
      departamentos: [...departamentos].sort((a, b) => a.localeCompare(b)),
      distritos: [...distritos].sort((a, b) => a.localeCompare(b)),
      contratistas: [...contratistas].sort((a, b) => a.localeCompare(b)),
    };
  }, [
    filterSeedRows,
    baseFilterOptions,
    filters.region,
    filters.departamento,
    filters.distrito,
  ]);

  const rowsFiltered = useMemo(
    () =>
      missingRequiredFilters
        ? []
        :
      rowsLocal.filter((item) => {
        const itemRegion = normalizeFilterValue(item.region);
        const itemDepartamento = normalizeFilterValue(item.departamento);
        const itemDistrito = normalizeFilterValue(item.distrito);
        const itemContratista = normalizeFilterValue(item.contratista);
        const filterRegion = normalizeFilterValue(filters.region);
        const filterDepartamento = normalizeFilterValue(filters.departamento);
        const filterDistrito = normalizeFilterValue(filters.distrito);
        const filterContratista = normalizeFilterValue(filters.contratista);
        const matchesSot =
          !searchDebounced ||
          String(item.sot ?? '')
            .toLowerCase()
            .includes(searchDebounced.toLowerCase());
        return (
          (!(isAsesor(profile) && Boolean(item.tieneGestion || item.gestionTipo))) &&
          (!filterRegion || itemRegion === filterRegion) &&
          (!filterDepartamento || itemDepartamento === filterDepartamento) &&
          (!filterDistrito || itemDistrito === filterDistrito) &&
          (!filterContratista || itemContratista === filterContratista) &&
          matchesSot
        );
      }),
    [
      rowsLocal,
      filters.region,
      filters.departamento,
      filters.distrito,
      filters.contratista,
      searchDebounced,
      missingRequiredFilters,
    ],
  );

  const localMetrics = useMemo(() => {
    const total = rowsFiltered.length;
    const gestionadas = rowsFiltered.filter((d) => Boolean(d.tieneGestion)).length;
    const confirmadoHoy = rowsFiltered.filter(
      (d) => (d.gestionTipo ?? d.gestion?.tipoGestion) === 'CONFIRMADO_HOY',
    ).length;
    const confirmadoFuturo = rowsFiltered.filter(
      (d) => (d.gestionTipo ?? d.gestion?.tipoGestion) === 'CONFIRMADO_FUTURO',
    ).length;
    const rechazos = rowsFiltered.filter(
      (d) => (d.gestionTipo ?? d.gestion?.tipoGestion) === 'RECHAZO',
    ).length;
    return { total, gestionadas, confirmadoHoy, confirmadoFuturo, rechazos };
  }, [rowsFiltered]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.region) chips.push({ key: 'region', label: filters.region });
    if (filters.departamento) {
      chips.push({ key: 'departamento', label: filters.departamento });
    }
    if (filters.distrito) chips.push({ key: 'distrito', label: filters.distrito });
    if (filters.contratista) {
      chips.push({ key: 'contratista', label: filters.contratista });
    }
    return chips;
  }, [filters.region, filters.departamento, filters.distrito, filters.contratista]);

  const filterFields = (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <FilterSelect
        label="Región"
        value={filters.region}
        options={options.regions}
        onChange={(v) =>
          setFilters((f) => ({
            ...f,
            region: v,
            departamento: '',
            distrito: '',
          }))
        }
      />
      <FilterSelect
        label="Departamento"
        value={filters.departamento}
        options={options.departamentos}
        onChange={(v) => setFilters((f) => ({ ...f, departamento: v, distrito: '' }))}
      />
      <FilterSelect
        label="Distrito"
        value={filters.distrito}
        options={options.distritos}
        onChange={(v) => setFilters((f) => ({ ...f, distrito: v }))}
      />
      <FilterSelect
        label="Contratista"
        value={filters.contratista}
        options={options.contratistas}
        onChange={(v) => setFilters((f) => ({ ...f, contratista: v }))}
      />
      <div>
        <label className="block text-xs font-medium text-slate-600">
          Buscar SOT
        </label>
        <input
          value={filters.searchSot}
          onChange={(e) =>
            setFilters((f) => ({ ...f, searchSot: e.target.value }))
          }
          placeholder="Ej. 12345"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {activeFilterChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                [chip.key]: '',
                ...(chip.key === 'region'
                  ? { departamento: '', distrito: '' }
                  : chip.key === 'departamento'
                    ? { distrito: '' }
                    : {}),
              }))
            }
            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
            title="Quitar filtro"
          >
            {chip.label} ✕
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            setFilters({
              region: '',
              departamento: '',
              distrito: '',
              contratista: '',
              searchSot: '',
            })
          }
          className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );

  async function handleExport() {
    if (!profileForQuery) return;
    setExporting(true);
    try {
      const list = await fetchAllOrdenesForExport(profileForQuery, {
        region: filters.region || undefined,
        departamento: filters.departamento || undefined,
        distrito: filters.distrito || undefined,
        contratista: filters.contratista || undefined,
        searchSot: filters.searchSot || undefined,
      });
      await exportRowsToExcel(
        buildExportRows(list),
        `sot_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } finally {
      setExporting(false);
    }
  }

  function patchRowLocal(ordenId, patch) {
    setRowsLocal((prev) =>
      prev.map((row) => (row.id === ordenId ? { ...row, ...patch } : row)),
    );
  }

  function scheduleDebouncedPersist(key, worker) {
    const prevPending = latestTaskRef.current.get(key);
    if (prevPending) {
      prevPending.reject(new Error('cancelled'));
    }
    if (debounceTimersRef.current.has(key)) {
      clearTimeout(debounceTimersRef.current.get(key));
    }
    return new Promise((resolve, reject) => {
      latestTaskRef.current.set(key, { resolve, reject });
      const timer = setTimeout(async () => {
        try {
          await worker();
          const pending = latestTaskRef.current.get(key);
          if (pending) pending.resolve();
        } catch (err) {
          const pending = latestTaskRef.current.get(key);
          if (pending) pending.reject(err);
        } finally {
          debounceTimersRef.current.delete(key);
          latestTaskRef.current.delete(key);
        }
      }, 300);
      debounceTimersRef.current.set(key, timer);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Dashboard de operación SOT
        </h1>
        <p className="mt-1 text-slate-600">
          Gestión productiva para call center: filtros rápidos, métricas y acciones sin recargas.
        </p>
      </div>

      {canViewGlobalMetrics(profile) && (
        <MetricCards
          metrics={localMetrics}
          loading={seed.loading}
          onRefresh={seed.reload}
        />
      )}
      {canViewGlobalMetrics(profile) && (
        <DashboardCharts rows={rowsFiltered} metrics={localMetrics} />
      )}

      {canLoadExcel(profile) && (
        <section className="space-y-4 rounded-2xl border-2 border-brand-500 bg-gradient-to-b from-brand-50/80 to-white p-5 shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isAdmin(profile)
                  ? 'Administración — Excel y usuarios'
                  : 'Importación — Excel base'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                <strong>Cargar Excel:</strong> vista previa y guardado en Firestore
                (colección <code className="rounded bg-slate-100 px-1 text-xs">sots</code>).
                Columnas SOT, Región, Departamento, Distrito, Contratista; opcional
                Gestión.{' '}
                {isAdmin(profile) ? (
                  <Link
                    to="/admin"
                    className="font-medium text-brand-700 underline hover:text-brand-800"
                  >
                    Crear usuarios y más opciones
                  </Link>
                ) : (
                  <Link
                    to="/admin"
                    className="font-medium text-brand-700 underline hover:text-brand-800"
                  >
                    Abrir panel de importación
                  </Link>
                )}
              </p>
            </div>
            <Link
              to="/admin"
              className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-700"
            >
              {isAdmin(profile) ? 'Panel administración' : 'Importar / administrar'}
            </Link>
          </div>
          <ExcelUpload
            onDone={() => {
              seed.reload();
            }}
          />
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-900">
            Gestión de tickets (SOT)
          </h2>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? 'Exportando…' : 'Exportar Excel (filtros actuales)'}
          </button>
        </div>
        {filterFields}
        {missingRequiredFilters && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Seleccione todos los filtros para ver las órdenes.
          </div>
        )}
      </section>

      <OrdersTable
        rows={rowsFiltered}
        loading={seed.loading}
        error={seed.error}
        pageIndex={0}
        pageSize={rowsFiltered.length}
        hasMore={false}
        canPrev={false}
        onPrev={() => {}}
        onNext={() => {}}
        showPagination={false}
        savingObservacionId={savingObsId}
        onSaveObservacion={async (orden, value) => {
          const nextObs = String(value ?? '').trim().slice(0, 120);
          const prevObs = String(orden.observacion ?? '');
          patchRowLocal(orden.id, { observacion: nextObs });
          setSavingObsId(orden.id);
          try {
            await scheduleDebouncedPersist(`obs:${orden.id}`, async () => {
              await updateOrdenObservacion(orden.id, nextObs);
            });
          } catch (err) {
            if (err?.message !== 'cancelled') {
              patchRowLocal(orden.id, { observacion: prevObs });
              setActionMsg({
                type: 'err',
                text: err?.message ?? 'No se pudo guardar la observación.',
              });
            }
          } finally {
            setSavingObsId(null);
          }
        }}
        onGestionar={(o) => setModalOrden(o)}
      />

      {actionMsg && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            actionMsg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      <GestionModal
        open={Boolean(modalOrden)}
        orden={modalOrden}
        onClose={() => setModalOrden(null)}
        onSaveGestion={async ({ ordenId, gestion, actor, observacion }) => {
          const prev = rowsLocal.find((r) => r.id === ordenId);
          if (!prev) return;
          const nextObs = String(observacion ?? '').trim().slice(0, 120);
          const optimisticPatch = {
            gestion: {
              ...(prev.gestion ?? {}),
              tipoGestion: gestion.tipoGestion,
              // Evita mostrar fecha optimista hasta confirmar guardado.
              fecha: null,
              rangoHorario: gestion.rangoHorario ?? null,
              usuarioId: actor.uid,
              usuarioEmail: actor.email ?? '',
              usuarioNombre: actor.displayName ?? '',
            },
            tieneGestion: true,
            gestionTipo: gestion.tipoGestion,
            gestionadoPor: {
              nombre:
                actor.displayName?.trim() ||
                (actor.email ? String(actor.email).split('@')[0] : ''),
              email: actor.email ?? '',
              uid: actor.uid,
            },
            observacion: nextObs || prev.observacion || '',
          };
          patchRowLocal(ordenId, optimisticPatch);
          setActionMsg(null);
          try {
            await scheduleDebouncedPersist(`gestion:${ordenId}`, async () => {
              await saveGestion(ordenId, gestion, actor);
            });
            if (nextObs) {
              await scheduleDebouncedPersist(`obs:${ordenId}`, async () => {
                await updateOrdenObservacion(ordenId, nextObs);
              });
            }
            patchRowLocal(ordenId, {
              gestion: {
                ...(prev.gestion ?? {}),
                tipoGestion: gestion.tipoGestion,
                fecha: gestion.fecha ?? null,
                rangoHorario: gestion.rangoHorario ?? null,
                usuarioId: actor.uid,
                usuarioEmail: actor.email ?? '',
                usuarioNombre: actor.displayName ?? '',
              },
              observacion: nextObs || prev.observacion || '',
            });
            setActionMsg({ type: 'ok', text: 'Gestión actualizada.' });
          } catch (err) {
            if (err?.message === 'cancelled') return;
            patchRowLocal(ordenId, {
              gestion: prev.gestion ?? null,
              tieneGestion: prev.tieneGestion ?? false,
              gestionTipo: prev.gestionTipo ?? null,
              gestionadoPor: prev.gestionadoPor ?? null,
            });
            setActionMsg({
              type: 'err',
              text: err?.message ?? 'No se pudo guardar la gestión. Se revirtió el cambio.',
            });
          }
        }}
        onSaved={() => {
          // Estado local optimista: evitamos recargar toda la colección.
        }}
      />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
