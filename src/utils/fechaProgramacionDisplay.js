import {
  formatPeExcelFromTs,
  parseFechaProgramacionSgaToTimestamp,
} from './excelAgendaFields';

/**
 * Desde valor guardado o Timestamp (formato tipo Excel PE: 6/04/2026).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function formatFechaProgSgaFromTimestamp(value) {
  if (value == null) {
    return '—';
  }
  const ts = parseFechaProgramacionSgaToTimestamp(value);
  return formatPeExcelFromTs(ts) ?? '—';
}

/**
 * Celda Excel cruda (Date, serial, texto) → formato unificado tipo Excel PE.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function formatFechaProgSgaFromExcelRaw(raw) {
  if (raw == null || raw === '') {
    return '—';
  }
  const ts = parseFechaProgramacionSgaToTimestamp(raw);
  if (ts) {
    return formatPeExcelFromTs(ts) ?? '—';
  }
  const s = String(raw).trim();
  return s || '—';
}

/**
 * Fila Firestore: texto fijado en importación o derivado del Timestamp.
 *
 * @param {{ fecha_programacion_sga?: unknown, fecha_programacion_sga_text?: string|null }} row
 * @returns {string}
 */
export function formatFechaProgSgaForRow(row) {
  const text = row?.fecha_programacion_sga_text;
  if (typeof text === 'string' && text.trim()) {
    return text.trim();
  }
  return formatFechaProgSgaFromTimestamp(row?.fecha_programacion_sga);
}
