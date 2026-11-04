// lib/especialidades.js
// Compara especialidades del técnico con el servicio de una cita (sin acentos ni mayúsculas).

export const normalizar = (t) =>
  String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** ¿Alguna especialidad coincide con el nombre o la categoría del servicio? Sin especialidades = todas. */
export function coincideEspecialidad(especialidades, servicio) {
  const lista = (especialidades || []).map(normalizar).filter(Boolean);
  if (lista.length === 0) return true;
  const campos = [normalizar(servicio?.nombre), normalizar(servicio?.categoria)].filter(Boolean);
  return lista.some(e => campos.some(c => c === e || c.includes(e) || e.includes(c)));
}
