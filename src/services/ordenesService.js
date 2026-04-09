import {
  Timestamp,
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
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
import { chunkArray } from '../utils/chunk';
import { isAdmin, normalizeRole } from '../utils/roles';
import { normalizeSotDisplay, sotToDocId } from '../utils/sotId';

const COL = 'ordenes';

/**
 * @param {import('firebase/firestore').Query} q
 */
export async function countQuery(q) {
  const agg = await getCountFromServer(q);
  return agg.data().count;
}

/**
 * @param {{ role: string, contratista: string|null }} profile
 */
function contractorFilter(profile) {
  if (isAdmin(profile)) return null;
  const c = profile.contratista?.trim();
  if (!c) return '__NONE__';
  return c;
}

/**
 * Lectura por lotes de documentos por ID (máx. 10 por consulta `in`).
 * @param {string[]} docIds
 */
export async function fetchOrdenDocsByIds(docIds) {
  const unique = [...new Set(docIds)].filter(Boolean);
  const chunks = chunkArray(unique, 10);
  /** @type {Map<string, import('firebase/firestore').DocumentSnapshot>} */
  const map = new Map();
  for (const part of chunks) {
    const q = query(
      collection(db, COL),
      where(documentId(), 'in', part),
    );
    const snap = await getDocs(q);
    snap.forEach((d) => map.set(d.id, d));
  }
  return map;
}

/**
 * Importa filas Excel con lógica: insertar nuevas, actualizar sin gestión, no tocar con gestión.
 * @param {Array<{region:string,departamento:string,distrito:string,contratista:string,sot:string}>} rows
 * @param {(info: { phase: string, done: number, total: number }) => void} [onProgress]
 */
export async function importExcelRows(rows, onProgress) {
  const total = rows.length;
  let done = 0;
  const report = (phase) => {
    onProgress?.({ phase, done, total });
  };

  const docIds = [];
  const rowById = new Map();
  for (const row of rows) {
    const id = sotToDocId(row.sot);
    docIds.push(id);
    rowById.set(id, row);
  }

  const existing = await fetchOrdenDocsByIds(docIds);
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

  const BATCH_MAX = 500;

  const ops = [];

  for (const { id, row } of toCreate) {
    const ref = doc(db, COL, id);
    ops.push({
      ref,
      data: {
        sot: normalizeSotDisplay(row.sot),
        region: row.region,
        departamento: row.departamento,
        distrito: row.distrito,
        contratista: row.contratista,
        gestion: null,
        tieneGestion: false,
        gestionTipo: null,
        historial: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastExcelImportAt: serverTimestamp(),
      },
      options: { merge: false },
    });
  }

  for (const { id, row } of toUpdate) {
    const ref = doc(db, COL, id);
    ops.push({
      ref,
      data: {
        sot: normalizeSotDisplay(row.sot),
        region: row.region,
        departamento: row.departamento,
        distrito: row.distrito,
        contratista: row.contratista,
        updatedAt: serverTimestamp(),
        lastExcelImportAt: serverTimestamp(),
      },
      options: { merge: true },
    });
  }

  const chunkOps = chunkArray(ops, BATCH_MAX);
  for (const part of chunkOps) {
    const batch = writeBatch(db);
    for (const op of part) {
      batch.set(op.ref, op.data, op.options);
    }
    await batch.commit();
    done += part.length;
    report('write');
  }

  await mergeFiltrosFromExcelRows(rows);

  return {
    created: toCreate.length,
    updated: toUpdate.length,
    skippedWithGestion: skippedWithGestion.length,
  };
}

/**
 * @param {{ role: string, contratista: string|null }} profile
 * @param {{
 *   region?: string,
 *   departamento?: string,
 *   distrito?: string,
 *   contratista?: string,
 *   searchSot?: string,
 * }} filters
 */
export function buildOrdenesQuery(profile, filters, pageSize = 25, cursor = null) {
  const constraints = [];
  const cf = contractorFilter(profile);
  if (cf && cf !== '__NONE__') {
    constraints.push(where('contratista', '==', cf));
  } else if (cf === '__NONE__') {
    constraints.push(where('contratista', '==', '__IMPOSSIBLE__'));
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
  if (filters.contratista && isAdmin(profile)) {
    constraints.push(where('contratista', '==', filters.contratista));
  }

  const sotSearch = filters.searchSot?.trim();
  if (sotSearch) {
    const end = `${sotSearch}\uf8ff`;
    constraints.push(where('sot', '>=', sotSearch));
    constraints.push(where('sot', '<=', end));
    constraints.push(orderBy('sot'));
  } else {
    constraints.push(orderBy('sot'));
  }

  if (cursor) {
    constraints.push(startAfter(cursor));
  }
  constraints.push(limit(pageSize));

  return query(collection(db, COL), ...constraints);
}

/**
 * Suscripción en tiempo real a la página actual.
 * Nota: requiere índices compuestos si combina filtros + orderBy.
 * @param {import('firebase/firestore').Query} q
 * @param {(docs: import('firebase/firestore').QuerySnapshot) => void} onNext
 */
export function subscribeQuery(q, onNext, onError) {
  return onSnapshot(q, onNext, onError);
}

/**
 * @param {{ role: string, contratista: string|null }} profile
 */
export async function getDashboardMetrics(profile) {
  const base = collection(db, COL);
  const cf = contractorFilter(profile);

  const contractorWhere =
    cf && cf !== '__NONE__'
      ? [where('contratista', '==', cf)]
      : cf === '__NONE__'
        ? [where('contratista', '==', '__IMPOSSIBLE__')]
        : [];

  const total = await countQuery(query(base, ...contractorWhere));

  const gestionadas = await countQuery(
    query(base, ...contractorWhere, where('tieneGestion', '==', true)),
  );

  const confirmadoHoy = await countQuery(
    query(
      base,
      ...contractorWhere,
      where('gestionTipo', '==', 'CONFIRMADO_HOY'),
    ),
  );

  const confirmadoFuturo = await countQuery(
    query(
      base,
      ...contractorWhere,
      where('gestionTipo', '==', 'CONFIRMADO_FUTURO'),
    ),
  );

  const rechazos = await countQuery(
    query(
      base,
      ...contractorWhere,
      where('gestionTipo', '==', 'RECHAZO'),
    ),
  );

  return {
    total,
    gestionadas,
    confirmadoHoy,
    confirmadoFuturo,
    rechazos,
  };
}

/**
 * @param {string} ordenId
 * @param {{
 *   tipoGestion: string,
 *   fecha?: Date | null,
 *   rangoHorario?: string | null,
 * }} gestion
 * @param {{ uid: string, email: string|null, displayName?: string }} actor
 * @param {{ role: string }} profile
 * @param {boolean} [forceEdit] admin/supervisor override
 */
export async function saveGestion(
  ordenId,
  gestion,
  actor,
  profile,
  forceEdit = false,
) {
  const ref = doc(db, COL, ordenId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error('La orden no existe.');
    }
    const data = snap.data();
    const prevGestion = data.gestion ?? null;

    if (
      !forceEdit &&
      normalizeRole(profile.role) === 'asesor' &&
      prevGestion?.tipoGestion &&
      prevGestion.usuarioId &&
      prevGestion.usuarioId !== actor.uid
    ) {
      throw new Error('No puede editar la gestión de otro usuario.');
    }

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
      timestamp: serverTimestamp(),
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

    tx.update(ref, {
      gestion: newGestion,
      tieneGestion: true,
      gestionTipo: gestion.tipoGestion,
      historial,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Exportación: recorre resultados con la misma lógica de filtros (máx. maxRows).
 * @param {{ role: string, contratista: string|null }} profile
 * @param {Parameters<typeof buildOrdenesQuery>[1]} filters
 * @param {number} [maxRows]
 */
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

export { COL as ORDENES_COLLECTION };
