// lib/inicial-rutas.js
// Utilidades compartidas por las rutas /api/inicial/citas/[id]/*: sesión del especialista y su cita.
import { NextResponse } from 'next/server';
import Cita from '@/models/Cita';
import Especialista from '@/models/Especialista';
import { esObjectId } from '@/lib/sanitize';
import { esDeEspecialista } from '@/lib/inicial-citas';

export const respuestaError = (status, error) => ({ error: NextResponse.json({ error }, { status }) });

/** Especialista de la sesión (perfil completo). El handler exige la sesión con requireSession y la pasa aquí. */
export async function especialistaDeLaPeticion(session) {
  if (session?.role !== 'especialista') return respuestaError(403, 'No autorizado');
  const especialista = await Especialista.findOne({ user: session.id });
  if (!especialista || !especialista.activo) return respuestaError(403, 'Tu cuenta de especialista no está activa');
  return { session, especialista };
}

/** Cita del modelo inicial que pertenece al especialista de la sesión. */
export async function citaDelEspecialista(session, params) {
  const r = await especialistaDeLaPeticion(session);
  if (r.error) return r;
  const { id } = await params;
  if (!esObjectId(id)) return respuestaError(400, 'ID inválido');
  const cita = await Cita.findById(id);
  if (!cita || !esDeEspecialista(cita, r.especialista._id)) return respuestaError(404, 'Cita no encontrada');
  return { ...r, cita };
}
