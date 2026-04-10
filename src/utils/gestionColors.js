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
    const d = toSafeDate(ts);
    if (!d) return '—';
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
    const d = toSafeDate(ts);
    if (!d) return '—';
    return d.toLocaleDateString('es-PE');
  } catch {
    return '—';
  }
}

/**
 * Acepta Timestamp Firestore, Date, string/number ISO y objetos {seconds, nanoseconds}.
 * Devuelve null cuando no representa una fecha válida.
 * @param {any} value
 */
export function toSafeDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (
    typeof value === 'object' &&
    typeof value.seconds === 'number'
  ) {
    const ms =
      value.seconds * 1000 +
      Math.floor(Number(value.nanoseconds ?? 0) / 1000000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
