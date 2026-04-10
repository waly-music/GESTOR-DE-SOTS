/** @typedef {'RECHAZO'|'CONFIRMADO_FUTURO'|'CONFIRMADO_HOY'|'NO_CONTESTA'|'SIN_PLANTILLA_GEODIR'} TipoGestion */

export const TIPOS_GESTION = [
  { value: 'RECHAZO', label: 'Rechazo' },
  { value: 'CONFIRMADO_FUTURO', label: 'Confirmado futuro' },
  { value: 'CONFIRMADO_HOY', label: 'Confirmado hoy' },
  { value: 'NO_CONTESTA', label: 'No contesta' },
  { value: 'SIN_PLANTILLA_GEODIR', label: 'Sin plantilla Geodir' },
];

export const RANGOS_HORARIO = ['AM0', 'AM1', 'AM2', 'PM1', 'PM2', 'PM3'];

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  ASESOR: 'asesor',
};

/**
 * Valor de `users.contratista` asignable solo por admin: el usuario ve y opera
 * sobre todos los contratistas (misma amplitud que admin en datos).
 */
export const CONTRATISTA_TODOS = '__TODOS__';
