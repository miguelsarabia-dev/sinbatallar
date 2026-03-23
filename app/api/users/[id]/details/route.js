import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import Cita from '@/models/Cita';
import Servicio from '@/models/Servicio';
import Cotizacion from '@/models/Cotizacion';
import { NextResponse } from 'next/server';

// GET: Obtener detalles completos de un usuario con sus últimas acciones
export async function GET(request, { params }) {
  await connectDB();

  try {
    const { id } = await params;

    // Obtener usuario
    const user = await User.findById(id).select('-password').lean();

    if (!user) {
      return NextResponse.json({
        error: 'Usuario no encontrado'
      }, { status: 404 });
    }

    // Obtener últimas 5 citas
    const citas = await Cita.find({ cliente: id })
      .populate('servicio', 'nombre')
      .populate('contratista', 'nombre')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Obtener últimos 5 servicios
    const servicios = await Servicio.find({ cliente: id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Obtener últimas 5 cotizaciones
    const cotizaciones = await Cotizacion.find({ 'cita.cliente': id })
      .populate('cita')
      .populate('contratista', 'nombre')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Estadísticas totales
    const [totalCitas, totalServicios, totalCotizaciones] = await Promise.all([
      Cita.countDocuments({ cliente: id }),
      Servicio.countDocuments({ cliente: id }),
      Cotizacion.countDocuments({ 'cita.cliente': id })
    ]);

    return NextResponse.json({
      user,
      recentActivity: {
        citas,
        servicios,
        cotizaciones
      },
      stats: {
        totalCitas,
        totalServicios,
        totalCotizaciones
      }
    });
  } catch (error) {
    console.error('Error al obtener detalles de usuario:', error);
    return NextResponse.json({
      error: 'Error al obtener detalles',
      details: error.message
    }, { status: 500 });
  }
}
