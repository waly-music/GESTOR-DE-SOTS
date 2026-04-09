const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

initializeApp();
const db = getFirestore();
const auth = getAuth();

const ALLOWED_ROLES = ['admin', 'supervisor', 'asesor'];

/**
 * Crea usuario en Firebase Auth + documento users/{uid}.
 * Solo invocable por un usuario con role === admin en Firestore.
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
    const callerRole = String(callerSnap.data()?.role ?? '')
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
      typeof data.role === 'string' ? data.role : 'asesor',
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
        role: roleStr,
        contratista:
          roleStr === 'admin' ? null : contratistaRaw || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    return { uid: userRecord.uid, email: emailStr };
  },
);
