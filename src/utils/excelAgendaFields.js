import { Timestamp } from 'firebase/firestore';
import { fechaToYmdPeru, formatYmdInPeru, getStatusAgenda } from './statusAgenda';

/**
 * Texto como en Excel Perú (d/MMyyyy → ej. 6/04/2026), día calendario Lima.
 * @param {import('firebase/firestore').Timestamp | null | undefined} ts
 * @returns {string|null}
 */
export function formatPeExcelFromTs(ts) {
  if (!ts) {
    return null;
  }
  const ymd = fechaToYmdPeru(ts);
  if (!ymd) {
    return null;
  }
  const [y, m, d] = ymd.split('-');
  return `${Number(d)}/${m}/${y}`;
}

/**
 * Convierte celda Excel a Timestamp (medianoche hora Lima del día calendario).
 * @param {unknown} raw
 * @returns {import('firebase/firestore').Timestamp | null}
 */
export function parseFechaProgramacionSgaToTimestamp(raw) {
  if (raw == null || raw === '') {
    return null;
  }

  if (
    typeof raw === 'object' &&
    raw !== null &&
    typeof raw.toDate === 'function'
  ) {
    try {
      return timestampMidnightLimaFromDate(raw.toDate());
    } catch {
      return null;
    }
  }

  if (raw instanceof Date) {
    return timestampMidnightLimaFromDate(raw);
  }

  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    const utc = (raw - 25569) * 86400 * 1000;
    const d = new Date(utc);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return timestampMidnightLimaFromDate(d);
  }

  const s = String(raw).trim();
  if (!s) {
    return null;
  }

  const dmY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmY) {
    const day = Number(dmY[1]);
    const month = Number(dmY[2]);
    const year = Number(dmY[3]);
    const d = new Date(year, month - 1, day);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return timestampMidnightLimaFromDate(d);
  }

  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return timestampMidnightLimaFromDate(d);
  }

  const t = Date.parse(s);
  if (Number.isNaN(t)) {
    return null;
  }
  return timestampMidnightLimaFromDate(new Date(t));
}

/**
 * Medianoche en Lima como instante UTC (Perú sin horario de verano: UTC−5).
 * @param {Date} date
 * @returns {import('firebase/firestore').Timestamp | null}
 */
function timestampMidnightLimaFromDate(date) {
  const ymd = formatYmdInPeru(date);
  if (!ymd) {
    return null;
  }
  const [y, m, d] = ymd.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d, 5, 0, 0, 0);
  return Timestamp.fromMillis(ms);
}

/**
 * Dilación: tal cual viene del Excel (solo normalización a string; sin cálculos).
 * @param {unknown} raw
 * @returns {string | null}
 */
export function parseDilacionRaw(raw) {
  if (raw == null) {
    return null;
  }
  const s = String(raw);
  const t = s.trim();
  return t === '' ? null : t;
}

/**
 * Payload para Firestore desde fila Excel parseada.
 * @param {{ fechaProgramacionSgaRaw?: unknown, dilacionRaw?: unknown }} row
 * @returns {{
 *   fecha_programacion_sga: import('firebase/firestore').Timestamp | null,
 *   fecha_programacion_sga_text: string | null,
 *   status_agenda: string,
 *   dilacion: string | null,
 * }}
 */
export function buildAgendaFieldsFromExcelRow(row) {
  const ts = parseFechaProgramacionSgaToTimestamp(row?.fechaProgramacionSgaRaw);
  const status_agenda = ts
    ? getStatusAgenda(ts)
    : getStatusAgenda(null);
  return {
    fecha_programacion_sga: ts,
    fecha_programacion_sga_text: formatPeExcelFromTs(ts),
    status_agenda,
    dilacion: parseDilacionRaw(row?.dilacionRaw),
  };
}
