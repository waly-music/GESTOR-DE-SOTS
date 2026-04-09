import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const LINKS_COL = 'links';

export async function listLinks() {
  const q = query(collection(db, LINKS_COL), orderBy('nombre'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createLink(payload) {
  await addDoc(collection(db, LINKS_COL), {
    nombre: String(payload.nombre ?? '').trim(),
    url: String(payload.url ?? '').trim(),
    descripcion: String(payload.descripcion ?? '').trim(),
    categoria: String(payload.categoria ?? '').trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function editLink(id, patch) {
  await updateDoc(doc(db, LINKS_COL, id), {
    nombre: String(patch.nombre ?? '').trim(),
    url: String(patch.url ?? '').trim(),
    descripcion: String(patch.descripcion ?? '').trim(),
    categoria: String(patch.categoria ?? '').trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeLink(id) {
  await deleteDoc(doc(db, LINKS_COL, id));
}
