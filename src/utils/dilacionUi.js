/**
 * Parseo numérico solo para UI / filtros / ordenamiento (no modifica datos guardados).
 * @param {unknown} value valor Firestore `dilacion` (string u otro)
 * @returns {number|null}
 */
export function parseDilacionNumber(value) {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const s = String(value).trim();
  if (!s) {
    return null;
  }
  const m = s.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) {
    return null;
  }
  const n = parseFloat(m[0].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** @typedef {'lte3' | 'between3_7' | 'gte7'} DilacionFilterKey */

/**
 * Banda visual y de filtro según reglas de negocio (alineado a colores de celda).
 * @param {unknown} value
 * @returns {'lte3' | 'between3_7' | 'gte7' | 'unknown'}
 */
export function dilacionBand(value) {
  const n = parseDilacionNumber(value);
  if (n == null) {
    return 'unknown';
  }
  if (n <= 3) {
    return 'lte3';
  }
  if (n > 3 && n < 7) {
    return 'between3_7';
  }
  if (n >= 7) {
    return 'gte7';
  }
  return 'unknown';
}

/**
 * @param {unknown} value
 * @param {DilacionFilterKey | ''} key
 * @returns {boolean}
 */
export function matchesDilacionFilter(value, key) {
  if (!key) {
    return true;
  }
  const n = parseDilacionNumber(value);
  if (key === 'lte3') {
    return n != null && n <= 3;
  }
  if (key === 'between3_7') {
    return n != null && n > 3 && n < 7;
  }
  if (key === 'gte7') {
    return n != null && n >= 7;
  }
  return true;
}
