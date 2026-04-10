export function MetricCards({ metrics, loading, onRefresh, dataHint }) {
  if (loading && !metrics) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  const items = [
    { label: 'Total SOTs', value: metrics?.total ?? 0, tone: 'slate' },
    {
      label: 'Pendientes',
      value: Math.max((metrics?.total ?? 0) - (metrics?.gestionadas ?? 0), 0),
      tone: 'amber',
    },
    {
      label: 'Confirmado hoy',
      value: metrics?.confirmadoHoy ?? 0,
      tone: 'emerald',
    },
    {
      label: 'Confirmado futuro',
      value: metrics?.confirmadoFuturo ?? 0,
      tone: 'teal',
    },
    { label: 'Rechazos', value: metrics?.rechazos ?? 0, tone: 'red' },
  ];

  const toneRing = {
    slate: 'ring-slate-200',
    amber: 'ring-amber-200',
    emerald: 'ring-emerald-200',
    teal: 'ring-green-200',
    red: 'ring-red-200',
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Actualizar métricas
        </button>
        {dataHint ? (
          <p className="max-w-xl text-right text-[11px] leading-snug text-slate-500">{dataHint}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((it) => (
          <div
            key={it.label}
            className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ${toneRing[it.tone]}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {it.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {it.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
