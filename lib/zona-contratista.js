// lib/zona-contratista.js
// Validación (con base de datos) de la zona que el incorporador/admin asigna a un contratista.
import Area from '@/models/Area';
import { esObjectId } from '@/lib/sanitize';

/**
 * @param areaId valor recibido; ''/null = quitar la zona
 * @returns {Promise<{ok:true, areaId:string|null}|{ok:false, status:number, error:string}>}
 */
export async function validarZona(areaId) {
  if (areaId === null || areaId === '') return { ok: true, areaId: null };
  if (!esObjectId(areaId)) return { ok: false, status: 400, error: 'areaId no válido' };
  const area = await Area.findById(areaId).select('activo').lean();
  if (!area) return { ok: false, status: 404, error: 'La zona no existe' };
  if (area.activo === false) return { ok: false, status: 400, error: 'La zona no está activa' };
  return { ok: true, areaId: String(area._id) };
}
