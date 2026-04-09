import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { pickRoleFromUserDoc } from '../utils/roles';
import { auth, db } from './firebase';

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
 * Perfil en Firestore. El documento usa el UID de Auth como ID.
 * @param {string} uid
 */
export async function getUserProfile(uid) {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  const role = pickRoleFromUserDoc(data);
  return { id: snap.id, ...data, role };
}

/**
 * Crear perfil inicial (p.ej. primer admin manual en consola o esta función solo en dev).
 * @param {string} uid
 * @param {{ email: string, displayName?: string, role?: string, contratista?: string|null }} data
 */
export async function ensureUserDocument(uid, data) {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    email: data.email,
    displayName: data.displayName ?? '',
    role: data.role ?? 'asesor',
    contratista: data.contratista ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
