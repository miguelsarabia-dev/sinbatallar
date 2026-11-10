// lib/incorporaciones.js
// La "incorporación" de un contratista se DERIVA de su estado y sus documentos (no se guarda aparte).
// Su _id es el _id del contratista.
import Contratista from '@/models/Contratista';
import { perfilIdDe } from '@/lib/perfiles';

export const TIPOS_DOCUMENTO = ['ine', 'curp', 'comprobante_domicilio', 'otro'];

export { DATOS_REQUERIDOS, datosIncorporacion, estadoIncorporacion } from '@/lib/datos-incorporacion';

/** Contratista si el usuario puede gestionar su incorporación (incorporador dueño o admin); si no, null. */
export async function contratistaGestionable(session, contratistaId) {
  const contratista = await Contratista.findById(contratistaId)
    .select('nombre email telefono curp direccion especialidad areaId areasIds incorporador aprobado estatus createdAt');
  if (!contratista) return null;
  if (session.role === 'admin') return contratista;
  const miId = await perfilIdDe(session);
  return miId && contratista.incorporador && String(contratista.incorporador) === miId ? contratista : null;
}
