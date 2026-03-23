// app/api/cotizaciones/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Contratista from '@/models/Contratista';

// GET - Obtener cotizaciones
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');
    const contratistaId = searchParams.get('contratistaId');
    const estado = searchParams.get('estado');

    let filter = {};

    if (clienteId) {
      const Cita = (await import('@/models/Cita')).default;
      const citas = await Cita.find({ cliente: clienteId }).select('_id');
      filter.cita = { $in: citas.map(c => c._id) };
      filter.estado = { $nin: ['pendiente'] };
    }

    if (contratistaId) {
      filter.contratista = contratistaId;
    }


    if (estado) {
      filter.estado = estado;
    }

    const cotizaciones = await Cotizacion.find(filter)
      .populate('contratista', 'nombre email telefono promedioCalificacion informacionPago')
      .populate({
        path: 'cita',
        populate: [
          { path: 'cliente', select: 'nombre email telefono' },
          { path: 'servicio', select: 'nombre descripcion categoria' }
        ]
      })
      .sort({ createdAt: -1 });

    return NextResponse.json(cotizaciones);

  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva cotización
export async function POST(request) {
  try {
    await connectDB();

    const data = await request.json();

    const { citaId, contratistaId } = data;

    if (!citaId) {
      return NextResponse.json(
        { error: 'citaId es requerido' },
        { status: 400 }
      );
    }

    const Cita = (await import('@/models/Cita')).default;
    const cita = await Cita.findById(citaId);
    if (!cita) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    const contratista = await Contratista.findById(contratistaId);
    if (!contratista) {
      return NextResponse.json(
        { error: 'Contratista no encontrado' },
        { status: 404 }
      );
    }

    const cotizacion = new Cotizacion({
      cita: citaId,
      contratista: contratistaId,
      estado: 'pendiente'
    });

    await cotizacion.save();

    cita.cotizaciones.push(cotizacion._id);
    if (cita.estado === 'solicitada') {
      cita.estado = 'cotizada';
    }
    await cita.save();

    return NextResponse.json({
      message: 'Cotización creada exitosamente',
      cotizacion: cotizacion._id
    });

  } catch (error) {
    console.error('Error al crear cotización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
