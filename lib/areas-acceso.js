// lib/areas-acceso.js
import { perfilIdDe } from '@/lib/perfiles';

/** Admin, o el aperturador dueño de la zona. */
export async function puedeEditarArea(session, area) {
  if (!session) return false;
  if (session.role === 'admin') return true;
  if (session.role !== 'aperturador' || !area.aperturador) return false;
  const miId = await perfilIdDe(session);
  return !!miId && String(area.aperturador?._id || area.aperturador) === miId;
}

// Lo que se ve de una zona sin ser admin ni su aperturador (sin contratistas ni aperturador)
export const SELECT_AREA_PUBLICA = 'nombre clasificacion municipio estado tipo codigoPostal poligono activo';
