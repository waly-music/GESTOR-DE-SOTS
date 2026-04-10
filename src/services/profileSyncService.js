import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Sincroniza `metricasDocId` en el perfil del usuario autenticado (Admin SDK en Cloud Function).
 * Útil para perfiles creados antes de desplegar esta lógica.
 */
export async function syncMyMetricasDocId() {
  const fn = httpsCallable(functions, 'syncMyMetricasDocId');
  const res = await fn({});
  return res.data;
}
