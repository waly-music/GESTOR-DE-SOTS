import { ExcelUpload } from '../components/ExcelUpload';
import { SotBulkManagement } from '../components/SotBulkManagement';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../utils/roles';
import AdminUsers from './AdminUsers';

/**
 * Excel y mantenimiento: admin y supervisor (misma pantalla). Usuarios del sistema solo admin (reglas Firestore).
 */
export default function Administration() {
  const { profile } = useAuth();
  const admin = isAdmin(profile);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Administración</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Base de órdenes (Excel)
        </h2>
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
