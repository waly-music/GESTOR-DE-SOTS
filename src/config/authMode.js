/**
 * Solo desarrollo: sin Firebase Auth (perfil en `demoProfile.js`).
 * Por defecto está desactivado; en producción use login y `firestore.rules`.
 */
export function isAuthDisabled() {
  if (import.meta.env.PROD && import.meta.env.VITE_DISABLE_AUTH === 'true') {
    console.warn(
      '[auth] VITE_DISABLE_AUTH está ignorado en builds de producción por seguridad.',
    );
    return false;
  }
  return import.meta.env.VITE_DISABLE_AUTH === 'true';
}
