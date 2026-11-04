// lib/sanitize.js
// Utilidades contra inyección en filtros de Mongo y mass-assignment.

export const esObjectId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

/** Devuelve el id si es un ObjectId en string; si no, null (rechaza objetos tipo {"$ne":null}). */
export const idSeguro = (v) => (esObjectId(v) ? v : null);

/** Escapa un texto para usarlo literal dentro de una RegExp (evita inyección/ReDoS). */
export const escaparRegex = (texto) => String(texto ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Copia solo las claves permitidas. */
export function pick(obj, claves) {
  const out = {};
  for (const k of claves) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
}

/** String o null: descarta objetos/arrays que se colarían como operadores ($ne, $gt...). */
export const soloTexto = (v) => (typeof v === 'string' ? v : null);
