import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/gestion';
import { getDemoProfile } from '../services/demoProfile';

const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Admin' },
  { value: ROLES.SUPERVISOR, label: 'Supervisor' },
  { value: ROLES.ASESOR, label: 'Asesor' },
];

export function DemoProfileModal({ open, onClose }) {
  const { updateDemoProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState(ROLES.ADMIN);
  const [contratista, setContratista] = useState('');

  useEffect(() => {
    if (!open) return;
    const p = getDemoProfile();
    setEmail(p.email);
    setDisplayName(p.displayName);
    setRole(p.role);
    setContratista(p.contratista ?? '');
  }, [open]);

  function handleSubmit(e) {
    e.preventDefault();
    updateDemoProfile({
      email: email.trim() || 'demo@local',
      displayName: displayName.trim(),
      role,
      contratista:
        role === ROLES.ADMIN ? '' : contratista.trim(),
    });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Perfil local (sin login)
            </h2>
            <p className="text-sm text-slate-600">
              Se guarda en este navegador. Use para probar roles y contratista.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Correo (solo etiqueta)
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Nombre visible
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Rol
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Contratista (supervisor / asesor)
            </label>
            <input
              value={contratista}
              onChange={(e) => setContratista(e.target.value)}
              disabled={role === ROLES.ADMIN}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              placeholder="Igual que en Excel"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
