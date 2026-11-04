// app/api/cotizaciones/[id]/completar/route.js
// El contratista dueño (por token) marca el trabajo como completado. Si hay técnico asignado,
// este debe haberlo marcado antes (lib/citas-estado.js). No crea comisión: eso ocurre al
// verificarse el pago (lib/comisiones.js).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import { enviarEmailsCitaCompletada } from '@/lib/email-service';
import { requireSession } from '@/lib/session';
import { cambiarEstadoCita } from '@/lib/citas-estado';
import { cerrarServicioSiCorresponde } from '@/lib/comisiones';

export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['contratista', 'admin']);
    if (error) return error;

    const { id } = await params;

    const cotizacion = await Cotizacion.findById(id);
    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    if (session.role === 'contratista' && cotizacion.contratista.toString() !== session.id) {
      return NextResponse.json({ error: 'No tienes permisos para completar esta cotización' }, { status: 403 });
    }

    if (cotizacion.estado !== 'aceptada') {
      return NextResponse.json({ error: 'Solo se pueden completar cotizaciones aceptadas' }, { status: 400 });
    }

    const cita = cotizacion.cita ? await Cita.findById(cotizacion.cita) : null;
    if (cita) {
      const resultado = await cambiarEstadoCita({
        cita,
        estado: 'completada',
        comentario: 'Trabajo completado por el contratista',
        session
      });
      if (resultado.error) {
        return NextResponse.json({ error: resultado.error.message }, { status: resultado.error.status });
      }
      await cerrarServicioSiCorresponde(cita._id);
    }

    const cotizacionActualizada = await Cotizacion.findById(id)
      .populate('contratista', 'nombre email telefono direccion')
      .populate({
        path: 'cita',
        populate: [
          { path: 'cliente', select: 'nombre email telefono' },
          { path: 'servicio', select: 'nombre descripcion' }
        ]
      });

    if (cotizacionActualizada?.cita?.cliente && cotizacionActualizada?.contratista) {
      enviarEmailsCitaCompletada({
        cita: cotizacionActualizada.cita,
        cliente: cotizacionActualizada.cita.cliente,
        contratista: cotizacionActualizada.contratista,
        servicio: cotizacionActualizada.cita.servicio,
        cotizacion: cotizacionActualizada
      }).catch(err => console.error('Error enviando emails cita completada:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Trabajo marcado como completado exitosamente',
      cotizacion: cotizacionActualizada
    });

  } catch (error) {
    console.error('Error al completar trabajo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
