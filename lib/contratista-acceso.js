// lib/contratista-acceso.js
// Quién puede ver/editar un Contratista y qué campos (evita mass-assignment de activo/estatus/incorporador).
import Incorporador from '@/models/Incorporador';
import { perfilIdDe } from '@/lib/perfiles';

// Perfil que edita el propio contratista
export const CAMPOS_PROPIOS = ['nombre', 'telefono', 'direccion', 'especialidad', 'notas', 'servicios', 'ubicacion', 'areaId', 'password'];
// Lo que decide el incorporador dueño (aceptar/suspender a sus contratistas)
export const CAMPOS_INCORPORADOR = ['activo', 'estatus', 'notas'];
// Solo admin
export const CAMPOS_ADMIN = [...CAMPOS_PROPIOS, 'email', 'curp', 'activo', 'estatus', 'incorporador', 'informacionPago'];

// Datos que ve cualquier usuario autenticado de un contratista ajeno
export const SELECT_PUBLICO = 'nombre promedioCalificacion totalCalificaciones servicios';

/** @returns {Promise<'admin'|'self'|'incorporador'|null>} relación del usuario con el contratista */
export async function relacionCon(session, contratista) {
  if (session.role === 'admin') return 'admin';
  if (session.role === 'contratista' && String(contratista._id) === session.id) return 'self';
  if (session.role === 'incorporador') {
    const incId = await perfilIdDe(session);
    if (incId && contratista.incorporador && String(contratista.incorporador) === incId) return 'incorporador';
  }
  return null;
}

export const camposPara = (relacion) =>
  relacion === 'admin' ? CAMPOS_ADMIN : relacion === 'self' ? CAMPOS_PROPIOS : relacion === 'incorporador' ? CAMPOS_INCORPORADOR : [];

export async function incorporadorDe(session) {
  if (session.role !== 'incorporador') return null;
  const doc = await Incorporador.findOne({ user: session.id }).select('_id');
  return doc?._id || null;
}
