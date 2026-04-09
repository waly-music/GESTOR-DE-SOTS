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
 * @param {string[]} allowed e.g. [ROLES.ADMIN]
 */
export function hasRole(profile, allowed) {
  const r = normalizeRole(profile?.role);
  return allowed.some((a) => normalizeRole(a) === r);
}
