import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import Cita from '@/models/Cita';
import Servicio from '@/models/Servicio';
import Cotizacion from '@/models/Cotizacion';
import { NextResponse } from 'next/server';

// GET: Búsqueda avanzada de usuarios para admin con stats
export async function GET(request) {
  await connectDB();
  
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const skip = (page - 1) * limit;
    
    // Construir query de búsqueda
    const query = {};
    
    // Filtro por rol
    if (role && role !== 'todos') {
      query.role = role;
    }
    
    // Búsqueda por nombre, email o teléfono
    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { telefono: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Obtener total de usuarios que cumplen el criterio
    const total = await User.countDocuments(query);
    
    // Obtener usuarios con paginación
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Obtener stats de cada usuario
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [citasCount, serviciosCount, cotizacionesCount] = await Promise.all([
          Cita.countDocuments({ cliente: user._id }),
          Servicio.countDocuments({ cliente: user._id }),
          Cotizacion.countDocuments({ 'cita.cliente': user._id })
        ]);
        
        return {
          ...user,
          stats: {
            citas: citasCount,
            servicios: serviciosCount,
            cotizaciones: cotizacionesCount
          }
        };
      })
    );
    
    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total
      }
    });
  } catch (error) {
    console.error('Error en búsqueda de usuarios admin:', error);
    return NextResponse.json({ 
      error: 'Error al buscar usuarios',
      details: error.message 
    }, { status: 500 });
  }
}
