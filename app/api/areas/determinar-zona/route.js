import { connectDB } from '@/lib/mongoose';
import Area from '@/models/Area';
import { NextResponse } from 'next/server';

// GET: Determinar zona basada en coordenadas
export async function GET(request) {
  await connectDB();
  
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    
    if (!lat || !lng) {
      return NextResponse.json({ 
        error: 'Coordenadas de ubicación requeridas (lat, lng)' 
      }, { status: 400 });
    }

    // Buscar el área que contiene las coordenadas
    const area = await Area.findOne({
      poligono: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat] // MongoDB usa [lng, lat]
          }
        }
      }
    });

    if (!area) {
      return NextResponse.json({
        message: 'No se encontró zona para estas coordenadas',
        zona: null,
        coordenadas: { lat, lng }
      }, { status: 404 });
    }

    return NextResponse.json({
      zona: {
        _id: area._id,
        nombre: area.nombre,
        clasificacion: area.clasificacion
      },
      coordenadas: { lat, lng }
    });

  } catch (error) {
    console.error('Error al determinar zona:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}