import { buildAgendaFieldsFromExcelRow } from '../utils/excelAgendaFields';

/**
 * Vista previa de filas Excel antes de confirmar la carga en Firestore.
 */
export function ExcelPreviewModal({
  open,
  rows,
  onConfirm,
  onCancel,
  busy,
}) {
  if (!open || !rows) return null;

  const previewLimit = 100;
  const slice = rows.slice(0, previewLimit);
  const more = rows.length - slice.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Vista previa de importación
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Total de filas válidas: <strong>{rows.length}</strong>
            {rows.length > previewLimit && (
              <span className="text-slate-500">
                {' '}
                (mostrando las primeras {previewLimit}
                {more > 0 ? `; ${more} más…` : ''})
              </span>
            )}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">SOT</th>
                <th className="px-3 py-2 font-semibold">Región</th>
                <th className="px-3 py-2 font-semibold">Departamento</th>
                <th className="px-3 py-2 font-semibold">Distrito</th>
                <th className="px-3 py-2 font-semibold">Contratista</th>
                <th className="px-3 py-2 font-semibold">Fecha prog. SGA</th>
                <th className="px-3 py-2 font-semibold">Estado agenda</th>
                <th className="px-3 py-2 font-semibold">Dilación</th>
                <th className="px-3 py-2 font-semibold">Gestión (Excel)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slice.map((r, i) => {
                const agenda = buildAgendaFieldsFromExcelRow(r);
                return (
                  <tr key={`${r.sot}-${i}`} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono">{r.sot}</td>
                    <td className="px-3 py-1.5">{r.region}</td>
                    <td className="px-3 py-1.5">{r.departamento}</td>
                    <td className="px-3 py-1.5">{r.distrito}</td>
                    <td className="px-3 py-1.5">{r.contratista}</td>
                    <td className="max-w-[7rem] truncate px-3 py-1.5 text-slate-600" title={String(r.fechaProgramacionSgaRaw ?? '')}>
                      {r.fechaProgramacionSgaRaw != null && r.fechaProgramacionSgaRaw !== ''
                        ? String(r.fechaProgramacionSgaRaw)
                        : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-slate-700">{agenda.status_agenda}</td>
                    <td className="max-w-[6rem] truncate px-3 py-1.5 text-slate-600" title={String(r.dilacionRaw ?? '')}>
                      {r.dilacionRaw != null && r.dilacionRaw !== ''
                        ? String(r.dilacionRaw)
                        : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">
                      {r.gestionRaw || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || rows.length === 0}
            onClick={onConfirm}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? 'Guardando…' : `Confirmar e importar (${rows.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
