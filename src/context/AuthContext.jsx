import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isAuthDisabled } from '../config/authMode';
import { getDemoProfile, setDemoProfile } from '../services/demoProfile';
import { subscribeAuth, getUserProfile } from '../services/authService';
import { syncMyMetricasDocId } from '../services/profileSyncService';
import { isAsesor, isSupervisor } from '../utils/roles';

const AuthContext = createContext(null);

/**
 * @typedef {'missing' | 'permission' | 'network' | 'unknown' | null} ProfileLoadError
 */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  /** Si no hay perfil: falta doc, permisos Firestore, red, u otro (no solo "no existe"). */
  const [profileError, setProfileError] = useState(
    /** @type {ProfileLoadError} */ (null),
  );
  const [loading, setLoading] = useState(true);

  const applyDemoState = useCallback(() => {
    const p = getDemoProfile();
    setUser({
      uid: p.uid,
      email: p.email,
      displayName: p.displayName,
    });
    setProfile({
      id: p.uid,
      email: p.email,
      displayName: p.displayName,
      rol: p.rol,
      contratista: p.contratista || null,
    });
    setProfileError(null);
  }, []);

  const refreshProfile = useCallback(
    async (uid) => {
      if (isAuthDisabled()) {
        applyDemoState();
        return;
      }
      setProfileError(null);
      try {
        let pr = await getUserProfile(uid);
        if (pr === null) {
          setProfile(null);
          setProfileError('missing');
          return;
        }
        if (
          pr.contratista &&
          !pr.metricasDocId &&
          (isAsesor(pr) || isSupervisor(pr))
        ) {
          try {
            await syncMyMetricasDocId();
            const again = await getUserProfile(uid);
            if (again) pr = again;
          } catch (e) {
            console.warn('[AuthContext] syncMyMetricasDocId', e?.message ?? e);
          }
        }
        setProfile(pr);
        setProfileError(null);
      } catch (e) {
        console.error('[AuthContext] Error al leer users/{uid} en Firestore', uid, e);
        setProfile(null);
        const code = e?.code ?? '';
        if (code === 'permission-denied') {
          setProfileError('permission');
        } else if (
          code === 'unavailable' ||
          code === 'deadline-exceeded' ||
          code === 'network-request-failed'
        ) {
          setProfileError('network');
        } else {
          setProfileError('unknown');
        }
      }
    },
    [applyDemoState],
  );

  const updateDemoProfile = useCallback(
    (patch) => {
      if (!isAuthDisabled()) return;
      setDemoProfile(patch);
      applyDemoState();
    },
    [applyDemoState],
  );

  useEffect(() => {
    if (isAuthDisabled()) {
      applyDemoState();
      setLoading(false);
      return undefined;
    }

    return subscribeAuth(async (u) => {
      setUser(u);
      if (u) {
        await refreshProfile(u.uid);
      } else {
        setProfile(null);
        setProfileError(null);
      }
      setLoading(false);
    });
  }, [applyDemoState, refreshProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      profileError,
      loading,
      refreshProfile,
      authDisabled: isAuthDisabled(),
      updateDemoProfile,
    }),
    [user, profile, profileError, loading, refreshProfile, updateDemoProfile],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
