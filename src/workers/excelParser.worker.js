const COL_ALIASES = {
  REGION: ['region', 'región', 'REGION'],
  DEPARTAMENTO: ['departamento', 'DEPARTAMENTO'],
  DISTRITO: ['distrito', 'DISTRITO'],
  CONTRATISTA: ['contratista', 'CONTRATISTA'],
  SOT: ['sot', 'SOT', 'orden', 'OT'],
  GESTION: [
    'gestion',
    'gestión',
    'GESTION',
    'GESTIÓN',
    'estado',
    'ESTADO',
    'estado gestion',
  ],
};

function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findColumnIndex(headers, keys) {
  const map = new Map(headers.map((h, i) => [normalizeHeader(h), i]));
  for (const k of keys) {
    const idx = map.get(normalizeHeader(k));
    if (idx !== undefined) return idx;
  }
  return -1;
}

self.onmessage = async (event) => {
  try {
    const { arrayBuffer } = event.data || {};
    const XLSX = await import('xlsx');
    const wb = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      dense: true,
    });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      self.postMessage({ rows: [], errors: ['El archivo no tiene hojas.'] });
      return;
    }
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: true,
    });
    if (!matrix.length) {
      self.postMessage({ rows: [], errors: ['La hoja está vacía.'] });
      return;
    }

    const headerRow = matrix[0].map((c) => String(c ?? '').trim());
    const idxRegion = findColumnIndex(headerRow, COL_ALIASES.REGION);
    const idxDep = findColumnIndex(headerRow, COL_ALIASES.DEPARTAMENTO);
    const idxDis = findColumnIndex(headerRow, COL_ALIASES.DISTRITO);
    const idxCon = findColumnIndex(headerRow, COL_ALIASES.CONTRATISTA);
    const idxSot = findColumnIndex(headerRow, COL_ALIASES.SOT);
    const idxGestion = findColumnIndex(headerRow, COL_ALIASES.GESTION);

    const errors = [];
    if (idxSot < 0) errors.push('No se encontró la columna SOT.');
    if (idxRegion < 0) errors.push('No se encontró la columna REGION.');
    if (idxDep < 0) errors.push('No se encontró la columna DEPARTAMENTO.');
    if (idxDis < 0) errors.push('No se encontró la columna DISTRITO.');
    if (idxCon < 0) errors.push('No se encontró la columna CONTRATISTA.');
    if (errors.length) {
      self.postMessage({ rows: [], errors });
      return;
    }

    const rows = [];
    const seen = new Set();
    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row) continue;
      const sot = String(row[idxSot] ?? '').trim();
      if (!sot) continue;

      const region = String(row[idxRegion] ?? '').trim();
      const departamento = String(row[idxDep] ?? '').trim();
      const distrito = String(row[idxDis] ?? '').trim();
      const contratista = String(row[idxCon] ?? '').trim();
      const gestionRaw = idxGestion >= 0 ? String(row[idxGestion] ?? '').trim() : '';

      const key = `${sot}|${contratista}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        region,
        departamento,
        distrito,
        contratista,
        sot,
        gestionRaw,
      });
    }

    self.postMessage({ rows, errors: [] });
  } catch (error) {
    self.postMessage({
      rows: [],
      errors: [error?.message ?? 'No se pudo procesar el archivo.'],
    });
  }
};
