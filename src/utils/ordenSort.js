import { parseDilacionNumber } from './dilacionUi';
import { STATUS_AGENDA } from './statusAgenda';

const RANK = {
  [STATUS_AGENDA.VENCIDA]: 0,
  [STATUS_AGENDA.HOY]: 1,
  [STATUS_AGENDA.FUTURO]: 2,
  [STATUS_AGENDA.SIN_FECHA]: 3,
};

/**
 * @param {string|undefined|null} status
 * @returns {number}
 */
function agendaRank(status) {
  const s = status ?? '';
  if (Object.prototype.hasOwnProperty.call(RANK, s)) {
    return RANK[s];
  }
  return 4;
}

/**
 * Orden: vencida → hoy → futuro → sin fecha → resto.
 * Dentro de vencidos: mayor dilación primero (más urgente arriba).
 *
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
export function sortOrdenesByAgendaPriority(rows) {
  return [...rows].sort((a, b) => {
    const ra = agendaRank(/** @type {string} */ (a.status_agenda));
    const rb = agendaRank(/** @type {string} */ (b.status_agenda));
    if (ra !== rb) {
      return ra - rb;
    }
    if ((a.status_agenda ?? '') === STATUS_AGENDA.VENCIDA) {
      const da = parseDilacionNumber(a.dilacion);
      const db = parseDilacionNumber(b.dilacion);
      const na = da == null ? Number.NEGATIVE_INFINITY : da;
      const nb = db == null ? Number.NEGATIVE_INFINITY : db;
      if (nb !== na) {
        return nb - na;
      }
    }
    return String(a.sot ?? '').localeCompare(String(b.sot ?? ''), undefined, {
      numeric: true,
    });
  });
}
