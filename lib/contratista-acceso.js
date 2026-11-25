// lib/contratista-acceso.js
// Quién puede ver/editar un Contratista y qué campos (evita mass-assignment de activo/estatus/asociado).
import Asociado from '@/models/Asociado';
import { perfilIdDe } from '@/lib/perfiles';
import { datosIncorporacion } from '@/lib/incorporaciones';

export { CAMPOS_PROPIOS, CAMPOS_ASOCIADO, CAMPOS_ADMIN } from '@/lib/campos-contratista';
import { CAMPOS_PROPIOS, CAMPOS_ASOCIADO, CAMPOS_ADMIN } from '@/lib/campos-contratista';

// Datos que ve cualquier usuario autenticado de un contratista ajeno
export const SELECT_PUBLICO = 'nombre promedioCalificacion totalCalificaciones servicios aprobado activo';

/** @returns {Promise<'admin'|'self'|'asociado'|null>} relación del usuario con el contratista */
export async function relacionCon(session, contratista) {
  if (session.role === 'admin') return 'admin';
  if (session.role === 'contratista' && String(contratista._id) === session.id) return 'self';
  if (session.role === 'asociado') {
    const incId = await perfilIdDe(session);
    if (incId && contratista.asociado && String(contratista.asociado) === incId) return 'asociado';
  }
  return null;
}

export const camposPara = (relacion) =>
  relacion === 'admin' ? CAMPOS_ADMIN : relacion === 'self' ? CAMPOS_PROPIOS : relacion === 'asociado' ? CAMPOS_ASOCIADO : [];

export async function asociadoDe(session) {
  if (session.role !== 'asociado') return null;
  return (await perfilIdDe(session)) || null;
}

/**
 * Reglas de negocio de aprobado / disponibilidad sobre los campos ya filtrados por rol.
 *  - aprobado: solo admin o su asociado (ya limitado por CAMPOS_*). Al aprobar queda disponible y
 *    estatus 'activo'; al revocar deja de estar disponible.
 *  - activo (disponibilidad): lo cambia el propio contratista SOLO si está aprobado; pausarlo registra
 *    inactivoDesde (la reactivación automática a las 48 h la hace lib/mongoose.js).
 * @returns {{error?: {status:number, message:string}, data: object}}
 */
export function aplicarReglasAprobacion(relacion, actual, data) {
  if (data.aprobado !== undefined) {
    if (typeof data.aprobado !== 'boolean') return { error: { status: 400, message: 'aprobado debe ser true o false' }, data };
    if (data.aprobado) {
      // Solo se aprueba con todos los datos escritos requeridos, zona incluida (los actuales + los que llegan en esta
      // misma petición). A un contratista ya aprobado no se le exige retroactivamente.
      const { faltantes } = datosIncorporacion({ ...(actual.toObject ? actual.toObject() : actual), ...data });
      if (!actual.aprobado && faltantes.length > 0) {
        return { error: { status: 400, message: 'Faltan datos requeridos para aprobar al contratista', faltantes }, data };
      }
      data.activo = true;
      data.inactivoDesde = null;
      if (data.estatus === undefined) data.estatus = 'activo';
    } else {
      data.activo = false;
      data.inactivoDesde = null;
    }
  }

  if (data.activo !== undefined && data.aprobado === undefined) {
    if (typeof data.activo !== 'boolean') return { error: { status: 400, message: 'activo debe ser true o false' }, data };
    if (!actual.aprobado) {
      return { error: { status: 403, message: 'Tu cuenta aún está en revisión; no puedes cambiar tu disponibilidad' }, data };
    }
    data.inactivoDesde = data.activo ? null : new Date();
  }
  return { data };
}
