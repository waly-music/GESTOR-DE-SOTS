import { dilacionBand } from '../utils/dilacionUi';

const toneByBand = {
  lte3: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  between3_7: 'bg-amber-50 text-amber-900 ring-amber-200',
  gte7: 'bg-red-50 text-red-900 ring-red-200',
  unknown: 'bg-slate-50 text-slate-600 ring-slate-200',
};

/**
 * Muestra dilación tal cual viene del dato; solo aplica color en el recuadro.
 * @param {{ dilacion?: string|null }} props
 */
export function DilacionBadge({ dilacion }) {
  const raw = dilacion != null && dilacion !== '' ? String(dilacion) : null;
  const band = dilacionBand(dilacion);
  const tone = toneByBand[band] ?? toneByBand.unknown;
  const display = raw ?? '—';

  return (
    <span
      className={`inline-flex max-w-full truncate rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${tone}`}
      title={display}
    >
      {display}
    </span>
  );
}
