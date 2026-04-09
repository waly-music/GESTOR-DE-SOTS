import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
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
 * Perfil en Firestore. El documento usa el UID de Auth como ID.
 * @param {string} uid
 */
export async function getUserProfile(uid) {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
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
