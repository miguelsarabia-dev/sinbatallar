// lib/cotizador-db.js
// Parte con BD del cotizador por especialidad (las reglas puras están en lib/cotizador.js).
// El admin autoriza tarifas y mínimos en Configuracion 'cotizador' ({ ajustes: { [SB-xxxx]: { tarifa, minimo, activo } } }).
import Configuracion from '@/models/Configuracion';
import { armarDesglose, catalogoEfectivo, normalizarAjustes, VERSION_CATALOGO } from '@/lib/cotizador';

export const CLAVE_COTIZADOR = 'cotizador';

export async function getAjustesCotizador() {
  try {
    const doc = await Configuracion.findOne({ clave: CLAVE_COTIZADOR }).lean();
    return normalizarAjustes(doc?.valor?.ajustes || {});
  } catch (error) {
    console.error('Error leyendo los ajustes del cotizador, usando el catálogo base:', error);
    return {};
  }
}

export async function getCatalogoCotizador() {
  return catalogoEfectivo(await getAjustesCotizador());
}

/** Guarda los ajustes del admin (lanza Error si son inválidos). Aplica a cotizaciones NUEVAS. */
export async function setAjustesCotizador(ajustes, userId) {
  const normalizados = normalizarAjustes(ajustes);
  await Configuracion.findOneAndUpdate(
    { clave: CLAVE_COTIZADOR },
    { $set: { valor: { ajustes: normalizados }, actualizadoPor: userId || undefined } },
    { upsert: true }
  );
  return normalizados;
}

/**
 * Mano de obra de una cotización a partir del body.
 *   body.desglose = [{ conceptoId, cantidad, factor?, justificacion?, nota? }] → se calcula con el catálogo
 *   body.desglose = [] o null                                                → se quita el desglose (mano de obra a mano)
 *   sin body.desglose                                                        → no cambia nada (rutas antiguas / app instalada)
 * @returns {Promise<{ok:true, cambios:object|null}|{ok:false, error:string}>}
 *          cambios: { manoDeObra, desgloseManoObra, versionCotizador } para aplicar a la cotización
 */
export async function manoDeObraDesdeBody(body) {
  if (!body) return { ok: true, cambios: null };
  if (body.desglose === undefined) {
    return { ok: true, cambios: body.manoDeObra !== undefined ? { desgloseManoObra: [], versionCotizador: null } : null };
  }
  if (body.desglose === null || (Array.isArray(body.desglose) && body.desglose.length === 0)) {
    return { ok: true, cambios: { desgloseManoObra: [], versionCotizador: null } };
  }
  const r = armarDesglose(body.desglose, await getCatalogoCotizador());
  if (!r.ok) return r;
  return { ok: true, cambios: { manoDeObra: r.manoDeObra, desgloseManoObra: r.conceptos, versionCotizador: VERSION_CATALOGO } };
}

/** Aplica a un documento Cotizacion los cambios de manoDeObraDesdeBody (no guarda). */
export function aplicarDesglose(cotizacion, cambios) {
  if (!cambios) return;
  if (cambios.manoDeObra !== undefined) cotizacion.manoDeObra = cambios.manoDeObra;
  cotizacion.desgloseManoObra = cambios.desgloseManoObra;
  cotizacion.versionCotizador = cambios.versionCotizador;
}
