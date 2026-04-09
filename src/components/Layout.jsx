import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import { canAccessAdminRoute, canManageUsers } from '../utils/roles';
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
    <div className="min-h-screen bg-slate-100">
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
      <div className="mx-auto flex w-full max-w-[1600px] gap-4 p-4">
        <aside className="hidden w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
          <Link
            to="/"
            className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900"
          >
            <span className="rounded-lg bg-brand-600 px-2 py-1 text-sm text-white">
              SOT
            </span>
            Gestión órdenes
          </Link>

          <nav className="space-y-2">
            <NavLink to="/" className={linkClass} end>
              Dashboard
            </NavLink>
            <NavLink to="/" className={linkClass}>
              Gestión de SOTs
            </NavLink>
            {canAccessAdminRoute(profile) && (
              <NavLink to="/admin" className={linkClass}>
                Subir Excel
              </NavLink>
            )}
            {canManageUsers(profile) && (
              <NavLink to="/admin" className={linkClass}>
                Usuarios
              </NavLink>
            )}
            <NavLink to="/enlaces" className={linkClass}>
              Enlaces
            </NavLink>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400"
              disabled
              title="Próximamente"
            >
              Reportes
            </button>
          </nav>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="truncate text-sm font-medium text-slate-800" title={user?.email}>
              {user?.email}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
              Rol: {profile?.rol ?? '—'}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-slate-400">🔎</span>
                <input
                  type="text"
                  placeholder="Buscar SOT global..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <select className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700">
                  <option>Contratista</option>
                </select>
                <select className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700">
                  <option>Región</option>
                </select>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
                  title="Notificaciones"
                >
                  🔔
                </button>
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

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      {authDisabled && (
        <DemoProfileModal open={demoModal} onClose={() => setDemoModal(false)} />
      )}
    </div>
  );
}
