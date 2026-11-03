// lib/perfiles.js
// Resuelve el _id del documento de perfil del usuario autenticado.
//   contratista -> session.id es el _id del Contratista
//   tecnico / ferretero / aperturador / incorporador -> doc cuyo `user` es session.id
import Tecnico from '@/models/Tecnico';
import Ferretero from '@/models/Ferretero';
import Aperturador from '@/models/Aperturador';
import Incorporador from '@/models/Incorporador';

const MODELOS = { tecnico: Tecnico, ferretero: Ferretero, aperturador: Aperturador, incorporador: Incorporador };

/** @returns {Promise<string|null>} */
export async function perfilIdDe(session) {
  if (!session) return null;
  if (session.role === 'contratista') return session.id;
  const Modelo = MODELOS[session.role];
  if (!Modelo) return null;
  const doc = await Modelo.findOne({ user: session.id }).select('_id').lean();
  return doc ? String(doc._id) : null;
}
