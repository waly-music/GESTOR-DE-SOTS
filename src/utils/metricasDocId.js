import { CONTRATISTA_TODOS } from '../constants/gestion';

/**
 * ID de documento en `metricas/{docId}` asociado a un contratista.
 * Debe coincidir con la lógica en `functions/index.js` (metricDocIdForContractor).
 * @param {string | null | undefined} contratista
 * @returns {string | null}
 */
export function metricasDocIdForContractor(contratista) {
  const raw = String(contratista ?? '').trim();
  if (raw === CONTRATISTA_TODOS) {
    return 'global';
  }
  const c = raw.toLowerCase();
  if (!c) return null;
  return `contratista_${c.replace(/[^a-z0-9]+/g, '_')}`;
}
