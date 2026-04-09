import { ROLES } from '../constants/gestion';

/** @param {unknown} role */
export function normalizeRole(role) {
  if (role == null || typeof role !== 'string') return '';
  return role.trim().toLowerCase();
}

/**
 * @param {{ role?: string } | null | undefined} profile
 */
export function isAdmin(profile) {
  return normalizeRole(profile?.role) === ROLES.ADMIN;
}

/**
 * @param {{ role?: string } | null | undefined} profile
 */
export function isSupervisor(profile) {
  return normalizeRole(profile?.role) === ROLES.SUPERVISOR;
}

/**
 * @param {{ role?: string } | null | undefined} profile
 */
export function isAsesor(profile) {
  return normalizeRole(profile?.role) === ROLES.ASESOR;
}

/** Panel de usuarios (solo admin). */
export function canManageUsers(profile) {
  return isAdmin(profile);
}

/** Importar Excel base (solo admin). */
export function canLoadExcel(profile) {
  return isAdmin(profile);
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
  const r = normalizeRole(profile?.role);
  return allowed.some((a) => normalizeRole(a) === r);
}
