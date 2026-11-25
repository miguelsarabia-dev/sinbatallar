// Alta de cuentas por el ADMIN (puro, sin BD): cualquier rol, con la relación que ese rol necesita.
// La parte con BD está en app/api/admin/cuentas/route.js.
import { validarAltaCuenta } from './inicial-cuentas.js';

/**
 * Roles que el admin puede crear y qué necesita cada uno además de nombre, email, teléfono y contraseña.
 * requiere: id obligatorio de otra cuenta. opcional: id opcional. negocio: nombre de la ferretería.
 */
export const ROLES_ALTA_ADMIN = [
  { rol: 'cliente', etiqueta: 'Cliente' },
  { rol: 'admin', etiqueta: 'Administrador' },
  { rol: 'aperturador', etiqueta: 'Aperturador' },
  { rol: 'asociado', etiqueta: 'Asociado' },
  { rol: 'contratista', etiqueta: 'Contratista', opcional: 'asociadoId' },
  { rol: 'tecnico', etiqueta: 'Técnico', requiere: 'contratistaId' },
  { rol: 'ferretero', etiqueta: 'Ferretería', negocio: true },
  { rol: 'especialista', etiqueta: 'Especialista', opcional: 'asociadoId' },
  { rol: 'aspirante', etiqueta: 'Aspirante', requiere: 'especialistaId' },
];

const ROL = Object.fromEntries(ROLES_ALTA_ADMIN.map(r => [r.rol, r]));
const ES_ID = /^[0-9a-fA-F]{24}$/;
const ETIQUETA_RELACION = { contratistaId: 'el contratista', especialistaId: 'el especialista', asociadoId: 'el asociado' };

/**
 * @returns {{ok:true, rol:string, datos:{nombre,email,telefono,password}, relacion:{campo:string,id:string}|null, nombreNegocio?:string}
 *          |{ok:false, error:string}}
 */
export function validarAltaAdmin(body = {}) {
  const def = ROL[body.rol];
  if (!def) return { ok: false, error: 'Rol no válido' };

  const cuenta = validarAltaCuenta(body);
  if (!cuenta.ok) return cuenta;
  if (!/^\d{10}$/.test(cuenta.datos.telefono)) return { ok: false, error: 'El teléfono debe tener 10 dígitos' };

  let relacion = null;
  const campo = def.requiere || def.opcional;
  if (campo) {
    const id = body[campo];
    if (id !== undefined && id !== null && id !== '') {
      if (typeof id !== 'string' || !ES_ID.test(id)) return { ok: false, error: `Elige ${ETIQUETA_RELACION[campo]}` };
      relacion = { campo, id };
    } else if (def.requiere) {
      return { ok: false, error: `Elige ${ETIQUETA_RELACION[campo]}` };
    }
  }

  const res = { ok: true, rol: def.rol, datos: cuenta.datos, relacion };
  if (def.negocio) {
    const negocio = typeof body.nombreNegocio === 'string' ? body.nombreNegocio.trim() : '';
    res.nombreNegocio = negocio || cuenta.datos.nombre;
  }
  return res;
}
