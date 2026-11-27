// POST /api/citas/[id]/visita — el CLIENTE contesta sobre la visita para cotizar del modelo inicial:
//   { aceptar: true }                     → acepta el día que propuso el especialista (visita acordada)
//   { fechaVisita, horaVisita? }          → propone otro día (le toca al especialista)
// Reglas en lib/inicial-visita.js; el especialista contesta en /api/inicial/citas/[id]/visita.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import Cita from '@/models/Cita';
import { responderVisita } from '@/lib/inicial-visita';
import { avisarVisita } from '@/lib/inicial-citas-db';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['cliente']);
    if (error) return error;
    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const cita = await Cita.findById(id);
    if (!cita || String(cita.cliente) !== String(session.id)) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    if (cita.modelo !== 'inicial') return NextResponse.json({ error: 'Esta cita no tiene visita para cotizar' }, { status: 409 });

    const body = await request.json().catch(() => ({}));
    const r = responderVisita({ cita, actor: 'cliente', aceptar: body.aceptar === true, fecha: body.fechaVisita, hora: body.horaVisita });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

    cita.set(r.set);
    cita.historial.push({ estado: cita.estado, fecha: new Date(), comentario: r.comentario });
    await cita.save({ validateModifiedOnly: true });

    avisarVisita({ cita, avisarA: r.avisarA, tipo: r.acordada ? 'acordada' : 'propuesta', propuestaPor: 'cliente' });
    return NextResponse.json({
      message: r.acordada ? 'Visita acordada' : 'Propuesta enviada al especialista',
      fechaVisita: cita.fechaVisita, horaVisita: cita.horaVisita, acuerdoVisita: cita.acuerdoVisita
    });
  } catch (error) {
    console.error('Error en POST /citas/[id]/visita:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
