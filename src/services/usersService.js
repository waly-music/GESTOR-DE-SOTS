import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { USERS_LIST_MAX } from '../constants/firestoreLimits';
import { db } from './firebase';
import { pickRoleFromUserDoc } from '../utils/roles';
import { metricasDocIdForContractor } from '../utils/metricasDocId';

const USERS = 'users';

export async function listUsers() {
  const snap = await getDocs(
    query(
      collection(db, USERS),
      orderBy('email'),
      limit(USERS_LIST_MAX),
    ),
  );
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, rol: pickRoleFromUserDoc(data) };
  });
  rows.sort((a, b) => String(a.email ?? '').localeCompare(String(b.email ?? '')));
  return rows;
}

/**
 * @param {string} uid
 * @param {{ contratista?: string|null, rol?: string }} patch
 */
export async function updateUserFields(uid, patch) {
  const ref = doc(db, USERS, uid);
  const data = { updatedAt: serverTimestamp() };
  if (patch.contratista !== undefined) {
    data.contratista = patch.contratista;
    data.metricasDocId = metricasDocIdForContractor(patch.contratista);
  }
  if (patch.rol !== undefined) data.rol = patch.rol;
  await updateDoc(ref, data);
}
