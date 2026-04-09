import { Navigate, useLocation } from 'react-router-dom';
import { isAuthDisabled } from '../config/authMode';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../utils/roles';
import { Spinner } from './Spinner';

export function ProtectedRoute({ children, roles }) {
  const { user, profile, profileError, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthDisabled() && !user) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-slate-700">
          {isAuthDisabled() ? (
            <>No se pudo cargar el perfil local. Recargue la página.</>
          ) : profileError === 'permission' ? (
            <>
              No se pudo leer <code className="rounded bg-slate-200 px-1">users/{user?.uid}</code>{' '}
              en Firestore (permiso denegado). Revise reglas y que el proyecto coincida con la consola.
            </>
          ) : profileError === 'network' ? (
            <>Error de red al cargar el perfil. Intente de nuevo.</>
          ) : profileError === 'unknown' ? (
            <>Error al cargar el perfil. Revise la consola (F12).</>
          ) : (
            <>
              No existe un perfil para este usuario en Firestore. Cree el documento{' '}
              <code className="rounded bg-slate-200 px-1">users/{user?.uid}</code> con campo{' '}
              <code className="rounded bg-slate-200 px-1">rol</code> (admin, supervisor o asesor).
            </>
          )}
        </p>
      </div>
    );
  }

  if (roles && !hasRole(profile, roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
