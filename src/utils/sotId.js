/**
 * ID de documento Firestore seguro derivado del número SOT.
 * @param {string} sot
 */
export function sotToDocId(sot) {
  if (sot == null || String(sot).trim() === '') {
    throw new Error('SOT vacío');
  }
  const raw = String(sot).trim();
  return raw
    .replace(/\//g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 700);
}

export function normalizeSotDisplay(sot) {
  return String(sot ?? '').trim();
}
