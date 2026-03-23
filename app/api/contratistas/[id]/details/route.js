import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import Cita from '@/models/Cita';
import Cotizacion from '@/models/Cotizacion';
import { NextResponse } from 'next/server';

// GET: Obtener detalles completos de un contratista con sus últimas acciones
export async function GET(request, { params }) {
  await connectDB();

  try {
    const { id } = await params;

    // Obtener contratista con populate
    const contratista = await Contratista.findById(id)
      .populate('servicios', 'nombre categoria descripcion tipo')
      .populate('incorporador', 'nombre telefono')
      .lean();

    if (!contratista) {
      return NextResponse.json({
        error: 'Contratista no encontrado'
      }, { status: 404 });
    }

    // Obtener últimas 5 citas
    const citas = await Cita.find({ contratista: id })
      .populate('servicio', 'nombre')
      .populate('cliente', 'nombre telefono')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Obtener últimas 5 cotizaciones
    const cotizaciones = await Cotizacion.find({ contratista: id })
      .populate({
        path: 'cita',
        populate: [
          { path: 'cliente', select: 'nombre' },
          { path: 'servicio', select: 'nombre' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Estadísticas totales
    const [totalCitas, totalCotizaciones, citasCompletadas, citasPendientes] = await Promise.all([
      Cita.countDocuments({ contratista: id }),
      Cotizacion.countDocuments({ contratista: id }),
      Cita.countDocuments({ contratista: id, estado: 'completada' }),
      Cita.countDocuments({ contratista: id, estado: { $in: ['pendiente', 'confirmada'] } })
    ]);

    return NextResponse.json({
      contratista,
      recentActivity: {
        citas,
        cotizaciones
      },
      stats: {
        totalCitas,
        totalCotizaciones,
        citasCompletadas,
        citasPendientes,
        serviciosOfrecidos: contratista.servicios?.length || 0
      }
    });
  } catch (error) {
    console.error('Error al obtener detalles de contratista:', error);
    return NextResponse.json({
      error: 'Error al obtener detalles',
      details: error.message
    }, { status: 500 });
  }
}
