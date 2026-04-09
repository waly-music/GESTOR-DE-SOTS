import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Crea usuario en Firebase Authentication y documento `users/{uid}` (Cloud Function).
 * @param {{
 *   email: string,
 *   password: string,
 *   displayName?: string,
 *   rol: string,
 *   contratista?: string | null,
 * }} payload
 */
export async function createUserWithAuth(payload) {
  const callable = httpsCallable(functions, 'createUserWithProfile');
  const res = await callable(payload);
  return res.data;
}
