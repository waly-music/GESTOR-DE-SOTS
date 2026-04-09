import { ROLES } from '../constants/gestion';

/** @param {unknown} role */
export function normalizeRole(role) {
  if (role == null) return '';
  const s = String(role).trim().toLowerCase();
  return s;
}

/**
 * Mapea sinónimos y mayúsculas a los roles canónicos del front.
 * @param {unknown} role
 */
export function canonicalRole(role) {
  const r = normalizeRole(role);
  if (!r) return '';
  if (
    r === 'admin' ||
    r === 'administrator' ||
    r === 'administrador' ||
    r === 'superadmin' ||
    r === 'super-admin'
  ) {
    return ROLES.ADMIN;
  }
  if (r === 'supervisor' || r === 'supervisora') return ROLES.SUPERVISOR;
  if (r === 'asesor' || r === 'asesora' || r === 'advisor' || r === 'asesores') {
    return ROLES.ASESOR;
  }
  return r;
}

/**
 * @param {Record<string, unknown> | null | undefined} data documento users de Firestore
 */
export function pickRoleFromUserDoc(data) {
  if (!data || typeof data !== 'object') return '';
  const d = /** @type {Record<string, unknown>} */ (data);
  const raw =
    d.role ??
    d.Role ??
    d.rol ??
    d.Rol ??
    d.userRole ??
    d['user-role'];
  return canonicalRole(raw);
}

/**
 * @param {{ role?: string } | null | undefined} profile
 */
export function isAdmin(profile) {
  return canonicalRole(profile?.role) === ROLES.ADMIN;
}

/**
 * @param {{ role?: string } | null | undefined} profile
 */
export function isSupervisor(profile) {
  return canonicalRole(profile?.role) === ROLES.SUPERVISOR;
}

/**
 * @param {{ role?: string } | null | undefined} profile
 */
export function isAsesor(profile) {
  return canonicalRole(profile?.role) === ROLES.ASESOR;
}

/** Panel de usuarios (solo admin). */
export function canManageUsers(profile) {
  return isAdmin(profile);
}

/** Importar Excel base (admin y supervisor; usuarios solo admin). */
export function canLoadExcel(profile) {
  return isAdmin(profile) || isSupervisor(profile);
}

/** Ruta /admin: Excel (y usuarios si es admin). */
export function canAccessAdminRoute(profile) {
  return isAdmin(profile) || isSupervisor(profile);
}

/** Tarjetas y totales globales en el dashboard (admin y supervisor). */
export function canViewGlobalMetrics(profile) {
  return isAdmin(profile) || isSupervisor(profile);
}

/**
 * @param {{ role?: string } | null | undefined} profile
 * @param {string[]} allowed e.g. [ROLES.ADMIN]
 */
export function hasRole(profile, allowed) {
  const r = canonicalRole(profile?.role);
  return allowed.some((a) => canonicalRole(a) === r);
}
