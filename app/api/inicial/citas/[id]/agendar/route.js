// PUT /api/inicial/citas/[id]/agendar — fija o REPROGRAMA el día y la hora en que empieza el trabajo ("tal día vamos
// a venir a esta hora"), después de que el cliente aceptó la cotización. Lo normal es que ese día ya venga en la
// cotización aceptada (fechaInicioPropuesta); esta ruta sirve si no se puso o si cambia. No toca la fecha de visita.
// Body: { fechaProgramada: ISO, horaInicio?: 'HH:MM' }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { citaDelEspecialista } from '@/lib/inicial-rutas';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, cita } = await citaDelEspecialista(sesion.session, params);
    if (error) return error;
    if (!cita.cotizacionAceptada || !['aceptada', 'verificando_pago', 'en_progreso'].includes(cita.estado)) {
      return NextResponse.json({ error: 'Se agenda cuando el cliente ya aceptó la cotización' }, { status: 409 });
    }
    const body = await request.json().catch(() => ({}));
    const fecha = new Date(body.fechaProgramada);
    if (typeof body.fechaProgramada !== 'string' || Number.isNaN(fecha.getTime())) {
      return NextResponse.json({ error: 'fechaProgramada inválida' }, { status: 400 });
    }
    if (fecha.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'La fecha ya pasó' }, { status: 400 });
    }
    if (body.horaInicio !== undefined && (typeof body.horaInicio !== 'string' || !HORA.test(body.horaInicio))) {
      return NextResponse.json({ error: 'horaInicio debe ser HH:MM' }, { status: 400 });
    }
    cita.fechaProgramada = fecha;
    if (body.horaInicio) cita.horaInicio = body.horaInicio;
    cita.historial.push({ estado: cita.estado, fecha: new Date(), comentario: `Trabajo agendado para ${fecha.toISOString().slice(0, 10)}${body.horaInicio ? ' a las ' + body.horaInicio : ''}` });
    await cita.save({ validateModifiedOnly: true });
    return NextResponse.json({ fechaProgramada: cita.fechaProgramada, horaInicio: cita.horaInicio });
  } catch (error) {
    console.error('Error en PUT /inicial/citas/[id]/agendar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
