// app/api/cotizaciones/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Contratista from '@/models/Contratista';
import Tecnico from '@/models/Tecnico';
import { requireSession } from '@/lib/session';
import { idSeguro } from '@/lib/sanitize';

// GET - Obtener cotizaciones
export async function GET(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['cliente', 'contratista', 'tecnico', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const citaId = idSeguro(searchParams.get('citaId'));

    // El alcance sale del token; los ids de la query solo los respeta el admin.
    let filter = {};
    const Cita = (await import('@/models/Cita')).default;

    if (session.role === 'cliente') {
      const citas = await Cita.find({ cliente: session.id, ...(citaId ? { _id: citaId } : {}) }).select('_id');
      filter.cita = { $in: citas.map(c => c._id) };
      // El cliente nunca ve cotizaciones en revisión interna del contratista/técnico
      filter.estado = { $nin: ['pendiente', 'pendiente_contratista', 'rechazada_contratista'] };
    } else {
      if (citaId) filter.cita = citaId;
      if (session.role === 'contratista') {
        filter.contratista = session.id;
      } else if (session.role === 'tecnico') {
        const tecnico = await Tecnico.findOne({ user: session.id }).select('_id');
        filter.tecnico = tecnico?._id || null;
      } else if (idSeguro(searchParams.get('contratistaId'))) {
        filter.contratista = searchParams.get('contratistaId');
      }
    }

    // El filtro explícito por estado tiene prioridad (p.ej. ?estado=pendiente_contratista
    // que usa el contratista para su bandeja "Por revisar"), salvo para el cliente.
    if (estado && session.role !== 'cliente') {
      const estados = estado.split(',').map(e => e.trim());
      filter.estado = estados.length === 1 ? estados[0] : { $in: estados };
    }

    const cotizaciones = await Cotizacion.find(filter)
      .populate('contratista', 'nombre email telefono promedioCalificacion informacionPago')
      .populate({ path: 'tecnico', populate: { path: 'user', select: 'nombre email' } })
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

    const { session, error } = await requireSession(request, ['contratista']);
    if (error) return error;

    const data = await request.json();

    const { citaId } = data;
    const contratistaId = session.id; // del token

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
