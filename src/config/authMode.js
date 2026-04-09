/**
 * Sin Firebase Auth: perfil solo en localStorage (ver `demoProfile.js`).
 * En producción con login, establecer VITE_DISABLE_AUTH=false o eliminar la variable.
 */
export function isAuthDisabled() {
  return import.meta.env.VITE_DISABLE_AUTH === 'true';
}
