/**
 * Estado de agenda según fecha de programación (zona horaria Perú, solo día calendario).
 */

export const STATUS_AGENDA = {
  VENCIDA: 'Agenda vencida',
  HOY: 'Programado hoy',
  FUTURO: 'Programado futuro',
  SIN_FECHA: 'Sin fecha',
};

const TZ_LIMA = 'America/Lima';

/**
 * Fecha de hoy en Lima como YYYY-MM-DD (solo comparación de calendario).
 * @param {Date} [now]
 * @returns {string}
 */
export function getTodayYmdPeru(now = new Date()) {
  return formatYmdInPeru(now);
}

/**
 * @param {Date} date
 * @returns {string|null}
 */
export function formatYmdInPeru(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  try {
    const s = date.toLocaleDateString('en-CA', { timeZone: TZ_LIMA });
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  } catch {
    return null;
  }
}

/**
 * Convierte entrada a YYYY-MM-DD en Lima, o null si no hay fecha válida.
 * @param {import('firebase/firestore').Timestamp | Date | string | number | null | undefined} fecha
 * @returns {string|null}
 */
export function fechaToYmdPeru(fecha) {
  if (fecha == null || fecha === '') {
    return null;
  }
  if (
    typeof fecha === 'object' &&
    fecha !== null &&
    typeof fecha.toDate === 'function'
  ) {
    try {
      return formatYmdInPeru(fecha.toDate());
    } catch {
      return null;
    }
  }
  if (fecha instanceof Date) {
    return formatYmdInPeru(fecha);
  }
  if (typeof fecha === 'number') {
    const d = excelSerialToDate(fecha);
    return d ? formatYmdInPeru(d) : null;
  }
  const s = String(fecha).trim();
  if (!s) {
    return null;
  }
  const d = parseFlexibleDateString(s);
  return d ? formatYmdInPeru(d) : null;
}

/**
 * Excel serial (días desde 1899-12-30) → Date en UTC.
 * @param {number} serial
 * @returns {Date|null}
 */
function excelSerialToDate(serial) {
  if (typeof serial !== 'number' || Number.isNaN(serial)) {
    return null;
  }
  const utc = (serial - 25569) * 86400 * 1000;
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {string} s
 * @returns {Date|null}
 */
function parseFlexibleDateString(s) {
  const dmY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmY) {
    const day = Number(dmY[1]);
    const month = Number(dmY[2]);
    const year = Number(dmY[3]);
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) {
    return null;
  }
  return new Date(t);
}

/**
 * Calcula el estado de agenda comparando la fecha (en calendario Lima) con hoy (Lima).
 * Fecha vacía o inválida → {@link STATUS_AGENDA.SIN_FECHA}.
 *
 * @param {import('firebase/firestore').Timestamp | Date | string | number | null | undefined} fecha
 * @returns {string}
 */
export function getStatusAgenda(fecha) {
  const ymd = fechaToYmdPeru(fecha);
  if (!ymd) {
    return STATUS_AGENDA.SIN_FECHA;
  }
  const hoy = getTodayYmdPeru();
  if (ymd < hoy) {
    return STATUS_AGENDA.VENCIDA;
  }
  if (ymd === hoy) {
    return STATUS_AGENDA.HOY;
  }
  return STATUS_AGENDA.FUTURO;
}
