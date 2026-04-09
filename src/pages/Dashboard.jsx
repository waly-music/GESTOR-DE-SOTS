import { useEffect, useMemo, useState } from 'react';
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
import { updateOrdenObservacion } from '../services/ordenesService';

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

  const seed = useSotsSeed(profileForQuery, !missingRequiredFilters);

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
    const regions = new Set(seed.rows.map((x) => x.region).filter(Boolean));
    const departamentos = new Set(
      seed.rows
        .filter((x) => !filters.region || x.region === filters.region)
        .map((x) => x.departamento)
        .filter(Boolean),
    );
    const distritos = new Set(
      seed.rows
        .filter(
          (x) =>
            (!filters.region || x.region === filters.region) &&
            (!filters.departamento || x.departamento === filters.departamento),
        )
        .map((x) => x.distrito)
        .filter(Boolean),
    );
    const contratistas = new Set(
      seed.rows
        .filter(
          (x) =>
            (!filters.region || x.region === filters.region) &&
            (!filters.departamento || x.departamento === filters.departamento) &&
            (!filters.distrito || x.distrito === filters.distrito),
        )
        .map((x) => x.contratista)
        .filter(Boolean),
    );
    return {
      regions: [...regions].sort((a, b) => a.localeCompare(b)),
      departamentos: [...departamentos].sort((a, b) => a.localeCompare(b)),
      distritos: [...distritos].sort((a, b) => a.localeCompare(b)),
      contratistas: [...contratistas].sort((a, b) => a.localeCompare(b)),
    };
  }, [
    seed.rows,
    filters.region,
    filters.departamento,
    filters.distrito,
  ]);

  const rowsFiltered = useMemo(
    () =>
      missingRequiredFilters
        ? []
        :
      seed.rows.filter((item) => {
        const matchesSot =
          !searchDebounced ||
          String(item.sot ?? '')
            .toLowerCase()
            .includes(searchDebounced.toLowerCase());
        return (
          (!filters.region || item.region === filters.region) &&
          (!filters.departamento || item.departamento === filters.departamento) &&
          (!filters.distrito || item.distrito === filters.distrito) &&
          (!filters.contratista || item.contratista === filters.contratista) &&
          matchesSot
        );
      }),
    [
      seed.rows,
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
          setSavingObsId(orden.id);
          try {
            await updateOrdenObservacion(orden.id, value);
            await seed.reload();
          } finally {
            setSavingObsId(null);
          }
        }}
        onGestionar={(o) => setModalOrden(o)}
      />

      <GestionModal
        open={Boolean(modalOrden)}
        orden={modalOrden}
        onClose={() => setModalOrden(null)}
        onSaved={() => {
          seed.reload();
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
