/** Máx. filas exportadas por defecto (lecturas ≈ filas en bloques de 500). */
export const EXPORT_MAX_ROWS_DEFAULT = 3000;

/**
 * Muestra de `sots` para combos del dashboard (menor que 1000 para reducir lecturas).
 * Debe cubrir variedad de región/depto/distrito; `config/filtros` sigue siendo la fuente principal.
 */
export const FILTROS_SEED_SAMPLE = 400;

/** Usuarios listados en administración (evita leer colección completa). */
export const USERS_LIST_MAX = 500;

/** Consultas `in` paralelas en importación Excel (trozos de 30 IDs). */
export const IMPORT_READ_CONCURRENCY = 8;
