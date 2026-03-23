// app/api/cotizaciones/[id]/aprobar/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import { enviarEmailCitaCotizada } from '@/lib/email-service';

// POST - Aprobar una cotización (cambiar de pendiente a enviada)
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const data = await request.json();
    const { contratistaId } = data;

    if (!contratistaId) {
      return NextResponse.json(
        { error: 'contratistaId es requerido' },
        { status: 400 }
      );
    }

    // Buscar la cotización
    const cotizacion = await Cotizacion.findById(id);

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el contratista que aprueba es el dueño
    if (cotizacion.contratista.toString() !== contratistaId) {
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
      if (cita.estado === 'solicitada') {
        cita.estado = 'cotizada';
      }
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
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
