// app/api/citas/[id]/finalizar/route.js
// El técnico (o el contratista dueño, o admin) marca el trabajo como terminado.
// NO crea comisión: esta solo se crea cuando el pago está verificado (lib/comisiones.js).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import { enviarEmailsCitaCompletada } from '@/lib/email-service';
import { requireSession } from '@/lib/session';
import { cambiarEstadoCita } from '@/lib/citas-estado';
import { cerrarServicioSiCorresponde } from '@/lib/comisiones';

export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['tecnico', 'contratista', 'admin']);
    if (error) return error;

    const { id } = await params;
    const { comentario } = await request.json().catch(() => ({}));

    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    if (cita.estado !== 'en_progreso') {
      return NextResponse.json({ error: 'Solo se pueden finalizar citas en progreso' }, { status: 400 });
    }

    const resultado = await cambiarEstadoCita({
      cita,
      estado: 'completada',
      comentario: comentario || 'Servicio completado por el técnico',
      session
    });
    if (resultado.error) {
      return NextResponse.json({ error: resultado.error.message }, { status: resultado.error.status });
    }

    // Por si el pago ya estaba verificado (p. ej. pago total confirmado antes por el cliente).
    await cerrarServicioSiCorresponde(cita._id);

    const citaActualizada = await Cita.findById(id)
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono')
      .populate('servicio', 'nombre descripcion')
      .populate('cotizacionAceptada');

    enviarEmailsCitaCompletada({
      cita: citaActualizada,
      cliente: citaActualizada.cliente,
      contratista: citaActualizada.contratista,
      servicio: citaActualizada.servicio,
      cotizacion: citaActualizada.cotizacionAceptada
    }).catch(err => console.error('Error enviando emails cita completada:', err));

    return NextResponse.json({
      success: true,
      message: 'Servicio finalizado exitosamente',
      cita: citaActualizada
    });

  } catch (error) {
    console.error('Error al finalizar servicio:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
