import { TIPOS_GESTION } from '../constants/gestion';
import { rowClassForGestion } from '../utils/gestionColors';
import { formatDateOnly } from '../utils/gestionColors';

const labelTipo = (v) =>
  TIPOS_GESTION.find((t) => t.value === v)?.label ?? v ?? '—';

export function OrdersTable({
  rows,
  loading,
  error,
  pageIndex,
  pageSize,
  hasMore,
  canPrev,
  onPrev,
  onNext,
  onGestionar,
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Error al cargar órdenes</p>
        <p className="mt-1">{error}</p>
        <p className="mt-2 text-xs text-red-700">
          Si aparece un índice faltante, créelo desde el enlace del error de
          consola o despliegue{' '}
          <code className="rounded bg-red-100 px-1">firestore.indexes.json</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-3">SOT</th>
              <th className="px-3 py-3">Región</th>
              <th className="px-3 py-3">Departamento</th>
              <th className="px-3 py-3">Distrito</th>
              <th className="px-3 py-3">Contratista</th>
              <th className="px-3 py-3">Gestión</th>
              <th className="px-3 py-3">Detalle</th>
              <th className="px-3 py-3 w-36" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !rows.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : null}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  No hay resultados para los filtros actuales.
                </td>
              </tr>
            ) : null}
            {rows.map((o) => {
              const tipo = o.gestionTipo ?? o.gestion?.tipoGestion;
              return (
                <tr
                  key={o.id}
                  className={`transition ${rowClassForGestion(tipo)}`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-900">
                    {o.sot}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{o.region}</td>
                  <td className="px-3 py-2 text-slate-700">{o.departamento}</td>
                  <td className="px-3 py-2 text-slate-700">{o.distrito}</td>
                  <td className="px-3 py-2 text-slate-700">{o.contratista}</td>
                  <td className="px-3 py-2 text-slate-800">
                    {labelTipo(tipo)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {tipo === 'CONFIRMADO_FUTURO' || tipo === 'CONFIRMADO_HOY' ? (
                      <span>
                        {formatDateOnly(o.gestion?.fecha)}{' '}
                        {o.gestion?.rangoHorario
                          ? `· ${o.gestion.rangoHorario}`
                          : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onGestionar(o)}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-sm text-slate-600">
        <span>
          Página {pageIndex + 1} · {pageSize} por página
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={onPrev}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={!hasMore}
            onClick={onNext}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
