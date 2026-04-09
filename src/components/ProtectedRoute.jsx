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
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {isAuthDisabled() ? (
            <p className="text-slate-700">No se pudo cargar tu perfil local. Recarga la página.</p>
          ) : profileError === 'permission' ? (
            <>
              <p className="font-semibold text-slate-900">No tienes acceso al perfil</p>
              <p className="mt-2 text-sm text-slate-600">
                Contacta con el administrador para revisar tus permisos.
              </p>
            </>
          ) : profileError === 'network' ? (
            <>
              <p className="font-semibold text-slate-900">No pudimos cargar tu perfil</p>
              <p className="mt-2 text-sm text-slate-600">
                Verifica tu conexión e inténtalo nuevamente.
              </p>
            </>
          ) : profileError === 'unknown' ? (
            <>
              <p className="font-semibold text-slate-900">Error al cargar tu perfil</p>
              <p className="mt-2 text-sm text-slate-600">
                Intenta de nuevo en unos segundos o contacta con soporte.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-900">No tienes perfil configurado</p>
              <p className="mt-2 text-sm text-slate-600">
                Contacta con el administrador para activar tu acceso.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (roles && !hasRole(profile, roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
