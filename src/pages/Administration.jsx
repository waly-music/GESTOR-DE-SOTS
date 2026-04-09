import { ExcelUpload } from '../components/ExcelUpload';
import AdminUsers from './AdminUsers';

/**
 * Panel único para administradores: importar Excel base y crear/editar usuarios.
 */
export default function Administration() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Administración</h1>
        <p className="mt-1 text-slate-600">
          Importe el archivo Excel con la base de órdenes y gestione las cuentas de
          usuario (Firebase Authentication + perfiles en Firestore).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Base de órdenes (Excel)
        </h2>
        <p className="text-sm text-slate-600">
          Use <strong>Cargar Excel</strong> para elegir el archivo; verá una vista previa
          antes de guardar en la colección <code className="rounded bg-slate-100 px-1">sots</code>.
          Columnas: SOT, Región, Departamento, Distrito, Contratista; opcionalmente
          Gestión/Estado. Los datos nuevos se insertan; sin gestión previa en el sistema
          se actualizan; si ya hay gestión registrada en la app, la fila no se
          sobrescribe.
        </p>
        <ExcelUpload onDone={() => {}} />
      </section>

      <section className="border-t border-slate-200 pt-8">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Usuarios del sistema
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Cree cuentas con correo y contraseña (requiere Cloud Function{' '}
          <code className="rounded bg-slate-100 px-1">createUserWithProfile</code>{' '}
          desplegada) o edite rol y contratista.
        </p>
        <AdminUsers embedded />
      </section>
    </div>
  );
}
