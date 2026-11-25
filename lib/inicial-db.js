// lib/inicial-db.js
// Parte con base de datos de las cuentas del modelo inicial (las reglas puras están en lib/inicial-cuentas.js).
import User from '@/models/User';
import Especialista from '@/models/Especialista';
import Aspirante from '@/models/Aspirante';
import { hashPassword } from '@/lib/auth';
import { perfilIdDe } from '@/lib/perfiles';

/** Campos de User que se muestran junto al perfil (nunca el password). */
export const SELECT_USER_PUBLICO = 'nombre email telefono fotoUrl suspendido';

/**
 * Crea la cuenta (User) y su perfil. Si el perfil falla, borra la cuenta para no dejar usuarios a medias.
 * @returns {Promise<{ok:true, user, perfil}|{ok:false, status:number, error:string}>}
 */
export async function crearCuentaConPerfil({ datos, role, Modelo, perfil }) {
  if (await User.exists({ email: datos.email })) {
    return { ok: false, status: 409, error: 'Ya existe una cuenta con ese email' };
  }
  const user = await User.create({
    nombre: datos.nombre,
    email: datos.email,
    telefono: datos.telefono,
    password: await hashPassword(datos.password),
    role
  });
  try {
    const doc = await Modelo.create({ ...perfil, user: user._id });
    return { ok: true, user, perfil: doc };
  } catch (error) {
    await User.deleteOne({ _id: user._id }).catch(() => {});
    if (error?.name === 'ValidationError') return { ok: false, status: 400, error: error.message };
    throw error;
  }
}

/** Perfil Especialista del usuario de la sesión (o null). */
export async function especialistaDeSesion(session) {
  if (session?.role !== 'especialista') return null;
  const id = await perfilIdDe(session);
  return id ? Especialista.findById(id) : null;
}

/** Perfil Aspirante del usuario de la sesión (o null). */
export async function aspiranteDeSesion(session) {
  if (session?.role !== 'aspirante') return null;
  const id = await perfilIdDe(session);
  return id ? Aspirante.findById(id) : null;
}
