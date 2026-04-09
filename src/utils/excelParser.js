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
  const map = new Map(
    headers.map((h, i) => [normalizeHeader(h), i]),
  );
  for (const k of keys) {
    const idx = map.get(normalizeHeader(k));
    if (idx !== undefined) return idx;
  }
  return -1;
}

/**
 * Parsea la primera hoja. Optimizado: lee matriz en una pasada.
 * Carga SheetJS de forma diferida para no inflar el bundle principal.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{ rows: Array<{region:string,departamento:string,distrito:string,contratista:string,sot:string,gestionRaw:string}>, errors: string[] }>}
 */
export async function parseExcelOrdenes(arrayBuffer) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    dense: true,
  });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    return { rows: [], errors: ['El archivo no tiene hojas.'] };
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (!matrix.length) {
    return { rows: [], errors: ['La hoja está vacía.'] };
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
    return { rows: [], errors };
  }

  /** @type {Array<{region:string,departamento:string,distrito:string,contratista:string,sot:string,gestionRaw:string}>} */
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
    const gestionRaw =
      idxGestion >= 0 ? String(row[idxGestion] ?? '').trim() : '';

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

  return { rows, errors: [] };
}

/**
 * @param {Array<Record<string, unknown>>} data
 * @param {string} filename
 */
export async function exportRowsToExcel(data, filename = 'export.xlsx') {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SOT');
  XLSX.writeFile(wb, filename);
}
