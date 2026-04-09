const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const cors = require('cors');

initializeApp();
const db = getFirestore();
const auth = getAuth();

const ALLOWED_ROLES = ['admin', 'supervisor', 'asesor'];
const ALLOWED_ORIGINS = [
  'https://gestion-sots.web.app',
  'http://localhost:5173',
];
const corsHandler = cors({
  origin: ALLOWED_ORIGINS,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

function applyCors(request) {
  return new Promise((resolve, reject) => {
    if (!request?.rawRequest || !request?.rawResponse) {
      resolve();
      return;
    }
    corsHandler(request.rawRequest, request.rawResponse, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Crea usuario en Firebase Auth + documento users/{uid}.
 * Solo invocable por un usuario con rol === admin en Firestore.
 */
exports.createUserWithProfile = onCall(
  {
    region: 'us-central1',
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    await applyCors(request);

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
        contratista:
          roleStr === 'admin' ? null : contratistaRaw || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    return { uid: userRecord.uid, email: emailStr };
  },
);
