import {
  Timestamp,
  collection,
  deleteField,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  updateDoc,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { mergeFiltrosFromExcelRows } from './filtrosService';
import { metricasDocIdForContractor } from '../utils/metricasDocId';
import { chunkArray } from '../utils/chunk';
import { mapExcelGestionToTipo } from '../utils/excelGestionMap';
import { normalizeSotDisplay, sotToDocId } from '../utils/sotId';
import { CONTRATISTA_TODOS } from '../constants/gestion';
import { buildAgendaFieldsFromExcelRow } from '../utils/excelAgendaFields';
import { profileRol } from '../utils/roles';

/** Colección principal de órdenes SOT en Firestore. */
const COL = 'sots';

/**
 * Campos de gestión derivados de la columna Gestión del Excel.
 * @param {string} [gestionRaw]
 */
function excelImportGestionFields(gestionRaw) {
  const raw = String(gestionRaw ?? '').trim();
  const tipo = mapExcelGestionToTipo(raw);
  if (tipo) {
    return {
      gestion: {
        tipoGestion: tipo,
        fecha: null,
        rangoHorario: null,
        usuarioId: 'import-excel',
        usuarioEmail: 'excel@import.local',
        usuarioNombre: 'Importación Excel',
        timestamp: serverTimestamp(),
      },
      tieneGestion: true,
      gestionTipo: tipo,
      gestionExcelRaw: null,
    };
  }
  return {
    gestion: null,
    tieneGestion: false,
    gestionTipo: null,
    gestionExcelRaw: raw || null,
  };
}

/**
 * Lectura por lotes de documentos por ID (máx. 30 por consulta `in`).
 * @param {string[]} docIds
 * @param {(done: number, total: number) => void} [onProgress]
 */
export async function fetchOrdenDocsByIds(docIds, onProgress) {
  const unique = [...new Set(docIds)].filter(Boolean);
  // Firestore permite hasta 30 valores en `in`; usar 10 hace esta fase muy lenta.
  const chunks = chunkArray(unique, 30);
  /** @type {Map<string, import('firebase/firestore').DocumentSnapshot>} */
  const map = new Map();
  let done = 0;
  for (const part of chunks) {
    const q = query(
      collection(db, COL),
      where(documentId(), 'in', part),
    );
    const snap = await getDocs(q);
    snap.forEach((d) => map.set(d.id, d));
    done += part.length;
    onProgress?.(Math.min(done, unique.length), unique.length);
  }
  return map;
}

/**
 * Importa filas Excel con lógica: insertar nuevas, actualizar sin gestión, no tocar con gestión.
 * @param {Array<{region:string,departamento:string,distrito:string,contratista:string,sot:string,gestionRaw?:string,fechaProgramacionSgaRaw?:unknown,dilacionRaw?:unknown}>} rows
 * @param {(info: { phase: string, done: number, total: number }) => void} [onProgress]
 */
export async function importExcelRows(rows, onProgress) {
  const requiredRows = rows.filter((row) => {
    const sot = String(row?.sot ?? '').trim();
    const region = String(row?.region ?? '').trim();
    const departamento = String(row?.departamento ?? '').trim();
    const distrito = String(row?.distrito ?? '').trim();
    const contratista = String(row?.contratista ?? '').trim();
    return Boolean(sot && region && departamento && distrito && contratista);
  });
  const skippedInvalid = Math.max(0, rows.length - requiredRows.length);
  const total = requiredRows.length;
  let done = 0;
  const report = (phase) => {
    onProgress?.({ phase, done, total });
  };

  const docIds = [];
  const rowById = new Map();
  for (const row of requiredRows) {
    const id = sotToDocId(row.sot);
    docIds.push(id);
    rowById.set(id, row);
  }

  const existing = await fetchOrdenDocsByIds(docIds, (readDone, readTotal) => {
    done = readDone;
    onProgress?.({ phase: 'read', done, total: readTotal });
  });
  done = total;
  report('read');

  const toCreate = [];
  const toUpdate = [];
  const skippedWithGestion = [];

  for (const id of new Set(docIds)) {
    const row = rowById.get(id);
    if (!row) continue;
    const snap = existing.get(id);
    if (!snap || !snap.exists()) {
      toCreate.push({ id, row });
      continue;
    }
    const data = snap.data();
    const hasGestion = Boolean(
      data?.tieneGestion || data?.gestion?.tipoGestion,
    );
    if (!hasGestion) {
      toUpdate.push({ id, row, prev: data });
    } else {
      skippedWithGestion.push(id);
    }
  }

  const BATCH_MAX = 400;

  const createOps = [];
  const updateOps = [];

  for (const { id, row } of toCreate) {
    const ref = doc(db, COL, id);
    const g = excelImportGestionFields(row.gestionRaw);
    const agenda = buildAgendaFieldsFromExcelRow(row);
    createOps.push({
      ref,
      data: {
        sot: normalizeSotDisplay(row.sot),
        region: row.region,
        departamento: row.departamento,
        distrito: row.distrito,
        contratista: row.contratista,
        ...g,
        ...agenda,
        historial: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastExcelImportAt: serverTimestamp(),
      },
    });
  }

  for (const { id, row } of toUpdate) {
    const ref = doc(db, COL, id);
    const g = excelImportGestionFields(row.gestionRaw);
    const agenda = buildAgendaFieldsFromExcelRow(row);
    updateOps.push({
      ref,
      data: {
        sot: normalizeSotDisplay(row.sot),
        region: row.region,
        departamento: row.departamento,
        distrito: row.distrito,
        contratista: row.contratista,
        ...g,
        ...agenda,
        updatedAt: serverTimestamp(),
        lastExcelImportAt: serverTimestamp(),
      },
    });
  }

  const writeTotal = createOps.length + updateOps.length;
  done = 0;

  const createChunks = chunkArray(createOps, BATCH_MAX);
  for (const part of createChunks) {
    const batch = writeBatch(db);
    for (const op of part) {
      batch.set(op.ref, op.data, { merge: false });
    }
    await batch.commit();
    done += part.length;
    onProgress?.({ phase: 'write', done, total: writeTotal });
  }

  const updateChunks = chunkArray(updateOps, BATCH_MAX);
  for (const part of updateChunks) {
    const batch = writeBatch(db);
    for (const op of part) {
      batch.update(op.ref, op.data);
    }
    await batch.commit();
    done += part.length;
    onProgress?.({ phase: 'write', done, total: writeTotal });
  }

  await mergeFiltrosFromExcelRows(requiredRows);

  const written = toCreate.length + toUpdate.length;
  return {
    created: toCreate.length,
    updated: toUpdate.length,
    skippedWithGestion: skippedWithGestion.length,
    skippedInvalid,
    totalCargados: written,
  };
}

/**
 * @param {{ rol?: string, contratista?: string|null } | null | undefined} profile
 * @param {{
 *   region?: string,
 *   departamento?: string,
 *   distrito?: string,
 *   contratista?: string,
 *   searchSot?: string,
 * }} filters
 * @param {{ skipAsesorGestionFilter?: boolean }} [options]
 */
export function buildOrdenesQuery(
  profile,
  filters,
  pageSize = 25,
  cursor = null,
  options = {},
) {
  const constraints = [];
  const rol = profileRol(profile);
  const contractor = String(profile?.contratista ?? '').trim();
  const selectedContractor = String(filters.contratista ?? '').trim();

  // Asesor/supervisor: por defecto `where(contratista)` = perfil. Valor especial
  // __TODOS__ (solo admin en users): sin filtro por contratista, como admin.
  if (rol === 'asesor' || rol === 'supervisor') {
    if (contractor === CONTRATISTA_TODOS) {
      // sin where contratista
    } else if (contractor) {
      constraints.push(where('contratista', '==', contractor));
    } else {
      constraints.push(where('contratista', '==', '__UNASSIGNED__'));
    }
  }
  // Asesor: solo tickets pendientes/sin gestión.
  if (rol === 'asesor' && !options.skipAsesorGestionFilter) {
    constraints.push(where('tieneGestion', '==', false));
  }

  if (filters.region) {
    constraints.push(where('region', '==', filters.region));
  }
  if (filters.departamento) {
    constraints.push(where('departamento', '==', filters.departamento));
  }
  if (filters.distrito) {
    constraints.push(where('distrito', '==', filters.distrito));
  }
  if (selectedContractor && !(rol === 'asesor' || rol === 'supervisor')) {
    constraints.push(where('contratista', '==', selectedContractor));
  }

  const sotSearch = filters.searchSot?.trim();
  if (sotSearch) {
    const end = `${sotSearch}\uf8ff`;
    constraints.push(where('sot', '>=', sotSearch));
    constraints.push(where('sot', '<=', end));
    constraints.push(orderBy('sot'));
  } else {
    // Siempre orden estable por SOT: necesario para paginación y exportación correctas.
    constraints.push(orderBy('sot'));
  }

  if (cursor) {
    constraints.push(startAfter(cursor));
  }
  constraints.push(limit(pageSize));

  return query(collection(db, COL), ...constraints);
}

/**
 * Lectura bajo demanda (sin realtime global) para reducir costos de Firestore.
 * @param {import('firebase/firestore').Query} q
 */
export async function fetchQueryPage(q) {
  return getDocs(q);
}

/**
 * @param {{
 *   rol?: string,
 *   contratista?: string|null,
 *   metricasDocId?: string|null,
 * } | null | undefined} profile
 */
export async function getDashboardMetrics(profile) {
  const rol = profileRol(profile);
  const contractor = String(profile?.contratista ?? '').trim();
  const docFromProfile = String(profile?.metricasDocId ?? '').trim();

  // Reglas: asesor/supervisor solo leen metricas/{metricasDocId del perfil}.
  let metricDocId = 'global';
  if (rol === 'admin') {
    metricDocId = 'global';
  } else if (rol === 'supervisor' || rol === 'asesor') {
    metricDocId =
      docFromProfile ||
      metricasDocIdForContractor(contractor) ||
      'global';
  }
  const metricRef = doc(db, 'metricas', metricDocId);
  let metricSnap;
  try {
    metricSnap = await getDoc(metricRef);
  } catch (e) {
    if (e?.code === 'permission-denied') {
      return {
        total: 0,
        gestionadas: 0,
        confirmadoHoy: 0,
        confirmadoFuturo: 0,
        rechazos: 0,
      };
    }
    throw e;
  }
  if (!metricSnap.exists()) {
    return {
      total: 0,
      gestionadas: 0,
      confirmadoHoy: 0,
      confirmadoFuturo: 0,
      rechazos: 0,
    };
  }
  const m = metricSnap.data() ?? {};
  return {
    total: Number(m.total ?? 0),
    gestionadas: Number(m.gestionadas ?? 0),
    confirmadoHoy: Number(m.confirmadoHoy ?? 0),
    confirmadoFuturo: Number(m.confirmadoFuturo ?? 0),
    rechazos: Number(m.rechazos ?? 0),
  };
}

/**
 * Guarda gestión de ticket. No toca `fecha_programacion_sga`, `status_agenda` ni `dilacion`
 * (provienen solo de la importación Excel).
 *
 * @param {string} ordenId
 * @param {{
 *   tipoGestion: string,
 *   fecha?: Date | null,
 *   rangoHorario?: string | null,
 * }} gestion
 * @param {{ uid: string, email: string|null, displayName?: string }} actor
 */
export async function saveGestion(ordenId, gestion, actor) {
  const ref = doc(db, COL, ordenId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error('La orden no existe.');
    }
    const data = snap.data();
    const prevGestion = data.gestion ?? null;

    const logEntry = {
      action: prevGestion?.tipoGestion ? 'UPDATE_GESTION' : 'CREATE_GESTION',
      anterior: prevGestion ?? null,
      nuevo: {
        tipoGestion: gestion.tipoGestion,
        fecha: gestion.fecha ?? null,
        rangoHorario: gestion.rangoHorario ?? null,
      },
      usuarioId: actor.uid,
      usuarioEmail: actor.email ?? '',
      // Firestore no admite FieldValue.serverTimestamp() dentro de arrays.
      timestamp: new Date().toISOString(),
    };

    const historial = Array.isArray(data.historial) ? [...data.historial] : [];
    historial.push(logEntry);
    if (historial.length > 100) {
      historial.splice(0, historial.length - 100);
    }

    const fechaTs =
      gestion.fecha instanceof Date
        ? Timestamp.fromDate(gestion.fecha)
        : gestion.fecha
          ? Timestamp.fromDate(new Date(gestion.fecha))
          : null;

    const newGestion = {
      tipoGestion: gestion.tipoGestion,
      fecha: fechaTs,
      rangoHorario: gestion.rangoHorario ?? null,
      usuarioId: actor.uid,
      usuarioEmail: actor.email ?? '',
      usuarioNombre: actor.displayName ?? '',
      timestamp: serverTimestamp(),
    };

    const nombre =
      (actor.displayName && String(actor.displayName).trim()) ||
      (actor.email ? String(actor.email).split('@')[0] : '') ||
      '';

    tx.update(ref, {
      gestion: newGestion,
      tieneGestion: true,
      gestionTipo: gestion.tipoGestion,
      gestionadoPor: {
        nombre,
        email: actor.email ?? '',
        uid: actor.uid,
        actualizadoEn: serverTimestamp(),
      },
      historial,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Guarda observación corta editable por cualquier rol operativo.
 * @param {string} ordenId
 * @param {string} observacion
 */
export async function updateOrdenObservacion(ordenId, observacion) {
  const ref = doc(db, COL, ordenId);
  await updateDoc(ref, {
    observacion: String(observacion ?? '').trim().slice(0, 120),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Exportación: recorre resultados con la misma lógica de filtros (máx. maxRows).
 * @param {{ rol: string, contratista: string|null }} profile
 * @param {Parameters<typeof buildOrdenesQuery>[1]} filters
 * @param {number} [maxRows]
 */
/**
 * Solo admin/supervisor (misma regla que panel de administración).
 * @param {{ rol?: string, contratista?: string|null } | null | undefined} profile
 */
function assertCanBulkManageSots(profile) {
  const rol = profileRol(profile);
  if (rol !== 'admin' && rol !== 'supervisor') {
    throw new Error('No tiene permiso para esta acción.');
  }
}

/**
 * Filtro por `gestionTipo` (campo denormalizado; coincide con gestión en app).
 * Supervisor: solo su contratista. Admin: todos los SOT.
 * @param {{ rol?: string, contratista?: string|null } | null | undefined} profile
 * @param {string} tipoGestion
 * @returns {import('firebase/firestore').QueryConstraint[]}
 */
function bulkByGestionTipoConstraints(profile, tipoGestion) {
  assertCanBulkManageSots(profile);
  const rol = profileRol(profile);
  const contractor = String(profile?.contratista ?? '').trim();
  const tipo = String(tipoGestion ?? '').trim();
  if (!tipo) {
    throw new Error('Seleccione un tipo de gestión.');
  }
  if (rol === 'supervisor' && !contractor) {
    throw new Error('Su perfil no tiene contratista asignado.');
  }
  /** @type {import('firebase/firestore').QueryConstraint[]} */
  const c = [];
  if (rol === 'supervisor' && contractor !== CONTRATISTA_TODOS) {
    c.push(where('contratista', '==', contractor));
  }
  c.push(where('gestionTipo', '==', tipo));
  c.push(orderBy('sot'));
  return c;
}

/**
 * Cuenta documentos con ese tipo (sin leer todos los campos; agregación Firestore).
 * @param {{ rol?: string, contratista?: string|null } | null | undefined} profile
 * @param {string} tipoGestion
 */
export async function countSotsByGestionTipo(profile, tipoGestion) {
  const constraints = bulkByGestionTipoConstraints(profile, tipoGestion);
  const q = query(collection(db, COL), ...constraints);
  const agg = await getCountFromServer(q);
  return agg.data().count;
}

const BULK_PAGE = 500;

/**
 * Elimina en bloques de hasta 500. Las reglas solo permiten admin/supervisor.
 * `syncSotMetrics` actualiza métricas por cada borrado.
 * @param {{ rol?: string, contratista?: string|null } | null | undefined} profile
 * @param {string} tipoGestion
 * @param {(deletedSoFar: number) => void} [onProgress]
 */
export async function deleteSotsByGestionTipo(profile, tipoGestion, onProgress) {
  const base = bulkByGestionTipoConstraints(profile, tipoGestion);
  let lastDoc = null;
  let totalDeleted = 0;
  while (true) {
    const page = [...base, limit(BULK_PAGE)];
    if (lastDoc) {
      page.push(startAfter(lastDoc));
    }
    const snap = await getDocs(query(collection(db, COL), ...page));
    if (snap.empty) {
      break;
    }
    const batch = writeBatch(db);
    for (const d of snap.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
    totalDeleted += snap.docs.length;
    onProgress?.(totalDeleted);
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < BULK_PAGE) {
      break;
    }
  }
  return { deleted: totalDeleted };
}

/**
 * Reinicia gestión sin borrar el documento. Solo admin/supervisor (reglas + gestionClearAllowed).
 * @param {{ rol?: string, contratista?: string|null } | null | undefined} profile
 * @param {string} tipoGestion
 * @param {(updatedSoFar: number) => void} [onProgress]
 */
export async function clearGestionByTipo(profile, tipoGestion, onProgress) {
  const base = bulkByGestionTipoConstraints(profile, tipoGestion);
  let lastDoc = null;
  let totalUpdated = 0;
  while (true) {
    const page = [...base, limit(BULK_PAGE)];
    if (lastDoc) {
      page.push(startAfter(lastDoc));
    }
    const snap = await getDocs(query(collection(db, COL), ...page));
    if (snap.empty) {
      break;
    }
    const batch = writeBatch(db);
    for (const d of snap.docs) {
      batch.update(d.ref, {
        gestion: null,
        tieneGestion: false,
        gestionTipo: null,
        gestionadoPor: deleteField(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    totalUpdated += snap.docs.length;
    onProgress?.(totalUpdated);
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < BULK_PAGE) {
      break;
    }
  }
  return { updated: totalUpdated };
}

export async function fetchAllOrdenesForExport(profile, filters, maxRows = 5000) {
  const pageSize = 500;
  const all = [];
  let cursor = null;
  while (all.length < maxRows) {
    const q = buildOrdenesQuery(profile, filters, pageSize, cursor);
    const snap = await getDocs(q);
    if (snap.empty) break;
    snap.forEach((d) => all.push({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < pageSize) break;
    cursor = last;
  }
  return all;
}

export { COL as SOTS_COLLECTION, COL as ORDENES_COLLECTION };
