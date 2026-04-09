import { Navigate, useLocation } from 'react-router-dom';
import { isAuthDisabled } from '../config/authMode';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../utils/roles';
import { Spinner } from './Spinner';

export function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();
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
          ) : (
            <>
              No existe un perfil en Firestore para su usuario. Cree el documento{' '}
              <code className="rounded bg-slate-200 px-1">users/{user?.uid}</code>{' '}
              con campo <code className="rounded bg-slate-200 px-1">role</code>{' '}
              (admin, supervisor o asesor).
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
