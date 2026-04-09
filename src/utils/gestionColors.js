/**
 * @param {string | null | undefined} tipo
 */
export function rowClassForGestion(tipo) {
  switch (tipo) {
    case 'CONFIRMADO_HOY':
    case 'CONFIRMADO_FUTURO':
      return 'bg-emerald-50 hover:bg-emerald-100/80';
    case 'RECHAZO':
      return 'bg-red-50 hover:bg-red-100/80';
    case 'NO_CONTESTA':
      return 'bg-amber-50 hover:bg-amber-100/80';
    case 'SIN_PLANTILLA_GEODIR':
      return 'bg-slate-100 hover:bg-slate-200/60';
    default:
      return 'bg-white hover:bg-slate-50';
  }
}

/**
 * @param {import('firebase/firestore').Timestamp | Date | null | undefined} ts
 */
export function formatTs(ts) {
  if (!ts) return '—';
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return d.toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

/**
 * @param {import('firebase/firestore').Timestamp | Date | null | undefined} ts
 */
export function formatDateOnly(ts) {
  if (!ts) return '—';
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-PE');
  } catch {
    return '—';
  }
}
