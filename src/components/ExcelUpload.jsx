import { useRef, useState } from 'react';
import { parseExcelOrdenesInWorker } from '../utils/excelParser';
import { importExcelRows } from '../services/ordenesService';
import { ExcelPreviewModal } from './ExcelPreviewModal';
import { Spinner } from './Spinner';

export function ExcelUpload({ onDone }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [progress, setProgress] = useState(null);
  const [previewRows, setPreviewRows] = useState(null);
  const [parseErrors, setParseErrors] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setMsg(null);
    setProgress(null);
    setPreviewRows(null);
    setParseErrors(null);
    try {
      const buf = await file.arrayBuffer();
      const { rows, errors } = await parseExcelOrdenesInWorker(buf);
      if (errors.length) {
        setParseErrors(errors.join(' '));
        return;
      }
      if (!rows.length) {
        setMsg({ type: 'err', text: 'No hay filas válidas en el archivo.' });
        return;
      }
      setPreviewRows(rows);
    } catch (err) {
      setMsg({ type: 'err', text: err.message ?? String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!previewRows?.length) return;
    setBusy(true);
    setMsg(null);
    setProgress(null);
    try {
      const result = await importExcelRows(previewRows, (p) => setProgress(p));
      setPreviewRows(null);
      setMsg({
        type: 'ok',
        text: `Éxito: se cargaron ${result.totalCargados} registro(s) en Firestore (colección «sots»): ${result.created} nuevos, ${result.updated} actualizados, ${result.skippedWithGestion} omitidos (ya tenían gestión) y ${result.skippedInvalid} inválidos.`,
      });
      onDone?.();
    } catch (err) {
      setMsg({ type: 'err', text: err.message ?? String(err) });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  function cancelPreview() {
    setPreviewRows(null);
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
          {busy && !previewRows ? (
            <Spinner className="h-4 w-4 border-white border-r-transparent" />
          ) : null}
          Cargar archivo
        </button>
        <p className="text-sm text-slate-600">
          Columnas: SOT, Región, Departamento, Distrito, Contratista y opcionalmente
          Gestión / Estado. Se aceptan archivos .csv, .xlsx o .xls.
        </p>
      </div>
      {parseErrors && (
        <p className="mt-2 text-sm text-red-700">{parseErrors}</p>
      )}
      {progress && (
        <p className="mt-2 text-xs text-slate-500">
          Procesando {progress.done} de {progress.total} filas... ({progress.phase})
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

      <ExcelPreviewModal
        open={Boolean(previewRows?.length)}
        rows={previewRows ?? []}
        busy={busy}
        onCancel={cancelPreview}
        onConfirm={confirmImport}
      />
    </div>
  );
}
