const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');

initializeApp();
const db = getFirestore();
const auth = getAuth();

const ALLOWED_ROLES = ['admin', 'supervisor', 'asesor'];

const CONTRATISTA_TODOS = '__TODOS__';

function metricDocIdForContractor(contratista) {
  const raw = String(contratista ?? '').trim();
  if (raw === CONTRATISTA_TODOS) {
    return 'global';
  }
  const c = raw.toLowerCase();
  if (!c) return null;
  return `contratista_${c.replace(/[^a-z0-9]+/g, '_')}`;
}

function metricVectorFromSot(data) {
  if (!data) return null;
  const tipo = String(data.gestionTipo ?? '').trim();
  return {
    total: 1,
    gestionadas: data.tieneGestion ? 1 : 0,
    confirmadoHoy: tipo === 'CONFIRMADO_HOY' ? 1 : 0,
    confirmadoFuturo: tipo === 'CONFIRMADO_FUTURO' ? 1 : 0,
    rechazos: tipo === 'RECHAZO' ? 1 : 0,
  };
}

function diffMetricVector(beforeData, afterData) {
  const b = metricVectorFromSot(beforeData);
  const a = metricVectorFromSot(afterData);
  const keys = ['total', 'gestionadas', 'confirmadoHoy', 'confirmadoFuturo', 'rechazos'];
  const out = {};
  for (const k of keys) {
    out[k] = (a?.[k] ?? 0) - (b?.[k] ?? 0);
  }
  return out;
}

async function applyMetricDelta(docId, delta) {
  if (!docId) return;
  const ref = db.collection('metricas').doc(docId);
  await ref.set(
    {
      total: FieldValue.increment(delta.total || 0),
      gestionadas: FieldValue.increment(delta.gestionadas || 0),
      confirmadoHoy: FieldValue.increment(delta.confirmadoHoy || 0),
      confirmadoFuturo: FieldValue.increment(delta.confirmadoFuturo || 0),
      rechazos: FieldValue.increment(delta.rechazos || 0),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Crea usuario en Firebase Auth + documento users/{uid}.
 * Solo invocable por un usuario con rol === admin en Firestore.
 */
exports.createUserWithProfile = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
    }

    const callerSnap = await db.collection('users').doc(request.auth.uid).get();
    const callerData = callerSnap.data() || {};
    const callerRole = String(
      callerData.rol ?? callerData.role ?? '',
    )
      .trim()
      .toLowerCase();
    if (!callerSnap.exists || callerRole !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Solo los administradores pueden crear usuarios.',
      );
    }

    const data = request.data || {};
    const emailStr = typeof data.email === 'string' ? data.email.trim() : '';
    const passwordStr = typeof data.password === 'string' ? data.password : '';
    const displayName =
      typeof data.displayName === 'string' ? data.displayName.trim() : '';
    const roleRaw = String(
      typeof data.rol === 'string'
        ? data.rol
        : typeof data.role === 'string'
          ? data.role
          : 'asesor',
    )
      .trim()
      .toLowerCase();
    const contratistaRaw =
      typeof data.contratista === 'string' ? data.contratista.trim() : '';

    if (!emailStr || !passwordStr) {
      throw new HttpsError(
        'invalid-argument',
        'Email y contraseña son obligatorios.',
      );
    }
    if (passwordStr.length < 6) {
      throw new HttpsError(
        'invalid-argument',
        'La contraseña debe tener al menos 6 caracteres.',
      );
    }

    const roleStr = ALLOWED_ROLES.includes(roleRaw) ? roleRaw : 'asesor';
    const needsContratista = roleStr === 'supervisor' || roleStr === 'asesor';
    if (needsContratista && !contratistaRaw) {
      throw new HttpsError(
        'invalid-argument',
        'Indique el contratista para supervisor o asesor.',
      );
    }

    const contratistaFinal =
      roleStr === 'admin' ? null : contratistaRaw || null;

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: emailStr,
        password: passwordStr,
        displayName,
        emailVerified: false,
      });
    } catch (e) {
      const code = e.errorInfo?.code || e.code;
      if (code === 'auth/email-already-exists') {
        throw new HttpsError(
          'already-exists',
          'Ese correo ya está registrado en Authentication.',
        );
      }
      if (code === 'auth/invalid-email') {
        throw new HttpsError('invalid-argument', 'El correo no es válido.');
      }
      throw new HttpsError(
        'internal',
        e.message || 'No se pudo crear el usuario en Authentication.',
      );
    }

    await db
      .collection('users')
      .doc(userRecord.uid)
      .set({
        email: emailStr,
        displayName,
        rol: roleStr,
        contratista: contratistaFinal,
        metricasDocId: metricDocIdForContractor(contratistaFinal),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    return { uid: userRecord.uid, email: emailStr };
  },
);

/**
 * Mantiene `metricasDocId` alineado con `contratista` (reglas de lectura de `metricas/*`).
 */
exports.syncUserMetricasDocId = onDocumentWritten(
  {
    document: 'users/{uid}',
    region: 'us-central1',
  },
  async (event) => {
    const afterSnap = event.data.after;
    if (!afterSnap.exists) return;
    const after = afterSnap.data();
    const expected = metricDocIdForContractor(after.contratista);
    const current = after.metricasDocId;
    // Evitar bucles: null vs campo ausente
    if (expected == current) return;
    await afterSnap.ref.update({
      metricasDocId: expected ? expected : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);

/**
 * Repara perfiles antiguos sin `metricasDocId` (invocado desde el cliente tras login).
 */
exports.syncMyMetricasDocId = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
    }
    const ref = db.collection('users').doc(request.auth.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'Perfil no encontrado.');
    }
    const d = snap.data();
    const expected = metricDocIdForContractor(d.contratista);
    await ref.update({
      metricasDocId: expected ? expected : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { metricasDocId: expected || null };
  },
);

/**
 * Mantiene colección agregada `metricas` para dashboard económico:
 * - metricas/global
 * - metricas/contratista_<slug>
 */
exports.syncSotMetrics = onDocumentWritten(
  {
    document: 'sots/{sotId}',
    region: 'us-central1',
    retry: true,
  },
  async (event) => {
    const beforeData = event.data.before.exists ? event.data.before.data() : null;
    const afterData = event.data.after.exists ? event.data.after.data() : null;
    if (!beforeData && !afterData) return;

    const globalDelta = diffMetricVector(beforeData, afterData);
    await applyMetricDelta('global', globalDelta);

    const beforeContractor = metricDocIdForContractor(beforeData?.contratista);
    const afterContractor = metricDocIdForContractor(afterData?.contratista);

    if (beforeContractor && beforeContractor === afterContractor) {
      await applyMetricDelta(beforeContractor, globalDelta);
      return;
    }

    if (beforeContractor) {
      const removeDelta = diffMetricVector(beforeData, null);
      await applyMetricDelta(beforeContractor, removeDelta);
    }
    if (afterContractor) {
      const addDelta = diffMetricVector(null, afterData);
      await applyMetricDelta(afterContractor, addDelta);
    }
  },
);
