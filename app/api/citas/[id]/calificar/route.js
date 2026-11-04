// app/api/citas/[id]/calificar/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Contratista from '@/models/Contratista';
import Calificacion from '@/models/Calificacion';
import Tecnico from '@/models/Tecnico';
import { requireSession } from '@/lib/session';

export async function PUT(request, { params }) {
  try {
    const { session, error } = await requireSession(request, ['cliente']);
    if (error) return error;
    const clienteId = session.id;

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    await connectDB();

    const { id } = await params;
    const {
      puntajeContratista,
      comentarioContratista,
      puntajeTecnico,
      comentarioTecnico
    } = body;

    // El puntaje del técnico es opcional, pero si llega debe ser 1-5
    const calificaTecnico = puntajeTecnico !== undefined && puntajeTecnico !== null && puntajeTecnico !== '';
    if (calificaTecnico && (!Number.isInteger(Number(puntajeTecnico)) || Number(puntajeTecnico) < 1 || Number(puntajeTecnico) > 5)) {
      return NextResponse.json({ error: 'La calificación del técnico debe ser entre 1 y 5' }, { status: 400 });
    }

    if (!puntajeContratista || puntajeContratista < 1 || puntajeContratista > 5) {
      return NextResponse.json({
        error: 'La calificación del contratista debe ser entre 1 y 5'
      }, { status: 400 });
    }

    // Buscar la cita
    const cita = await Cita.findById(id)
      .populate('contratista');

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // Verificar que la cita pertenece al cliente
    if (cita.cliente.toString() !== clienteId) {
      return NextResponse.json({
        error: 'No tienes permisos para calificar esta cita'
      }, { status: 403 });
    }

    // Verificar que la cita está completada
    if (cita.estado !== 'completada') {
      return NextResponse.json({
        error: 'Solo se pueden calificar servicios completados'
      }, { status: 400 });
    }

    // Verificar que no ha sido calificada antes
    if (cita.calificadoContratista) {
      return NextResponse.json({
        error: 'Esta cita ya ha sido calificada'
      }, { status: 400 });
    }



    // Crear calificación para el contratista
    if (cita.contratista) {
      const calificacionContratista = new Calificacion({
        cita: cita._id,
        cliente: clienteId,
        calificado: cita.contratista._id,
        tipoCalificado: 'Contratista',
        puntaje: parseInt(puntajeContratista),
        comentario: comentarioContratista?.trim() || ''
      });

      await calificacionContratista.save();

      // Actualizar promedio del contratista
      const contratista = await Contratista.findById(cita.contratista._id);
      if (contratista) {
        const calificacionesContratista = await Calificacion.find({
          calificado: contratista._id,
          tipoCalificado: 'Contratista'
        });

        contratista.totalCalificaciones = calificacionesContratista.length;
        const suma = calificacionesContratista.reduce((acc, cal) => acc + cal.puntaje, 0);
        contratista.promedioCalificacion = suma / contratista.totalCalificaciones;

        await contratista.save();
      }
    }

    // Actualizar flags en la cita
    // Calificación del técnico (opcional): una sola vez por cita
    let tecnicoCalificado = false;
    if (calificaTecnico && cita.tecnico && !cita.calificadoTecnico) {
      await new Calificacion({
        cita: cita._id,
        cliente: clienteId,
        calificado: cita.tecnico,
        tipoCalificado: 'Tecnico',
        puntaje: parseInt(puntajeTecnico),
        comentario: comentarioTecnico?.trim() || ''
      }).save();

      const delTecnico = await Calificacion.find({ calificado: cita.tecnico, tipoCalificado: 'Tecnico' }).select('puntaje');
      const promedio = delTecnico.reduce((acc, c) => acc + c.puntaje, 0) / delTecnico.length;
      await Tecnico.updateOne({ _id: cita.tecnico }, {
        promedioCalificacion: promedio,
        totalCalificaciones: delTecnico.length,
        'estadisticas.calificacionPromedio': promedio
      });
      tecnicoCalificado = true;
    }

    const citaActualizada = await Cita.findByIdAndUpdate(
      id,
      {
        $set: {
          calificadoContratista: true,
          ...(tecnicoCalificado ? { calificadoTecnico: true } : {})
        }
      },
      { new: true }
    )
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono promedioCalificacion')
      .populate('servicio', 'nombre descripcion')
      .populate('cotizaciones')
      .populate('cotizacionAceptada');

    return NextResponse.json({
      success: true,
      message: 'Calificaciones enviadas exitosamente',
      cita: citaActualizada
    });

  } catch (error) {
    console.error('Error al calificar cita:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
