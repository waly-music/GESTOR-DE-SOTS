import { formatDateOnly, rowClassForGestion } from '../utils/gestionColors';
import { AgendaStatusBadge } from './AgendaStatusBadge';
import { DilacionBadge } from './DilacionBadge';
import { StatusBadge } from './StatusBadge';
import { useEffect, useState } from 'react';

function labelGestionadoPor(o) {
  const gp = o.gestionadoPor;
  if (gp?.nombre || gp?.email) {
    return [gp.nombre, gp.email].filter(Boolean).join(' · ') || '—';
  }
  const g = o.gestion;
  if (g?.usuarioNombre || g?.usuarioEmail) {
    return [g.usuarioNombre, g.usuarioEmail].filter(Boolean).join(' · ') || '—';
  }
  return '—';
}

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
  showPagination = true,
  onSaveObservacion,
  canEditObservacion = true,
  savingObservacionId = null,
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Error al cargar órdenes</p>
        <p className="mt-1">
          No pudimos cargar la información. Intente nuevamente o revise permisos e índices
          de Firestore.
        </p>
        <p className="mt-2 break-all font-mono text-xs text-red-900/90" title={error}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[560px] overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-3">SOT</th>
              <th className="px-3 py-3">Región</th>
              <th className="px-3 py-3">Departamento</th>
              <th className="px-3 py-3">Distrito</th>
              <th className="px-3 py-3">Contratista</th>
              <th className="px-3 py-3" title="Solo lectura (Excel)">
                Fecha prog. SGA
              </th>
              <th className="px-3 py-3" title="Solo lectura (calculado al importar)">
                Estado agenda
              </th>
              <th className="px-3 py-3" title="Solo lectura (Excel)">
                Dilación
              </th>
              <th className="px-3 py-3">Gestión</th>
              <th className="px-3 py-3">Gestionado por</th>
              <th className="px-3 py-3">Observación</th>
              <th className="px-3 py-3">Detalle</th>
              <th className="px-3 py-3 w-36" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !rows.length ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : null}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-slate-500">
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
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                    {formatDateOnly(o.fecha_programacion_sga)}
                  </td>
                  <td className="max-w-[11rem] px-3 py-2 align-top">
                    <AgendaStatusBadge status={o.status_agenda} />
                  </td>
                  <td className="max-w-[9rem] px-3 py-2 align-top">
                    <DilacionBadge dilacion={o.dilacion} />
                  </td>
                  <td className="px-3 py-2 text-slate-800">
                    <StatusBadge gestionTipo={tipo} />
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 text-xs text-slate-700">
                    {labelGestionadoPor(o)}
                  </td>
                  <td className="min-w-[14rem] px-3 py-2">
                    <ObservacionCell
                      value={o.observacion ?? ''}
                      disabled={!canEditObservacion}
                      saving={savingObservacionId === o.id}
                      onSave={(nextValue) => onSaveObservacion?.(o, nextValue)}
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {tipo === 'CONFIRMADO_FUTURO' || tipo === 'CONFIRMADO_HOY' ? (
                      <span>{formatDetalle(o.gestion?.fecha, o.gestion?.rangoHorario)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onGestionar(o)}
                      className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:-translate-y-0.5 hover:bg-brand-700"
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
      {showPagination && (
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
      )}
    </div>
  );
}

function formatDetalle(fecha, rangoHorario) {
  const dateText = formatDateOnly(fecha);
  if (dateText === '—') return '—';
  return rangoHorario ? `${dateText} · ${rangoHorario}` : dateText;
}

function ObservacionCell({ value, onSave, disabled, saving }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  if (disabled) {
    return <span className="text-xs text-slate-600">{value || '—'}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="max-w-[220px] truncate rounded-md bg-slate-50 px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
        title={value || 'Agregar observación'}
      >
        {value || 'Agregar observación'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, 120))}
        maxLength={120}
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
        placeholder="Observación (máx. 120)"
      />
      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          await onSave?.(draft);
          setEditing(false);
        }}
        className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-60"
      >
        {saving ? '...' : 'OK'}
      </button>
      <button
        type="button"
        onClick={() => {
          setDraft(value ?? '');
          setEditing(false);
        }}
        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
      >
        ✕
      </button>
    </div>
  );
}
