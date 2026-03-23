import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import Cita from '@/models/Cita';
import Cotizacion from '@/models/Cotizacion';
import Incorporador from '@/models/Incorporador';
import Servicio from '@/models/Servicio';
import { NextResponse } from 'next/server';

// GET: Búsqueda avanzada de contratistas para admin con stats
export async function GET(request) {
  await connectDB();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const activo = searchParams.get('activo') || ''; // 'true', 'false', o '' para todos
    const calificacionNivel = searchParams.get('calificacionNivel') || ''; // 'A', 'B', 'C', o '' para todos
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const skip = (page - 1) * limit;

    // Construir query de búsqueda
    const query = {};

    // Filtro por estado activo
    if (activo === 'true') {
      query.activo = true;
    } else if (activo === 'false') {
      query.activo = false;
    }

    // Filtro por calificación nivel
    if (calificacionNivel && ['A', 'B', 'C'].includes(calificacionNivel)) {
      query.calificacionNivel = calificacionNivel;
    }

    // Búsqueda por nombre, email o teléfono
    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { nombreEmpresa: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { telefono: { $regex: search, $options: 'i' } }
      ];
    }

    // Obtener total de contratistas que cumplen el criterio
    const total = await Contratista.countDocuments(query);

    // Obtener contratistas con paginación y populate de servicios
    const contratistas = await Contratista.find(query)
      .populate('servicios', 'nombre categoria')
      .populate('incorporador', 'nombre')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Obtener stats de cada contratista
    const contratistasWithStats = await Promise.all(
      contratistas.map(async (contratista) => {
        const [citasCount, cotizacionesCount] = await Promise.all([
          Cita.countDocuments({ contratista: contratista._id }),
          Cotizacion.countDocuments({ contratista: contratista._id })
        ]);

        return {
          ...contratista,
          stats: {
            citas: citasCount,
            cotizaciones: cotizacionesCount,
            serviciosCount: contratista.servicios?.length || 0
          }
        };
      })
    );

    return NextResponse.json({
      contratistas: contratistasWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + contratistas.length < total
      }
    });
  } catch (error) {
    console.error('Error en búsqueda de contratistas admin:', error);
    return NextResponse.json({
      error: 'Error al buscar contratistas',
      details: error.message
    }, { status: 500 });
  }
}
