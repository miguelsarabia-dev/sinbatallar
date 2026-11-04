// lib/perfiles.js
// Resuelve el _id del documento de perfil del usuario autenticado.
//   contratista -> session.id es el _id del Contratista
//   tecnico / ferretero / aperturador / incorporador -> doc cuyo `user` es session.id
//
// AUTO-PROVISIÓN: aperturador e incorporador son roles que asigna un admin; si el usuario ya tiene el rol pero
// no su perfil (cuentas creadas antes de que POST /users lo generara, p. ej. el registro público antiguo), el
// perfil se crea aquí de forma idempotente (upsert sobre el índice único `user`) con el porcentaje por defecto
// de la configuración financiera. Solo si no se pudo crear devuelve null (y las rutas responden 409).
import Tecnico from '@/models/Tecnico';
import Ferretero from '@/models/Ferretero';
import Aperturador from '@/models/Aperturador';
import Incorporador from '@/models/Incorporador';
import User from '@/models/User';
import { getFinancialConfig } from '@/lib/comisiones';

const MODELOS = { tecnico: Tecnico, ferretero: Ferretero, aperturador: Aperturador, incorporador: Incorporador };
const AUTOPROVISION = ['aperturador', 'incorporador'];

async function provisionarPerfil(session, Modelo) {
  try {
    // El token puede estar desactualizado: el rol se confirma en la base y no se provisiona a cuentas suspendidas
    const usuario = await User.findById(session.id).select('role suspendido').lean();
    if (!usuario || usuario.role !== session.role || usuario.suspendido) return null;

    const config = await getFinancialConfig();
    const porcentaje = session.role === 'aperturador' ? config.OPENER : config.INCORPORATOR;
    const doc = await Modelo.findOneAndUpdate(
      { user: session.id },
      { $setOnInsert: { user: session.id, 'comision.porcentaje': porcentaje } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).select('_id').lean();
    return doc ? String(doc._id) : null;
  } catch (error) {
    if (error?.code === 11000) {
      // Carrera: otra petición lo creó primero
      const existente = await Modelo.findOne({ user: session.id }).select('_id').lean();
      return existente ? String(existente._id) : null;
    }
    console.error('Error provisionando perfil de', session.role, error);
    return null;
  }
}

/** @returns {Promise<string|null>} */
export async function perfilIdDe(session) {
  if (!session) return null;
  if (session.role === 'contratista') return session.id;
  const Modelo = MODELOS[session.role];
  if (!Modelo) return null;
  const doc = await Modelo.findOne({ user: session.id }).select('_id').lean();
  if (doc) return String(doc._id);
  return AUTOPROVISION.includes(session.role) ? provisionarPerfil(session, Modelo) : null;
}
