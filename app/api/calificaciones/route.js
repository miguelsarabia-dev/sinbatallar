// app/api/calificaciones/route.js
import { connectDB } from '@/lib/mongoose';
import Calificacion from '@/models/Calificacion';
import Contratista from '@/models/Contratista';
import { NextResponse } from 'next/server';

// GET: Obtener calificaciones
export async function GET(request) {
  await connectDB();

  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'contratista'
    const calificadoId = searchParams.get('calificadoId');
    const citaId = searchParams.get('citaId');
    const clienteId = searchParams.get('clienteId');

    let filter = {};

    if (tipo) {
      filter.tipoCalificado = 'Contratista';
    }

    if (calificadoId) {
      filter.calificado = calificadoId;
    }

    if (citaId) {
      filter.cita = citaId;
    }

    if (clienteId) {
      filter.cliente = clienteId;
    }

    const calificaciones = await Calificacion.find(filter)
      .populate('cita', 'estado servicio fechaProgramada')
      .populate('cliente', 'nombre email')
      .sort({ createdAt: -1 });

    return NextResponse.json(calificaciones);

  } catch (error) {
    console.error('Error al obtener calificaciones:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

// POST: Crear nueva calificación
export async function POST(request) {
  await connectDB();

  try {
    const {
      citaId,
      clienteId,
      calificadoId,
      tipoCalificado,
      puntaje,
      comentario,
      imagenes
    } = await request.json();

    // Validar datos requeridos
    if (!citaId || !clienteId || !calificadoId || !tipoCalificado || !puntaje) {
      return NextResponse.json({
        error: 'citaId, clienteId, calificadoId, tipoCalificado y puntaje son requeridos'
      }, { status: 400 });
    }

    if (!['Contratista'].includes(tipoCalificado)) {
      return NextResponse.json({
        error: 'tipoCalificado debe ser Contratista'
      }, { status: 400 });
    }

    if (puntaje < 1 || puntaje > 5) {
      return NextResponse.json({
        error: 'El puntaje debe estar entre 1 y 5'
      }, { status: 400 });
    }

    // Verificar si ya existe una calificación para esta cita y tipo
    const calificacionExistente = await Calificacion.findOne({
      cita: citaId,
      cliente: clienteId,
      tipoCalificado
    });

    if (calificacionExistente) {
      return NextResponse.json({
        error: 'Ya existe una calificación para este servicio'
      }, { status: 400 });
    }

    // Crear calificación
    const nuevaCalificacion = new Calificacion({
      cita: citaId,
      cliente: clienteId,
      calificado: calificadoId,
      tipoCalificado,
      puntaje: parseInt(puntaje),
      comentario: comentario?.trim() || '',
      imagenes: imagenes || []
    });

    await nuevaCalificacion.save();

    // Actualizar promedio del calificado
    const contratista = await Contratista.findById(calificadoId);
    if (contratista) {
      const calificaciones = await Calificacion.find({
        calificado: calificadoId,
        tipoCalificado: 'Contratista'
      });

      contratista.totalCalificaciones = calificaciones.length;
      const suma = calificaciones.reduce((acc, cal) => acc + cal.puntaje, 0);
      contratista.promedioCalificacion = suma / contratista.totalCalificaciones;

      await contratista.save();
    }

    return NextResponse.json({
      message: 'Calificación creada exitosamente',
      calificacion: nuevaCalificacion
    });

  } catch (error) {
    console.error('Error al crear calificación:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
