// app/api/citas/[id]/subestado/route.js
// PATCH { subestado: 'cotizando'|'en_camino'|'en_sitio'|'trabajando' } — solo el técnico asignado (por token).
//  - 'cotizando': válido con la cita en aceptada, atendida o cotizada.
//  - 'en_camino' | 'en_sitio' | 'trabajando': solo con la cita en_progreso.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Tecnico from '@/models/Tecnico';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';

// Textos exactos que la app lee del historial
const TEXTO_HISTORIAL = {
  cotizando: 'Técnico cotizando',
  en_camino: 'Técnico en camino al domicilio',
  en_sitio: 'Técnico llegó al domicilio',
  trabajando: 'Técnico trabajando en el servicio'
};
const ESTADOS_COTIZANDO = ['aceptada', 'atendida', 'cotizada'];

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['tecnico']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    const { subestado } = await request.json();

    if (!Object.keys(TEXTO_HISTORIAL).includes(subestado)) {
      return NextResponse.json({ error: `subestado debe ser: ${Object.keys(TEXTO_HISTORIAL).join(' | ')}` }, { status: 400 });
    }

    const tecnico = await Tecnico.findOne({ user: session.id }).select('_id activo');
    const cita = await Cita.findById(id);
    if (!cita || !tecnico || String(cita.tecnico) !== String(tecnico._id)) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const valido = subestado === 'cotizando' ? ESTADOS_COTIZANDO.includes(cita.estado) : cita.estado === 'en_progreso';
    if (!valido) {
      return NextResponse.json(
        { error: `El subestado '${subestado}' no es válido con la cita en estado '${cita.estado}'` },
        { status: 400 }
      );
    }

    // Idempotente: repetir el mismo subestado no ensucia el historial
    if (cita.subestadoTecnico !== subestado) {
      cita.subestadoTecnico = subestado;
      cita.fechaSubestadoTecnico = new Date();
      cita.historial.push({ estado: cita.estado, comentario: TEXTO_HISTORIAL[subestado], fecha: new Date(), usuario: session.id });
      await cita.save({ validateModifiedOnly: true });
    }

    return NextResponse.json({
      success: true,
      subestadoTecnico: cita.subestadoTecnico,
      fechaSubestadoTecnico: cita.fechaSubestadoTecnico,
      cita
    });
  } catch (error) {
    console.error('Error en PATCH /api/citas/[id]/subestado:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
