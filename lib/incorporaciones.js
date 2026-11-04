// lib/incorporaciones.js
// La "incorporación" de un contratista se DERIVA de su estado y sus documentos (no se guarda aparte).
// Su _id es el _id del contratista.
import Contratista from '@/models/Contratista';
import { perfilIdDe } from '@/lib/perfiles';

export const TIPOS_DOCUMENTO = ['ine', 'curp', 'comprobante_domicilio', 'otro'];

// Datos escritos que el incorporador captura del contratista (los documentos son evidencia OPCIONAL)
export const DATOS_REQUERIDOS = ['nombre', 'email', 'telefono', 'curp', 'direccion', 'especialidad'];

const tieneValor = (v) => typeof v === 'string' ? v.trim().length > 0 : v != null;

/** {requeridos, presentes, faltantes} de los datos escritos de un contratista (doc o POJO). */
export function datosIncorporacion(contratista) {
  const presentes = DATOS_REQUERIDOS.filter(c => tieneValor(contratista?.[c]));
  return {
    requeridos: DATOS_REQUERIDOS,
    presentes,
    faltantes: DATOS_REQUERIDOS.filter(c => !presentes.includes(c))
  };
}

/**
 * rechazada · completada (aprobado) · en_proceso (datos completos, esperando aprobación) · pendiente (faltan datos).
 */
export function estadoIncorporacion(contratista) {
  if (contratista.estatus === 'rechazado') return 'rechazada';
  if (contratista.aprobado) return 'completada';
  return datosIncorporacion(contratista).faltantes.length === 0 ? 'en_proceso' : 'pendiente';
}

/** Contratista si el usuario puede gestionar su incorporación (incorporador dueño o admin); si no, null. */
export async function contratistaGestionable(session, contratistaId) {
  const contratista = await Contratista.findById(contratistaId)
    .select('nombre email telefono curp direccion especialidad incorporador aprobado estatus createdAt');
  if (!contratista) return null;
  if (session.role === 'admin') return contratista;
  const miId = await perfilIdDe(session);
  return miId && contratista.incorporador && String(contratista.incorporador) === miId ? contratista : null;
}
