import { ExcelUpload } from '../components/ExcelUpload';
import { SotBulkManagement } from '../components/SotBulkManagement';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../utils/roles';
import AdminUsers from './AdminUsers';

/**
 * Excel para admin y supervisor; usuarios del sistema solo para admin.
 */
export default function Administration() {
  const { profile } = useAuth();
  const admin = isAdmin(profile);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Administración</h1>
        <p className="mt-1 text-slate-600">
          {admin
            ? 'Importe el Excel con la base de órdenes y gestione las cuentas de usuario (Authentication + Firestore).'
            : 'Importe el Excel con la base de órdenes. La gestión de usuarios la realiza un administrador.'}
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

      <SotBulkManagement />

      {admin && (
        <section className="border-t border-slate-200 pt-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">
            Usuarios del sistema
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            Cree cuentas con correo y contraseña, o edite rol y contratista.
          </p>
          <AdminUsers embedded />
        </section>
      )}
    </div>
  );
}
