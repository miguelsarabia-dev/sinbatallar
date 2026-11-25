// lib/precios-referencia.js
// Precio de MANO DE OBRA de referencia por especialidad (puro). Fuente: hojas PARAMETROS y ESPECIALIDADES_14 de los
// libros oficiales 2026 (iguales en el modelo inicial y el permanente). Es la base provisional de la cotización hasta
// que llegue la calculadora definitiva: NO son tarifas autorizadas.
//
//   ticket 2026  = ticket 2018 × factor de inflación
//   factor       = 1 + (INPC actual / INPC 2018 − 1) × fracción aplicada (50%)
//   MO estimada  = ticket 2026 × porción de mano de obra (60%, hipótesis)
//   MO elegida   = si hay precio web comparable: MO estimada × (1 − peso web) + web × peso web; si no, MO estimada
//
// Los tickets 2018 pueden incluir materiales: por eso la MO es solo una porción.

export const PARAMETROS_PRECIO = Object.freeze({
  INPC_BASE: 103.02,          // dic 2018
  INPC_ACTUAL: 146.075,       // sep 2026 (pendiente de contraste con fuente oficial)
  FRACCION_INPC: 0.5,         // se aplica 50% del incremento acumulado
  PORCION_MANO_OBRA: 0.6,     // hipótesis: 60% del ticket es mano de obra
  PESO_PRECIO_WEB: 0.5        // solo si hay referencia web comparable
});

/** 14 especialidades del estudio 2018: frecuencia relativa y ticket total promedio (MXN de 2018). */
export const ESPECIALIDADES_REFERENCIA = Object.freeze([
  { nombre: 'Pintura exterior', frecuencia: 0.102, ticket2018: 5740 },
  { nombre: 'Pintura interior', frecuencia: 0.094, ticket2018: 4570 },
  { nombre: 'Cantera', frecuencia: 0.012, ticket2018: 15333 },
  { nombre: 'Carpintería', frecuencia: 0.041, ticket2018: 9800 },
  { nombre: 'Cristales', frecuencia: 0.061, ticket2018: 3634 },
  { nombre: 'Fontanería', frecuencia: 0.099, ticket2018: 1400 },
  { nombre: 'Colocación de pisos', frecuencia: 0.044, ticket2018: 10400 },
  { nombre: 'Electricidad', frecuencia: 0.082, ticket2018: 3500 },
  { nombre: 'Herrería', frecuencia: 0.082, ticket2018: 6184 },
  { nombre: 'Albañilería menor', frecuencia: 0.067, ticket2018: 4500 },
  { nombre: 'Plafones', frecuencia: 0.032, ticket2018: 16157 },
  { nombre: 'Aires: mantenimiento', frecuencia: 0.164, ticket2018: 1500 },
  { nombre: 'Aires: reparación/instalación', frecuencia: 0.044, ticket2018: 4550 },
  { nombre: 'Impermeabilización', frecuencia: 0.085, ticket2018: 6265 }
]);

export function factorInflacion(p = PARAMETROS_PRECIO) {
  return 1 + (p.INPC_ACTUAL / p.INPC_BASE - 1) * p.FRACCION_INPC;
}

/**
 * MO de referencia de una especialidad.
 * @param {{ticket2018:number, precioWeb?:number}} esp
 * @returns {{ticketAjustado:number, moEstimada:number, mo:number, estado:string}}
 */
export function moReferencia(esp, p = PARAMETROS_PRECIO) {
  const ticketAjustado = esp.ticket2018 * factorInflacion(p);
  const moEstimada = ticketAjustado * p.PORCION_MANO_OBRA;
  const web = Number(esp.precioWeb) > 0 ? Number(esp.precioWeb) : 0;
  const mo = web ? moEstimada * (1 - p.PESO_PRECIO_WEB) + web * p.PESO_PRECIO_WEB : moEstimada;
  return { ticketAjustado, moEstimada, mo, estado: web ? 'Ponderado estudio/web' : 'Estimación histórica únicamente' };
}

/** MO promedio ponderada por frecuencia normalizada (TABLERO!B3 del Excel). */
export function moPromedioPonderada(especialidades = ESPECIALIDADES_REFERENCIA, p = PARAMETROS_PRECIO) {
  const total = especialidades.reduce((s, e) => s + e.frecuencia, 0);
  return especialidades.reduce((s, e) => s + (e.frecuencia / total) * moReferencia(e, p).mo, 0);
}

/** Busca una especialidad de referencia por nombre (sin acentos ni mayúsculas). */
export function especialidadPorNombre(nombre) {
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return ESPECIALIDADES_REFERENCIA.find(e => norm(e.nombre) === norm(nombre)) || null;
}
