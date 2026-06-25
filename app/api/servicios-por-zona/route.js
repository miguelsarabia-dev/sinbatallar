import { connectDB } from '@/lib/mongoose';
import Area from '@/models/Area';
import { NextResponse } from 'next/server';

// GET: Obtener servicios disponibles basados en la ubicación del usuario
export async function GET(request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));

  if (!lat || !lng) {
    return NextResponse.json({
      error: 'Coordenadas de ubicación requeridas (lat, lng)'
    }, { status: 400 });
  }

  try {
    // Buscar el área activa que contiene la ubicación del usuario
    const area = await Area.findOne({
      activo: true,
      poligono: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat] // MongoDB usa [lng, lat]
          }
        }
      }
    }).populate({
      path: 'contratistas',
      match: { activo: true }, // Solo contratistas activos
      populate: {
        path: 'servicios',
        model: 'Servicio'
      }
    });

    if (!area) {
      return NextResponse.json({
        message: 'No hay servicios disponibles en tu zona actualmente',
        servicios: [],
        area: null,
        ubicacion: { lat, lng }
      });
    }

    if (!area.contratistas || area.contratistas.length === 0) {
      return NextResponse.json({
        message: 'No hay contratistas activos en tu zona actualmente',
        servicios: [],
        categorias: [],
        area: { _id: area._id, nombre: area.nombre, clasificacion: area.clasificacion },
        ubicacion: { lat, lng }
      });
    }

    // Extraer todos los servicios únicos de los contratistas activos
    const serviciosSet = new Set();
    const serviciosConContratistas = [];

    area.contratistas.forEach(contratista => {
      if (contratista.servicios) {
        contratista.servicios.forEach(servicio => {
          const servicioId = servicio._id.toString();

          if (!serviciosSet.has(servicioId)) {
            serviciosSet.add(servicioId);

            serviciosConContratistas.push({
              servicio: servicio.toObject ? servicio.toObject() : servicio,
              contratistas: area.contratistas
                .filter(c => c.servicios.some(s => s._id.toString() === servicioId))
                .map(c => ({
                  _id: c._id,
                  nombre: c.nombre,
                  email: c.email,
                  telefono: c.telefono,
                  direccion: c.direccion,
                  promedioCalificacion: c.promedioCalificacion || 0,
                  totalCalificaciones: c.totalCalificaciones || 0,
                  ubicacion: c.ubicacion
                })),
              totalContratistas: area.contratistas.filter(c =>
                c.servicios.some(s => s._id.toString() === servicioId)
              ).length
            });
          }
        });
      }
    });

    return NextResponse.json({
      servicios: serviciosConContratistas,
      categorias: [...new Set(serviciosConContratistas.map(sc => sc.servicio.categoria))],
      area: {
        _id: area._id,
        nombre: area.nombre,
        clasificacion: area.clasificacion
      },
      ubicacion: { lat, lng }
    });

  } catch (error) {
    console.error('Error al buscar servicios por zona:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
