/**
 * Solo desarrollo: sin Firebase Auth (perfil en `demoProfile.js`).
 * Por defecto está desactivado; en producción use login y `firestore.rules`.
 */
export function isAuthDisabled() {
  return import.meta.env.VITE_DISABLE_AUTH === 'true';
}
