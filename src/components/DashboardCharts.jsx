import { toSafeDate } from '../utils/gestionColors';

function formatDayLabel(date) {
  return date.toLocaleDateString('es-PE', { weekday: 'short' });
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Fecha de la gestión: timestamp en documento o respaldo desde actualizadoEn (p. ej. caché JSON). */
function rowGestionInstant(row) {
  const fromGestion = toSafeDate(row?.gestion?.timestamp);
  if (fromGestion) return fromGestion;
  return toSafeDate(row?.gestionadoPor?.actualizadoEn);
}

function buildLast7Days(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({ date: d, label: formatDayLabel(d), value: 0 });
  }

  for (const row of rows) {
    const d = rowGestionInstant(row);
    if (!d) continue;
    for (const b of buckets) {
      if (sameDay(d, b.date)) {
        b.value += 1;
        break;
      }
    }
  }
  return buckets;
}

export function DashboardCharts({ rows = [], metrics }) {
  const byDay = buildLast7Days(rows);
  const totalBars = byDay.reduce((acc, b) => acc + b.value, 0);
  const max = Math.max(...byDay.map((b) => b.value), 1);

  const pie = [
    { label: 'Confirmado hoy', value: metrics?.confirmadoHoy ?? 0, color: 'bg-emerald-500' },
    { label: 'Confirmado futuro', value: metrics?.confirmadoFuturo ?? 0, color: 'bg-green-500' },
    { label: 'Rechazo', value: metrics?.rechazos ?? 0, color: 'bg-red-500' },
    {
      label: 'Pendiente / sin gestión',
      value: Math.max((metrics?.total ?? 0) - (metrics?.gestionadas ?? 0), 0),
      color: 'bg-amber-500',
    },
  ];
  const pieTotal = pie.reduce((acc, x) => acc + x.value, 0);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h3 className="text-sm font-semibold text-slate-900">Gestiones por día</h3>
        <p className="mt-1 text-xs text-slate-500">
          Tendencia de los últimos 7 días (tickets gestionados en el conjunto filtrado cargado).
        </p>
        {totalBars === 0 ? (
          <div className="mt-4 flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
            <p className="text-sm font-medium text-slate-700">Sin gestiones en esta ventana</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              No hay tickets con fecha de gestión en los últimos 7 días dentro de los datos mostrados
              (muestra acotada y filtros activos). Las gestiones antiguas o fuera del rango no aparecen
              aquí.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex h-44 items-end justify-between gap-2 rounded-xl bg-slate-50 p-3">
            {byDay.map((b) => (
              <div key={b.label} className="flex w-full flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-brand-500 transition-all"
                  style={{
                    height: `${b.value === 0 ? 0 : Math.max((b.value / max) * 100, 4)}%`,
                    minHeight: b.value === 0 ? 0 : undefined,
                  }}
                  title={`${b.value} gestión${b.value === 1 ? '' : 'es'}`}
                />
                <span className="text-[11px] uppercase text-slate-500">{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Distribución gestión</h3>
        <p className="mt-1 text-xs text-slate-500">Composición global por tipo.</p>
        <div className="mt-4 space-y-3">
          {pie.map((p) => {
            const pct = pieTotal > 0 ? Math.round((p.value / pieTotal) * 100) : 0;
            return (
              <div key={p.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>{p.label}</span>
                  <span>{p.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className={`h-2.5 rounded-full ${p.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
