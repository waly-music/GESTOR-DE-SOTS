import { useState } from 'react';
import { TIPOS_GESTION } from '../constants/gestion';
import { useAuth } from '../context/AuthContext';
import {
  clearGestionByTipo,
  countSotsByGestionTipo,
  deleteSotsByGestionTipo,
} from '../services/ordenesService';
import { canBulkManageSots } from '../utils/roles';
import { Spinner } from './Spinner';

/**
 * Acciones masivas por tipo de gestión (solo admin/supervisor).
 * Las métricas se recalculan vía Cloud Function `syncSotMetrics` en cada escritura.
 */
export function SotBulkManagement() {
  const { profile } = useAuth();
  const [tipo, setTipo] = useState(TIPOS_GESTION[0]?.value ?? '');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [msg, setMsg] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState('delete');
  const [pendingCount, setPendingCount] = useState(0);

  if (!canBulkManageSots(profile)) {
    return null;
  }

  async function prepareConfirm(mode) {
    setMsg(null);
    setProgress(null);
    if (!tipo) {
      setMsg({ type: 'err', text: 'Seleccione un tipo de gestión.' });
      return;
    }
    setBusy(true);
    try {
      const n = await countSotsByGestionTipo(profile, tipo);
      if (n === 0) {
        setMsg({
          type: 'info',
          text: 'No hay registros con ese tipo de gestión para su alcance.',
        });
        return;
      }
      setPendingCount(n);
      setConfirmMode(mode);
      setConfirmOpen(true);
    } catch (e) {
      setMsg({
        type: 'err',
        text: e?.message ?? String(e),
      });
    } finally {
      setBusy(false);
    }
  }

  async function runConfirmed() {
    setConfirmOpen(false);
    setBusy(true);
    setProgress(0);
    setMsg(null);
    try {
      if (confirmMode === 'delete') {
        const { deleted } = await deleteSotsByGestionTipo(profile, tipo, (n) =>
          setProgress(n),
        );
        setMsg({
          type: 'ok',
          text: `Se eliminaron ${deleted} registro(s). Las métricas se actualizarán en unos segundos.`,
        });
      } else {
        const { updated } = await clearGestionByTipo(profile, tipo, (n) =>
          setProgress(n),
        );
        setMsg({
          type: 'ok',
          text: `Se reinició la gestión en ${updated} registro(s).`,
        });
      }
    } catch (e) {
      setMsg({
        type: 'err',
        text: e?.message ?? String(e),
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const labelTipo =
    TIPOS_GESTION.find((t) => t.value === tipo)?.label ?? tipo;

  return (
    <section className="border-t border-slate-200 pt-8">
      <h2 className="text-lg font-semibold text-slate-900">
        Mantenimiento por tipo de gestión
      </h2>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[220px] flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Tipo de gestión</span>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={tipo}
            disabled={busy}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS_GESTION.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => prepareConfirm('delete')}
            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
          >
            🗑️ Eliminar registros por tipo
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => prepareConfirm('clear')}
            className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            🧹 Limpiar gestión por tipo
          </button>
        </div>
      </div>

      {busy && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Spinner />
          {progress != null ? `Procesando… ${progress} registro(s).` : 'Trabajando…'}
        </div>
      )}

      {msg && (
        <p
          className={`mt-3 text-sm ${
            msg.type === 'ok'
              ? 'text-emerald-700'
              : msg.type === 'info'
                ? 'text-slate-600'
                : 'text-red-700'
          }`}
          role="status"
        >
          {msg.text}
        </p>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-confirm-title"
        >
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 id="bulk-confirm-title" className="text-lg font-semibold text-slate-900">
              {confirmMode === 'delete'
                ? 'Confirmar eliminación'
                : 'Confirmar reinicio de gestión'}
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              {confirmMode === 'delete' ? (
                <>
                  Se <strong>eliminarán permanentemente</strong>{' '}
                  <strong>{pendingCount}</strong> registro(s) con gestión{' '}
                  <strong>{labelTipo}</strong>. Esta acción no se puede deshacer.
                </>
              ) : (
                <>
                  Se <strong>reiniciará la gestión</strong> en{' '}
                  <strong>{pendingCount}</strong> registro(s) ({labelTipo}). Los
                  documentos no se borran; quedarán como pendientes sin gestión.
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  confirmMode === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
                onClick={() => void runConfirmed()}
              >
                {confirmMode === 'delete' ? 'Eliminar' : 'Reiniciar gestión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
