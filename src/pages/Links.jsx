import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isAdmin, isSupervisor } from '../utils/roles';
import { createLink, editLink, listLinks, removeLink } from '../services/linksService';

function initialForm() {
  return { nombre: '', url: '', descripcion: '', categoria: '' };
}

export default function Links() {
  const { profile } = useAuth();
  const canEdit = isAdmin(profile) || isSupervisor(profile);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listLinks();
      setRows(data);
    } catch {
      setErr('No se pudo cargar enlaces.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setErr(null);
    try {
      if (editingId) await editLink(editingId, form);
      else await createLink(form);
      setForm(initialForm());
      setEditingId(null);
      await load();
    } catch {
      setErr('No se pudo guardar el enlace.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Enlaces</h1>
        <p className="mt-1 text-slate-600">Accesos útiles para la operación.</p>
      </div>

      {canEdit && (
        <form
          onSubmit={submit}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2"
        >
          <Field label="Nombre" value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))} required />
          <Field label="URL" value={form.url} onChange={(v) => setForm((f) => ({ ...f, url: v }))} required />
          <Field label="Descripción" value={form.descripcion} onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))} />
          <Field label="Categoría" value={form.categoria} onChange={(v) => setForm((f) => ({ ...f, categoria: v }))} />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Categoría</th>
              {canEdit && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-3 py-6 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-3 py-6 text-center text-slate-500">
                  No hay enlaces registrados.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-700 underline hover:text-brand-800"
                    >
                      {r.nombre}
                    </a>
                  </td>
                  <td className="max-w-[320px] truncate px-3 py-2 text-slate-600">{r.url}</td>
                  <td className="px-3 py-2 text-slate-700">{r.descripcion || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{r.categoria || '—'}</td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
                        onClick={() => {
                          setEditingId(r.id);
                          setForm({
                            nombre: r.nombre ?? '',
                            url: r.url ?? '',
                            descripcion: r.descripcion ?? '',
                            categoria: r.categoria ?? '',
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-red-600 px-2 py-1 text-xs text-white"
                        onClick={async () => {
                          await removeLink(r.id);
                          await load();
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600">{label}</label>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
