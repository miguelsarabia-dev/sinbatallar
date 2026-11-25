// lib/zona-contratista.js
// Zonas de un contratista: las asigna el asociado/admin (hasta 5) y el contratista solo las ve.
// `areasIds` es la lista; `areaId` se conserva como zona principal (la primera) por compatibilidad.
import Area from '@/models/Area';
import Tecnico from '@/models/Tecnico';
import Contratista from '@/models/Contratista';
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

/**
 * Al borrar una zona: se quita de los contratistas (areasIds y su zona principal areaId) y de la cobertura de los
 * técnicos. Si no, el contratista conserva un id que ya no existe y el asociado no puede guardarle zonas nuevas
 * (validarZonas rechaza la lista completa con "Alguna zona no existe").
 */
export async function quitarZonaDeTodos(areaId) {
  const afectados = await Contratista.find({ $or: [{ areasIds: areaId }, { areaId }] }).select('areasIds areaId');
  for (const c of afectados) {
    const restantes = (c.areasIds || []).filter(z => String(z) !== String(areaId));
    await Contratista.updateOne({ _id: c._id }, { $set: { areasIds: restantes, areaId: restantes[0] || null } });
  }
  await Tecnico.updateMany({ areasCobertura: areaId }, { $pull: { areasCobertura: areaId } });
  return afectados.length;
}

/** Mantiene `Area.contratistas` al día: quita al contratista de las zonas que ya no tiene y lo agrega a las nuevas. */
export async function sincronizarAreas(contratistaId, anteriores, nuevas) {
  const antes = new Set(anteriores.map(String));
  const ahora = new Set(nuevas.map(String));
  const quitar = [...antes].filter(a => !ahora.has(a));
  const agregar = [...ahora].filter(a => !antes.has(a));
  if (quitar.length) await Area.updateMany({ _id: { $in: quitar } }, { $pull: { contratistas: contratistaId } });
  if (agregar.length) {
    await Area.updateMany({ _id: { $in: agregar } }, { $addToSet: { contratistas: contratistaId } });
    // Sus técnicos cubren también las zonas nuevas (si no, no aparecerían al asignar citas de esa zona)
    await Tecnico.updateMany({ contratista: contratistaId }, { $addToSet: { areasCobertura: { $each: agregar } } });
  }
}
