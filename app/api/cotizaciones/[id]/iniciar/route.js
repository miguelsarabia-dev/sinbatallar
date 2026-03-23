// app/api/cotizaciones/[id]/iniciar/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/mongoose';
import Cotizacion from '../../../../../models/Cotizacion';
import Cita from '../../../../../models/Cita';
import Contratista from '../../../../../models/Contratista';
import { enviarEmailCitaEnProgreso } from '@/lib/email-service';

export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const { contratistaId } = await request.json();

    if (!contratistaId) {
      return NextResponse.json({
        error: 'ID del contratista requerido'
      }, { status: 400 });
    }

    // Verificar que el contratista existe
    const contratista = await Contratista.findById(contratistaId);
    if (!contratista) {
      return NextResponse.json({
        error: 'Contratista no encontrado'
      }, { status: 404 });
    }

    // Buscar la cotización
    const cotizacion = await Cotizacion.findById(id).populate('cita');

    if (!cotizacion) {
      return NextResponse.json({
        error: 'Cotización no encontrada'
      }, { status: 404 });
    }

    // Verificar que la cotización pertenece al contratista
    if (cotizacion.contratista.toString() !== contratistaId) {
      return NextResponse.json({
        error: 'No tienes permisos para iniciar este trabajo'
      }, { status: 403 });
    }

    // Verificar que la cotización está aceptada por el cliente
    if (cotizacion.estado !== 'aceptada') {
      return NextResponse.json({
        error: 'Solo se pueden iniciar trabajos de cotizaciones aceptadas por el cliente',
        details: `Estado actual: ${cotizacion.estado}`
      }, { status: 400 });
    }

    // Verificar que existe una cita asociada
    if (!cotizacion.cita) {
      return NextResponse.json({
        error: 'Cotización sin cita asociada'
      }, { status: 400 });
    }

    const cita = await Cita.findById(cotizacion.cita._id);
    if (!cita) {
      return NextResponse.json({
        error: 'Cita no encontrada'
      }, { status: 404 });
    }

    // Verificar que la cita esté en estado 'aceptada'
    if (cita.estado !== 'aceptada') {
      return NextResponse.json({
        error: `La cita debe estar en estado 'aceptada' para iniciar trabajo. Estado actual: ${cita.estado}`
      }, { status: 400 });
    }

    // Cambiar el estado de la cita a 'en_progreso'
    cita.estado = 'en_progreso';

    // Registrar hora de inicio
    const now = new Date();
    cita.horaInicio = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Agregar al historial
    if (!cita.historial) {
      cita.historial = [];
    }
    cita.historial.push({
      estado: 'en_progreso',
      comentario: 'Trabajo iniciado por el contratista',
      fecha: new Date()
    });

    await cita.save();

    // Cargar datos poblados para el email
    const cotizacionActualizada = await Cotizacion.findById(id)
      .populate('contratista', 'nombre email telefono direccion')
      .populate({
        path: 'cita',
        populate: [
          { path: 'cliente', select: 'nombre email telefono' },
          { path: 'servicio', select: 'nombre descripcion' }
        ]
      });

    // Enviar email al cliente notificando que el trabajo inició (no bloqueante)
    if (cotizacionActualizada?.cita?.cliente?.email) {
      enviarEmailCitaEnProgreso({
        cita: cotizacionActualizada.cita,
        cliente: cotizacionActualizada.cita.cliente,
        contratista: cotizacionActualizada.contratista,
        servicio: cotizacionActualizada.cita.servicio
      }).catch(err => console.error('Error enviando email de trabajo iniciado:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Trabajo iniciado exitosamente',
      cita: {
        _id: cita._id,
        estado: cita.estado,
        horaInicio: cita.horaInicio
      }
    });

  } catch (error) {
    console.error('Error al iniciar trabajo:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
