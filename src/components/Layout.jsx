import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import { ROLES } from '../constants/gestion';
import { DemoProfileModal } from './DemoProfileModal';

export function Layout({ children }) {
  const { user, profile, authDisabled } = useAuth();
  const [demoModal, setDemoModal] = useState(false);

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-brand-600 text-white shadow'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  async function handleLogout() {
    if (authDisabled) return;
    await logout();
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen flex flex-col">
      {authDisabled && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          <strong>Modo sin Firebase Authentication:</strong> el rol y el contratista se eligen en{' '}
          <button
            type="button"
            onClick={() => setDemoModal(true)}
            className="font-medium underline"
          >
            Perfil local
          </button>
          . Despliegue reglas de Firestore permisivas (ver README).
        </div>
      )}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-semibold text-slate-900"
          >
            <span className="rounded-lg bg-brand-600 px-2 py-1 text-sm text-white">
              SOT
            </span>
            Gestión órdenes
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/" className={linkClass} end>
              Dashboard
            </NavLink>
            {profile?.role === ROLES.ADMIN && (
              <NavLink to="/usuarios" className={linkClass}>
                Usuarios
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">
              {user?.email}
              {profile?.role && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase text-slate-700">
                  {profile.role}
                </span>
              )}
            </span>
            {authDisabled ? (
              <button
                type="button"
                onClick={() => setDemoModal(true)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Perfil local
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Salir
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      {authDisabled && (
        <DemoProfileModal open={demoModal} onClose={() => setDemoModal(false)} />
      )}
    </div>
  );
}
