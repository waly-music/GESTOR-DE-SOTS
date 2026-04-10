import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  countAllSotsForAdmin,
  deleteAllSotsForAdmin,
} from '../services/ordenesService';
import { canDeleteAllSotsDatabase } from '../utils/roles';
import { Spinner } from './Spinner';

const CONFIRM_PHRASE = 'BORRAR TODO';

/**
 * Zona peligrosa: elimina todos los documentos de la colección `sots`.
 * Solo rol administrador (UI + servicio).
 *
 * @param {{ onDone?: () => void }} props
 */
export function AdminDeleteAllSots({ onDone }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [msg, setMsg] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [totalInDb, setTotalInDb] = useState(0);
  const [confirmText, setConfirmText] = useState('');

  if (!canDeleteAllSotsDatabase(profile)) {
    return null;
  }

  async function openModal() {
    setMsg(null);
    setConfirmText('');
    setBusy(true);
    try {
      const n = await countAllSotsForAdmin(profile);
      setTotalInDb(n);
      if (n === 0) {
        setMsg({
          type: 'info',
          text: 'No hay registros SOT en la base de datos.',
        });
        return;
      }
      setModalOpen(true);
    } catch (e) {
      setMsg({
        type: 'err',
        text: e?.message ?? String(e),
      });
    } finally {
      setBusy(false);
    }
  }

  async function runDelete() {
    if (confirmText.trim() !== CONFIRM_PHRASE) {
      return;
    }
    setModalOpen(false);
    setBusy(true);
    setProgress(0);
    setMsg(null);
    try {
      const { deleted } = await deleteAllSotsForAdmin(profile, (n) =>
        setProgress(n),
      );
      setMsg({
        type: 'ok',
        text: `Se eliminaron ${deleted} registro(s) de la colección SOT. Las métricas se actualizarán en breve.`,
      });
      setConfirmText('');
      onDone?.();
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

  return (
    <section className="border-t border-red-100 bg-red-50/40 pt-8">
      <h2 className="text-lg font-semibold text-slate-900">Zona administrador</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Elimina <strong>todos</strong> los documentos de la colección de órdenes SOT en
        Firestore. No afecta usuarios ni configuración. Esta acción no se puede deshacer.
      </p>

      <div className="mt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void openModal()}
          className="inline-flex items-center justify-center rounded-lg border-2 border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 shadow-sm hover:bg-red-50 disabled:opacity-50"
        >
          {busy && !modalOpen ? (
            <Spinner className="mr-2 h-4 w-4 border-red-700 border-r-transparent" />
          ) : null}
          Borrar todos los registros SOT
        </button>
      </div>

      {busy && progress != null && (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <Spinner className="h-4 w-4" />
          Eliminando… {progress} documento(s) procesados.
        </p>
      )}

      {msg && (
        <p
          className={`mt-3 text-sm ${
            msg.type === 'ok'
              ? 'text-emerald-800'
              : msg.type === 'info'
                ? 'text-slate-700'
                : 'text-red-800'
          }`}
          role="status"
        >
          {msg.text}
        </p>
      )}

      {modalOpen && totalInDb > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-delete-all-title"
        >
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
            <h3 id="admin-delete-all-title" className="text-lg font-semibold text-red-950">
              Confirmar borrado total
            </h3>
            <p className="mt-3 text-sm text-slate-700">
              Se eliminarán de forma <strong>permanente</strong>{' '}
              <strong>{totalInDb}</strong> documento(s) en la colección SOT.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Escriba exactamente <code className="rounded bg-slate-100 px-1">{CONFIRM_PHRASE}</code>{' '}
              para habilitar el botón.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              autoComplete="off"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setModalOpen(false);
                  setConfirmText('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmText.trim() !== CONFIRM_PHRASE || busy}
                onClick={() => void runDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                Eliminar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
