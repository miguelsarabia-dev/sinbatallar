// PUT /api/inicial/citas/[id]/visita — el especialista confirma o ajusta el día y la hora de la VISITA para cotizar
// (la propuso el cliente al solicitar). Solo antes de que el cliente acepte una cotización.
// Body: { fechaVisita: ISO | 'YYYY-MM-DD', horaVisita?: 'HH:MM' }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { citaDelEspecialista } from '@/lib/inicial-rutas';
import { validarFechaHora } from '@/lib/inicial-citas';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, cita } = await citaDelEspecialista(sesion.session, params);
    if (error) return error;
    if (!['atendida', 'cotizada'].includes(cita.estado) || cita.cotizacionAceptada) {
      return NextResponse.json({ error: 'La visita para cotizar ya pasó: el cliente aceptó la cotización' }, { status: 409 });
    }
    const body = await request.json().catch(() => ({}));
    const f = validarFechaHora({ fecha: body.fechaVisita, hora: body.horaVisita }, { etiqueta: 'Fecha de visita' });
    if (!f.ok) return NextResponse.json({ error: f.error }, { status: 400 });

    cita.fechaVisita = f.fecha;
    if (f.hora) cita.horaVisita = f.hora;
    cita.historial.push({ estado: cita.estado, fecha: new Date(), comentario: `Visita para cotizar: ${f.fecha.toISOString().slice(0, 10)}${f.hora ? ' a las ' + f.hora : ''}` });
    await cita.save({ validateModifiedOnly: true });
    return NextResponse.json({ fechaVisita: cita.fechaVisita, horaVisita: cita.horaVisita });
  } catch (error) {
    console.error('Error en PUT /inicial/citas/[id]/visita:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
