import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ExcelUpload } from '../components/ExcelUpload';
import { isAdmin } from '../utils/roles';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { useOrdenesPage } from '../hooks/useOrdenesPage';
import { fetchAllOrdenesForExport } from '../services/ordenesService';
import { getFiltrosOptions } from '../services/filtrosService';
import { exportRowsToExcel } from '../utils/excelParser';
import { GestionModal } from '../components/GestionModal';
import { MetricCards } from '../components/MetricCards';
import { OrdersTable } from '../components/OrdersTable';

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

function buildExportRows(list) {
  return list.map((o) => ({
    SOT: o.sot,
    REGION: o.region,
    DEPARTAMENTO: o.departamento,
    DISTRITO: o.distrito,
    CONTRATISTA: o.contratista,
    GESTION: o.gestionTipo ?? o.gestion?.tipoGestion ?? '',
    FECHA_CITA: fechaCitaIso(o),
    RANGO: o.gestion?.rangoHorario ?? '',
    USUARIO: o.gestion?.usuarioEmail ?? '',
  }));
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [filtrosMeta, setFiltrosMeta] = useState({
    regions: [],
    departamentos: [],
    distritos: [],
    contratistas: [],
  });
  const [filters, setFilters] = useState({
    region: '',
    departamento: '',
    distrito: '',
    contratista: '',
    searchSot: '',
  });
  const [modalOrden, setModalOrden] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filtrosTick, setFiltrosTick] = useState(0);

  const profileForQuery = useMemo(
    () =>
      profile
        ? { role: profile.role, contratista: profile.contratista ?? null }
        : null,
    [profile],
  );

  const ordenes = useOrdenesPage(profileForQuery, filters);
  const metrics = useDashboardMetrics(profileForQuery);

  const loadFiltros = useCallback(() => {
    getFiltrosOptions().then(setFiltrosMeta).catch(console.error);
  }, []);

  useEffect(() => {
    loadFiltros();
  }, [loadFiltros, filtrosTick]);

  const filterFields = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <FilterSelect
        label="Región"
        value={filters.region}
        options={filtrosMeta.regions}
        onChange={(v) => setFilters((f) => ({ ...f, region: v }))}
      />
      <FilterSelect
        label="Departamento"
        value={filters.departamento}
        options={filtrosMeta.departamentos}
        onChange={(v) => setFilters((f) => ({ ...f, departamento: v }))}
      />
      <FilterSelect
        label="Distrito"
        value={filters.distrito}
        options={filtrosMeta.distritos}
        onChange={(v) => setFilters((f) => ({ ...f, distrito: v }))}
      />
      {isAdmin(profile) ? (
        <FilterSelect
          label="Contratista"
          value={filters.contratista}
          options={filtrosMeta.contratistas}
          onChange={(v) => setFilters((f) => ({ ...f, contratista: v }))}
        />
      ) : (
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Contratista
          </label>
          <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {profile?.contratista || '—'}
          </p>
        </div>
      )}
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Panel de gestión
        </h1>
        <p className="mt-1 text-slate-600">
          Órdenes de trabajo para instalación de internet — vista en tiempo real.
        </p>
      </div>

      <MetricCards
        metrics={metrics.metrics}
        loading={metrics.loading}
        onRefresh={metrics.refresh}
      />

      {isAdmin(profile) && (
        <section className="space-y-4 rounded-xl border-2 border-brand-500 bg-gradient-to-b from-brand-50/80 to-white p-5 shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Administración — Excel y usuarios
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                <strong>Importar Excel:</strong> columnas REGION, DEPARTAMENTO,
                DISTRITO, CONTRATISTA, SOT.{' '}
                <Link
                  to="/admin"
                  className="font-medium text-brand-700 underline hover:text-brand-800"
                >
                  Crear usuarios y más opciones
                </Link>
              </p>
            </div>
            <Link
              to="/admin"
              className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-700"
            >
              Panel administración
            </Link>
          </div>
          <ExcelUpload
            onDone={() => {
              metrics.refresh();
              setFiltrosTick((t) => t + 1);
            }}
          />
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-900">
            Filtros y tabla
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
      </section>

      <OrdersTable
        rows={ordenes.rows}
        loading={ordenes.loading}
        error={ordenes.error}
        pageIndex={ordenes.pageIndex}
        pageSize={ordenes.pageSize}
        hasMore={ordenes.hasMore}
        canPrev={ordenes.canPrev}
        onPrev={ordenes.goPrev}
        onNext={ordenes.goNext}
        onGestionar={(o) => setModalOrden(o)}
      />

      <GestionModal
        open={Boolean(modalOrden)}
        orden={modalOrden}
        onClose={() => setModalOrden(null)}
        onSaved={() => {
          metrics.refresh();
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
