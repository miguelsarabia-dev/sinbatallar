// lib/incorporaciones.js
// La "incorporación" de un contratista se DERIVA de su estado y sus documentos (no se guarda aparte).
// Su _id es el _id del contratista.
import Contratista from '@/models/Contratista';
import { perfilIdDe } from '@/lib/perfiles';

export const TIPOS_DOCUMENTO = ['ine', 'curp', 'comprobante_domicilio', 'otro'];
export const DOCUMENTOS_REQUERIDOS = ['ine', 'curp', 'comprobante_domicilio'];

/**
 * pendiente: sin documentos aún · documentos_pendientes: faltan ine/curp/comprobante_domicilio ·
 * en_proceso: documentos completos, esperando aprobación · completada: aprobado · rechazada.
 */
export function estadoIncorporacion(contratista, tiposPresentes = []) {
  if (contratista.estatus === 'rechazado') return 'rechazada';
  if (contratista.aprobado) return 'completada';
  const completos = DOCUMENTOS_REQUERIDOS.every(t => tiposPresentes.includes(t));
  if (completos) return 'en_proceso';
  return tiposPresentes.length > 0 ? 'documentos_pendientes' : 'pendiente';
}

/** Contratista si el usuario puede gestionar su incorporación (incorporador dueño o admin); si no, null. */
export async function contratistaGestionable(session, contratistaId) {
  const contratista = await Contratista.findById(contratistaId).select('nombre email incorporador aprobado estatus createdAt');
  if (!contratista) return null;
  if (session.role === 'admin') return contratista;
  const miId = await perfilIdDe(session);
  return miId && contratista.incorporador && String(contratista.incorporador) === miId ? contratista : null;
}
