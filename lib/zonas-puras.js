// lib/zonas-puras.js
// Parte pura (sin base de datos) de las zonas de un contratista; la validación con BD vive en zona-contratista.js.
export const MAX_ZONAS = 5;

/** Zonas pedidas en el body: `areasIds` (lista) o, por compatibilidad, `areaId` (una o null). undefined = no las mandó. */
export function zonasDeBody(body = {}) {
  if (body.areasIds !== undefined) return body.areasIds;
  if (body.areaId !== undefined) return body.areaId === null || body.areaId === '' ? [] : [body.areaId];
  return undefined;
}

/** Zonas de un contratista (doc/POJO) como lista de ids string; las cuentas antiguas solo traen `areaId`. */
export function zonasDe(contratista) {
  const lista = (contratista?.areasIds || []).map(a => String(a?._id || a));
  if (lista.length) return lista;
  const unica = contratista?.areaId?._id || contratista?.areaId;
  return unica ? [String(unica)] : [];
}
