import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TIPOS_GESTION, RANGOS_HORARIO } from '../constants/gestion';
import { saveGestion } from '../services/ordenesService';
import { formatDateOnly, formatTs } from '../utils/gestionColors';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   orden: Record<string, any> | null,
 *   onSaved: () => void,
 * }} props
 */
export function GestionModal({ open, onClose, orden, onSaved }) {
  const { user, profile } = useAuth();
  const [tipo, setTipo] = useState('');
  const [fecha, setFecha] = useState('');
  const [rango, setRango] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const canEditOthers = profile?.role !== 'asesor';

  useEffect(() => {
    if (!orden) return;
    const g = orden.gestion;
    setTipo(g?.tipoGestion ?? '');
    if (g?.fecha?.toDate) {
      const d = g.fecha.toDate();
      setFecha(d.toISOString().slice(0, 10));
    } else {
      setFecha('');
    }
    setRango(g?.rangoHorario ?? '');
    setErr(null);
  }, [orden, open]);

  const needsFecha = tipo === 'CONFIRMADO_FUTURO';
  const needsRango =
    tipo === 'CONFIRMADO_FUTURO' || tipo === 'CONFIRMADO_HOY';

  const bloqueadoAsesor = useMemo(() => {
    if (!orden || profile?.role !== 'asesor') return false;
    const g = orden.gestion;
    return Boolean(
      g?.tipoGestion && g?.usuarioId && g.usuarioId !== user?.uid,
    );
  }, [orden, profile?.role, user?.uid]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orden || !user) return;
    setErr(null);

    if (needsFecha && !fecha) {
      setErr('Seleccione una fecha.');
      return;
    }
    if (needsRango && !rango) {
      setErr('Seleccione un rango horario.');
      return;
    }

    let fechaEnv = null;
    if (tipo === 'CONFIRMADO_HOY') {
      fechaEnv = new Date();
      fechaEnv.setHours(12, 0, 0, 0);
    } else if (tipo === 'CONFIRMADO_FUTURO' && fecha) {
      fechaEnv = new Date(`${fecha}T12:00:00`);
    }

    setSaving(true);
    try {
      await saveGestion(
        orden.id,
        {
          tipoGestion: tipo,
          fecha: fechaEnv,
          rangoHorario: needsRango ? rango : null,
        },
        {
          uid: user.uid,
          email: user.email,
          displayName: profile?.displayName ?? user.displayName ?? '',
        },
        { role: profile.role },
        canEditOthers,
      );
      onSaved?.();
      onClose();
    } catch (er) {
      setErr(er.message ?? String(er));
    } finally {
      setSaving(false);
    }
  }

  if (!open || !orden) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Gestionar orden
            </h2>
            <p className="text-sm text-slate-600">
              SOT <span className="font-mono font-medium">{orden.sot}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {bloqueadoAsesor && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Esta gestión fue registrada por otro usuario. No puede editarla.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tipo de gestión
            </label>
            <select
              required
              value={tipo}
              disabled={bloqueadoAsesor}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccione…</option>
              {TIPOS_GESTION.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {needsFecha && (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Fecha cita
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={bloqueadoAsesor}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          {needsRango && (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Rango horario
              </label>
              <select
                required={needsRango}
                value={rango}
                disabled={bloqueadoAsesor}
                onChange={(e) => setRango(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Seleccione…</option>
                {RANGOS_HORARIO.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || bloqueadoAsesor}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>

        <HistorialPanel historial={orden.historial} />
      </div>
    </div>
  );
}

function HistorialPanel({ historial }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(historial) ? [...historial].reverse() : [];
  if (!list.length) return null;

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        {open ? 'Ocultar historial' : 'Ver historial de cambios'}
      </button>
      {open && (
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-slate-600">
          {list.map((h, i) => (
            <li
              key={i}
              className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1"
            >
              <span className="font-medium text-slate-800">{h.action}</span>{' '}
              · {h.usuarioEmail ?? '—'} ·{' '}
              {formatTs(h.timestamp)}
              {h.nuevo?.tipoGestion && (
                <span className="ml-1">
                  → {h.nuevo.tipoGestion}{' '}
                  {h.nuevo.fecha
                    ? `(fecha ${formatDateOnly(h.nuevo.fecha)})`
                    : ''}
                  {h.nuevo.rangoHorario ? ` ${h.nuevo.rangoHorario}` : ''}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
