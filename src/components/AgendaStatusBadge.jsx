import { STATUS_AGENDA } from '../utils/statusAgenda';

const toneByStatus = {
  [STATUS_AGENDA.VENCIDA]: 'bg-red-100 text-red-900 ring-red-200',
  [STATUS_AGENDA.HOY]: 'bg-amber-100 text-amber-900 ring-amber-200',
  [STATUS_AGENDA.FUTURO]: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  [STATUS_AGENDA.SIN_FECHA]: 'bg-slate-100 text-slate-700 ring-slate-200',
};

/**
 * Etiqueta solo lectura para columna estado agenda (colores en la celda).
 * @param {{ status?: string|null }} props
 */
export function AgendaStatusBadge({ status }) {
  const label = status?.trim() ? status : '—';
  const tone =
    toneByStatus[status ?? ''] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span
      className={`inline-flex max-w-full truncate rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${tone}`}
      title={label}
    >
      {label}
    </span>
  );
}
