import { TIPOS_GESTION } from '../constants/gestion';

const toneByGestion = {
  CONFIRMADO_HOY: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  CONFIRMADO_FUTURO: 'bg-green-100 text-green-800 ring-green-200',
  RECHAZO: 'bg-red-100 text-red-800 ring-red-200',
  NO_CONTESTA: 'bg-amber-100 text-amber-800 ring-amber-200',
  SIN_PLANTILLA_GEODIR: 'bg-slate-100 text-slate-700 ring-slate-200',
};

function labelTipo(v) {
  return TIPOS_GESTION.find((t) => t.value === v)?.label ?? 'Sin gestión';
}

export function StatusBadge({ gestionTipo }) {
  const tone = toneByGestion[gestionTipo] ?? 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${tone}`}
      title={gestionTipo ?? 'SIN_GESTION'}
    >
      {labelTipo(gestionTipo)}
    </span>
  );
}
