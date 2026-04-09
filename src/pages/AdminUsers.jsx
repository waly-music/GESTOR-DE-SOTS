import { useEffect, useState } from 'react';
import { isAuthDisabled } from '../config/authMode';
import { listUsers, updateUserFields } from '../services/usersService';
import { createUserWithAuth } from '../services/userAdminService';
import { ROLES } from '../constants/gestion';
import { Spinner } from '../components/Spinner';

const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Admin' },
  { value: ROLES.SUPERVISOR, label: 'Supervisor' },
  { value: ROLES.ASESOR, label: 'Asesor' },
];

function createInitialForm() {
  return {
    email: '',
    password: '',
    displayName: '',
    rol: ROLES.ASESOR,
    contratista: '',
  };
}

/**
 * @param {{ embedded?: boolean }} props
 */
export default function AdminUsers({ embedded = false }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [saving, setSaving] = useState(null);
  const [createForm, setCreateForm] = useState(createInitialForm);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const list = await listUsers();
      setUsers(list);
    } catch (e) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveRow(u) {
    setSaving(u.id);
    setErr(null);
    setOk(null);
    try {
      await updateUserFields(u.id, {
        rol: u.rol,
        contratista: u.contratista?.trim() || null,
      });
      setOk('Cambios guardados.');
      await load();
    } catch (e) {
      setErr(e.message ?? String(e));
    } finally {
      setSaving(null);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const email = createForm.email.trim();
    const password = createForm.password;
    const displayName = createForm.displayName.trim();
    const rol = createForm.rol;
    const contratista = createForm.contratista.trim();

    if (!email || !password) {
      setErr('Indique correo y contraseña.');
      return;
    }
    if (password.length < 6) {
      setErr('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setCreating(true);
    try {
      await createUserWithAuth({
        email,
        password,
        displayName,
        rol,
        contratista:
          rol === ROLES.ADMIN ? null : contratista || null,
      });
      setOk(
        `Usuario creado en Authentication: ${email}. Ya puede iniciar sesión.`,
      );
      setCreateForm(createInitialForm());
      await load();
    } catch (e) {
      const code = e?.code ?? '';
      const msg = e?.message ?? String(e);
      setErr(mapCallableError(code, msg));
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
          <p className="text-slate-600">
            {isAuthDisabled() ? (
              <>
                Modo <strong>sin Authentication</strong>: use &quot;Perfil local&quot; en la
                cabecera para probar roles. Aquí solo edita documentos en Firestore.
              </>
            ) : (
              <>
                Cree cuentas en <strong>Firebase Authentication</strong> y el perfil
                en Firestore, o edite rol y contratista de usuarios existentes.
              </>
            )}
          </p>
        </div>
      )}

      {!isAuthDisabled() && (
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className={`font-medium text-slate-900 ${embedded ? 'text-base' : 'text-lg'}`}>
          Configurar perfil de usuario
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Complete los datos para crear una nueva cuenta de acceso.
        </p>
        <form
          onSubmit={handleCreate}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <Field
            label="Nombre"
            value={createForm.displayName}
            onChange={(v) =>
              setCreateForm((f) => ({ ...f, displayName: v }))
            }
          />
          <Field
            label="Correo"
            type="email"
            autoComplete="off"
            required
            value={createForm.email}
            onChange={(v) =>
              setCreateForm((f) => ({ ...f, email: v }))
            }
          />
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Rol
            </label>
            <select
              value={createForm.rol}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, rol: e.target.value }))
              }
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
              Contratista
            </label>
            <input
              value={createForm.contratista}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  contratista: e.target.value,
                }))
              }
              disabled={createForm.rol === ROLES.ADMIN}
              placeholder="Empresa / contratista"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={createForm.password}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, password: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {creating ? (
                <Spinner className="h-4 w-4 border-white border-r-transparent" />
              ) : null}
              {creating ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </form>
      </section>
      )}

      {ok && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {ok}
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Contratista</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                saving={saving === u.id}
                onChange={setUsers}
                onSave={saveRow}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', ...rest }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        {...rest}
      />
    </div>
  );
}

function UserRow({ user: u, saving, onChange, onSave }) {
  return (
    <tr>
      <td className="px-3 py-2 text-slate-800">{u.email}</td>
      <td className="px-3 py-2">
        <select
          value={u.rol ?? ROLES.ASESOR}
          onChange={(e) =>
            onChange((list) =>
              list.map((x) =>
                x.id === u.id ? { ...x, rol: e.target.value } : x,
              ),
            )
          }
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          value={u.contratista ?? ''}
          onChange={(e) =>
            onChange((list) =>
              list.map((x) =>
                x.id === u.id ? { ...x, contratista: e.target.value } : x,
              ),
            )
          }
          placeholder="Nombre contratista"
          className="w-full min-w-[10rem] rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(u)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? '…' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}

/**
 * @param {string} code
 * @param {string} message
 */
function mapCallableError(code, message) {
  if (code === 'functions/already-exists' || message.includes('already-exists')) {
    return 'Ese correo ya está registrado.';
  }
  if (
    code === 'functions/permission-denied' ||
    message.includes('permission-denied')
  ) {
    return 'No tiene permiso para crear usuarios (solo admin).';
  }
  if (
    code === 'functions/unauthenticated' ||
    message.includes('unauthenticated')
  ) {
    return 'Sesión no válida. Vuelva a iniciar sesión.';
  }
  if (
    code === 'functions/not-found' ||
    message.includes('NOT_FOUND') ||
    message.includes('no se encontró')
  ) {
    return 'No se pudo completar la acción. Contacte con el administrador.';
  }
  return 'No se pudo completar la acción. Intente nuevamente.';
}
