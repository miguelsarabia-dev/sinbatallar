// app/api/cotizaciones/[id]/aprobar/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import { enviarEmailCitaCotizada } from '@/lib/email-service';
import { requireSession } from '@/lib/session';
import { marcarCotizada } from '@/lib/citas-estado';



// POST - Aprobar una cotización (cambiar de pendiente a enviada)
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['contratista', 'admin']);
    if (error) return error;

    const { id } = await params;
    const contratistaId = session.id; // del token

    // Buscar la cotización
    const cotizacion = await Cotizacion.findById(id);

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el contratista que aprueba es el dueño
    if (session.role !== 'admin' && cotizacion.contratista.toString() !== contratistaId) {
      return NextResponse.json(
        { error: 'No tienes permiso para aprobar esta cotización' },
        { status: 403 }
      );
    }

    // Verificar que la cotización está pendiente
    if (cotizacion.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `La cotización no está pendiente (estado actual: ${cotizacion.estado})` },
        { status: 400 }
      );
    }

    // Aprobar la cotización - cambiar a enviada
    cotizacion.estado = 'enviada';
    await cotizacion.save();

    // Actualizar la cita y enviar email
    const cita = await Cita.findById(cotizacion.cita)
      .populate('cliente', 'nombre email')
      .populate('servicio', 'nombre');

    if (cita) {
      marcarCotizada(cita);
      await cita.save();

      // Enviar email de cotización al cliente
      enviarEmailCitaCotizada({
        cita,
        cliente: cita.cliente,
        servicio: cita.servicio,
        cotizacion: {
          total: cotizacion.total,
          items: cotizacion.materiales
        }
      }).catch(err => console.error('Error enviando email cotizacion aprobada:', err));
    }

    return NextResponse.json({
      message: 'Cotización aprobada y enviada al cliente exitosamente',
      cotizacion: {
        _id: cotizacion._id,
        estado: cotizacion.estado,
        total: cotizacion.total
      }
    });

  } catch (error) {
    console.error('Error al aprobar cotización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
