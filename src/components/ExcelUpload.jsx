import { useRef, useState } from 'react';
import { parseExcelOrdenes } from '../utils/excelParser';
import { importExcelRows } from '../services/ordenesService';
import { Spinner } from './Spinner';

export function ExcelUpload({ onDone }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [progress, setProgress] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setMsg(null);
    setProgress(null);
    try {
      const buf = await file.arrayBuffer();
      const { rows, errors } = await parseExcelOrdenes(buf);
      if (errors.length) {
        setMsg({ type: 'err', text: errors.join(' ') });
        return;
      }
      if (!rows.length) {
        setMsg({ type: 'err', text: 'No hay filas válidas en el archivo.' });
        return;
      }

      const result = await importExcelRows(rows, (p) => setProgress(p));
      setMsg({
        type: 'ok',
        text: `Importación: ${result.created} nuevas, ${result.updated} actualizadas, ${result.skippedWithGestion} omitidas (ya tenían gestión).`,
      });
      onDone?.();
    } catch (err) {
      setMsg({ type: 'err', text: err.message ?? String(err) });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFile}
          disabled={busy}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Spinner className="h-4 w-4 border-white border-r-transparent" /> : null}
          Subir Excel
        </button>
        <p className="text-sm text-slate-600">
          Columnas: REGION, DEPARTAMENTO, DISTRITO, CONTRATISTA, SOT
        </p>
      </div>
      {progress && (
        <p className="mt-2 text-xs text-slate-500">
          Procesando… {progress.phase} ({progress.done}/{progress.total})
        </p>
      )}
      {msg && (
        <p
          className={`mt-2 text-sm ${
            msg.type === 'ok' ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
