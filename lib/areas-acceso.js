// lib/areas-acceso.js
import { perfilIdDe } from '@/lib/perfiles';
import { aperturadorCoincide } from '@/lib/areas-propiedad';

/** Admin, o el aperturador dueño de la zona. */
export async function puedeEditarArea(session, area) {
  if (!session) return false;
  if (session.role === 'admin') return true;
  if (session.role !== 'aperturador' || !area.aperturador) return false;
  const miId = await perfilIdDe(session);
  // Zonas antiguas pueden tener el id del usuario en lugar del id del perfil
  return aperturadorCoincide(area.aperturador, miId, session.id);
}

// Lo que se ve de una zona sin ser admin ni su aperturador (sin contratistas ni aperturador)
export const SELECT_AREA_PUBLICA = 'nombre clasificacion municipio estado tipo codigoPostal poligono activo';

/**
 * Como puedeEditarArea, pero con el motivo cuando se niega, para que la app diga qué pasó:
 *  - zona sin aperturador asignado (nadie salvo un admin puede gestionarla)
 *  - zona de otro aperturador
 * @returns {Promise<{ok:true}|{ok:false, status:403, error:string}>}
 */
export async function verificarAccesoArea(session, area) {
  if (await puedeEditarArea(session, area)) return { ok: true };
  if (!area.aperturador) {
    return { ok: false, status: 403, error: 'Esta zona no tiene aperturador asignado; pide a un administrador que la asigne' };
  }
  return { ok: false, status: 403, error: 'Esta zona pertenece a otro aperturador' };
}
