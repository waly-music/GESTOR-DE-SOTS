import { ROLES } from '../constants/gestion';
import { canonicalRole } from '../utils/roles';

const STORAGE_KEY = 'sot_demo_profile_v1';

/** UID fijo para trazabilidad en gestiones e historial (modo sin Auth). */
export const DEMO_LOCAL_UID = 'local-demo-user';

const defaultProfile = () => ({
  uid: DEMO_LOCAL_UID,
  email: 'demo@local',
  displayName: 'Usuario local',
  rol: ROLES.ADMIN,
  contratista: '',
});

function readRaw() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function getDemoProfile() {
  const raw = readRaw();
  const base = defaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    uid: DEMO_LOCAL_UID,
    rol: canonicalRole(raw.rol ?? raw.role ?? base.rol),
    contratista:
      raw.contratista != null && String(raw.contratista).trim() !== ''
        ? String(raw.contratista).trim()
        : '',
  };
}

/**
 * @param {Partial<{ email: string, displayName: string, rol: string, contratista: string }>} patch
 */
export function setDemoProfile(patch) {
  const cur = getDemoProfile();
  const next = {
    ...cur,
    ...patch,
    uid: DEMO_LOCAL_UID,
    contratista:
      patch.contratista != null
        ? String(patch.contratista).trim()
        : cur.contratista,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
