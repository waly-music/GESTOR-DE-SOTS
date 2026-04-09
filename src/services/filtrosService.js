import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const REF = doc(db, 'config', 'filtros');

/**
 * @param {Array<{region:string,departamento:string,distrito:string,contratista:string}>} rows
 */
export async function mergeFiltrosFromExcelRows(rows) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(REF);
    const regions = new Set(snap.exists() ? snap.data().regions ?? [] : []);
    const departamentos = new Set(
      snap.exists() ? snap.data().departamentos ?? [] : [],
    );
    const distritos = new Set(snap.exists() ? snap.data().distritos ?? [] : []);
    const contratistas = new Set(
      snap.exists() ? snap.data().contratistas ?? [] : [],
    );

    for (const r of rows) {
      if (r.region) regions.add(r.region.trim());
      if (r.departamento) departamentos.add(r.departamento.trim());
      if (r.distrito) distritos.add(r.distrito.trim());
      if (r.contratista) contratistas.add(r.contratista.trim());
    }

    tx.set(
      REF,
      {
        regions: [...regions].sort((a, b) => a.localeCompare(b)),
        departamentos: [...departamentos].sort((a, b) => a.localeCompare(b)),
        distritos: [...distritos].sort((a, b) => a.localeCompare(b)),
        contratistas: [...contratistas].sort((a, b) => a.localeCompare(b)),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function getFiltrosOptions() {
  const snap = await getDoc(REF);
  if (!snap.exists()) {
    return {
      regions: [],
      departamentos: [],
      distritos: [],
      contratistas: [],
    };
  }
  const d = snap.data();
  return {
    regions: d.regions ?? [],
    departamentos: d.departamentos ?? [],
    distritos: d.distritos ?? [],
    contratistas: d.contratistas ?? [],
  };
}
