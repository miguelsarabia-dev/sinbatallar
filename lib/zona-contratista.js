// lib/zona-contratista.js
// Zonas de un contratista: las asigna el incorporador/admin (hasta 5) y el contratista solo las ve.
// `areasIds` es la lista; `areaId` se conserva como zona principal (la primera) por compatibilidad.
import Area from '@/models/Area';
import { esObjectId } from '@/lib/sanitize';
import { MAX_ZONAS, zonasDeBody, zonasDe } from '@/lib/zonas-puras';

export { MAX_ZONAS, zonasDeBody, zonasDe };

/**
 * Valida la lista: arreglo, sin repetidas, máximo 5, todas existentes y activas.
 * @returns {Promise<{ok:true, areasIds:string[], areaId:string|null}|{ok:false, status:number, error:string}>}
 */
export async function validarZonas(valor) {
  if (!Array.isArray(valor)) return { ok: false, status: 400, error: 'areasIds debe ser una lista' };
  if (valor.some(v => !esObjectId(v))) return { ok: false, status: 400, error: 'areasIds contiene un id no válido' };
  const ids = [...new Set(valor.map(String))];
  if (ids.length > MAX_ZONAS) {
    return { ok: false, status: 400, error: `Un contratista puede tener máximo ${MAX_ZONAS} zonas` };
  }
  if (ids.length) {
    const areas = await Area.find({ _id: { $in: ids } }).select('activo').lean();
    if (areas.length !== ids.length) return { ok: false, status: 404, error: 'Alguna zona no existe' };
    if (areas.some(a => a.activo === false)) return { ok: false, status: 400, error: 'Alguna zona no está activa' };
  }
  return { ok: true, areasIds: ids, areaId: ids[0] || null };
}

/** Mantiene `Area.contratistas` al día: quita al contratista de las zonas que ya no tiene y lo agrega a las nuevas. */
export async function sincronizarAreas(contratistaId, anteriores, nuevas) {
  const antes = new Set(anteriores.map(String));
  const ahora = new Set(nuevas.map(String));
  const quitar = [...antes].filter(a => !ahora.has(a));
  const agregar = [...ahora].filter(a => !antes.has(a));
  if (quitar.length) await Area.updateMany({ _id: { $in: quitar } }, { $pull: { contratistas: contratistaId } });
  if (agregar.length) await Area.updateMany({ _id: { $in: agregar } }, { $addToSet: { contratistas: contratistaId } });
}
