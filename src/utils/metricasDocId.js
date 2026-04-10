/**
 * ID de documento en `metricas/{docId}` asociado a un contratista.
 * Debe coincidir con la lógica en `functions/index.js` (metricDocIdForContractor).
 * @param {string | null | undefined} contratista
 * @returns {string | null}
 */
export function metricasDocIdForContractor(contratista) {
  const c = String(contratista ?? '')
    .trim()
    .toLowerCase();
  if (!c) return null;
  return `contratista_${c.replace(/[^a-z0-9]+/g, '_')}`;
}
