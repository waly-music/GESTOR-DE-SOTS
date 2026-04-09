import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { pickRoleFromUserDoc } from '../utils/roles';
import app, { auth, db } from './firebase';

const USERS = 'users';

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loginEmailPassword(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}

/**
 * Envía correo de restablecimiento de contraseña (Firebase Auth).
 * @param {string} email
 */
export async function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

/**
 * Mensaje legible en español para códigos comunes de Firebase Auth.
 * @param {{ code?: string, message?: string }} err
 */
export function authErrorMessage(err) {
  const code = err?.code ?? '';
  const map = {
    'auth/invalid-credential':
      'Correo o contraseña incorrectos.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/user-disabled': 'Esta cuenta está deshabilitada.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/too-many-requests':
      'Demasiados intentos. Espere un momento e intente de nuevo.',
    'auth/network-request-failed': 'Error de red. Compruebe su conexión.',
  };
  return map[code] ?? err?.message ?? 'Error al iniciar sesión.';
}

/**
 * Perfil en Firestore. Colección `users`, ID = UID de Authentication.
 * Lee `rol` (y compat. con `role` vía pickRoleFromUserDoc).
 * Prioriza lectura en servidor para no quedar con caché desactualizada.
 * @param {string} uid UID del usuario autenticado (debe coincidir con el ID del documento)
 */
export async function getUserProfile(uid) {
  const ref = doc(db, USERS, uid);
  const path = `${USERS}/${uid}`;
  const projectId = app.options?.projectId ?? '(sin projectId)';

  let snap;
  try {
    snap = await getDocFromServer(ref);
  } catch (e1) {
    console.warn(
      '[getUserProfile] getDocFromServer falló, reintentando con caché local:',
      e1?.code ?? e1,
    );
    try {
      snap = await getDoc(ref);
    } catch (e2) {
      console.error('[getUserProfile] Lectura Firestore falló (servidor y caché)', {
        path,
        uid,
        e1: e1?.code ?? e1,
        e2: e2?.code ?? e2,
      });
      throw e2;
    }
  }

  if (!snap.exists()) {
    // Diagnóstico: si el ID del doc no coincide con el UID, buscamos por email.
    // Esto ayuda a detectar perfiles creados con ID incorrecto.
    try {
      const email = auth.currentUser?.email ?? null;
      if (email) {
        const q = query(
          collection(db, USERS),
          where('email', '==', email),
          limit(3),
        );
        const byEmail = await getDocs(q);
        const matches = byEmail.docs.map((d) => ({
          id: d.id,
          rol: d.data()?.rol ?? d.data()?.role ?? null,
          email: d.data()?.email ?? null,
        }));
        if (matches.length) {
          console.error(
            '[getUserProfile] Perfil encontrado por email, pero NO por UID. ID incorrecto en users/{uid}.',
            {
              uidAuth: uid,
              email,
              matches,
            },
          );
        }
      }
    } catch (diagErr) {
      console.warn('[getUserProfile] Falló diagnóstico por email', diagErr);
    }

    console.warn('[getUserProfile] No hay documento en Firestore', {
      projectId,
      path,
      uid,
      source: 'exists() === false',
    });
    return null;
  }

  const data = snap.data();
  const rol = pickRoleFromUserDoc(data);
  const displayName =
    (typeof data.displayName === 'string' && data.displayName.trim()) ||
    (typeof data.nombre === 'string' && data.nombre.trim()) ||
    '';

  const profile = {
    id: snap.id,
    ...data,
    rol,
    displayName,
  };

  console.log('[getUserProfile] Documento users encontrado', {
    projectId,
    path,
    uid: snap.id,
    datos: profile,
  });

  return profile;
}

/**
 * Crear perfil inicial (p.ej. primer admin manual en consola o esta función solo en dev).
 * @param {string} uid
 * @param {{ email: string, displayName?: string, rol?: string, role?: string, contratista?: string|null }} data
 */
export async function ensureUserDocument(uid, data) {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  const rolRaw = data.rol ?? data.role;
  await setDoc(ref, {
    email: data.email,
    displayName: data.displayName ?? '',
    rol: typeof rolRaw === 'string' && rolRaw.trim() ? rolRaw.trim() : 'asesor',
    contratista: data.contratista ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
