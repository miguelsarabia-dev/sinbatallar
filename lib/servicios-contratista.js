// lib/servicios-contratista.js
// Servicios que ofrece un contratista: los asigna el incorporador (o el admin) al darlo de alta; el contratista no los edita.
import Servicio from '@/models/Servicio';
import { esObjectId } from '@/lib/sanitize';

/**
 * Valida la lista de ids: arreglo con al menos uno, sin repetidos, todos existentes y activos.
 * @returns {Promise<{ok:true, servicios:string[], nombres:string[]}|{ok:false, status:number, error:string}>}
 */
export async function validarServicios(valor) {
  if (!Array.isArray(valor)) return { ok: false, status: 400, error: 'servicios debe ser una lista' };
  if (valor.some(v => !esObjectId(v))) return { ok: false, status: 400, error: 'servicios contiene un id no válido' };
  const ids = [...new Set(valor.map(String))];
  if (ids.length === 0) return { ok: false, status: 400, error: 'Elige al menos un servicio' };
  const docs = await Servicio.find({ _id: { $in: ids } }).select('nombre activo').lean();
  if (docs.length !== ids.length) return { ok: false, status: 404, error: 'Algún servicio no existe' };
  if (docs.some(s => s.activo === false)) return { ok: false, status: 400, error: 'Algún servicio no está activo' };
  const porId = Object.fromEntries(docs.map(s => [String(s._id), s.nombre]));
  return { ok: true, servicios: ids, nombres: ids.map(id => porId[id]) };
}
