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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
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
  }, []);

  const refreshProfile = useCallback(
    async (uid) => {
      if (isAuthDisabled()) {
        applyDemoState();
        return;
      }
      const pr = await getUserProfile(uid);
      setProfile(pr);
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
        try {
          await refreshProfile(u.uid);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, [applyDemoState, refreshProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      refreshProfile,
      authDisabled: isAuthDisabled(),
      updateDemoProfile,
    }),
    [user, profile, loading, refreshProfile, updateDemoProfile],
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
