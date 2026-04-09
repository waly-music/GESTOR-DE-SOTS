import { TIPOS_GESTION } from '../constants/gestion';

const VALUES = new Set(TIPOS_GESTION.map((t) => t.value));

/**
 * Convierte texto del Excel (etiqueta o código) al valor interno de tipo de gestión.
 * @param {unknown} raw
 * @returns {string | null}
 */
export function mapExcelGestionToTipo(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  const compact = s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  if (VALUES.has(compact)) return compact;

  for (const t of TIPOS_GESTION) {
    const lab = t.label
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const plain = s
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (plain === lab || compact === lab.replace(/\s+/g, '_')) {
      return t.value;
    }
  }

  if (compact.includes('RECHAZ')) return 'RECHAZO';
  if (compact.includes('CONFIRMADO') && compact.includes('FUTUR')) {
    return 'CONFIRMADO_FUTURO';
  }
  if (compact.includes('CONFIRMADO') && compact.includes('HOY')) {
    return 'CONFIRMADO_HOY';
  }
  if (compact.includes('NO_CONTEST') || compact.includes('NO CONTEST')) {
    return 'NO_CONTESTA';
  }
  if (compact.includes('GEODIR') || compact.includes('PLANTILLA')) {
    return 'SIN_PLANTILLA_GEODIR';
  }

  return null;
}
