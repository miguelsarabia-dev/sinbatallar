// app/api/ferreterias-por-zona/route.js
// Lista ferreterías activas (con catálogo activo) cuya ubicación cae dentro del
// polígono de una o varias zonas (Area). Pensado para que el técnico/contratista
// vea las ferreterías de las zonas que tiene en su cobertura.
//
// GET /api/ferreterias-por-zona?areaId=<id>
// GET /api/ferreterias-por-zona?areaId=<id1>,<id2>   → varias zonas a la vez
// Query opcional:
//   ?incluirCatalogo=true  → adjuntar un preview (hasta 20) de materiales activos de cada ferretería
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Area from '@/models/Area';
import Ferretero from '@/models/Ferretero';
import Material from '@/models/Material';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const areaIdParam = searchParams.get('areaId');
    const incluirCatalogo = searchParams.get('incluirCatalogo') === 'true';

    if (!areaIdParam) {
      return NextResponse.json(
        { error: 'Se requiere al menos un areaId' },
        { status: 400 }
      );
    }

    const areaIds = areaIdParam.split(',').map(s => s.trim()).filter(Boolean);

    // Obtener los polígonos de las zonas solicitadas
    const areas = await Area.find({ _id: { $in: areaIds } }).select('nombre clasificacion poligono');
    if (areas.length === 0) {
      return NextResponse.json({ total: 0, ferreterias: [] });
    }

    // Ferreterías activas con catálogo activo cuya ubicación intersecta alguno de los polígonos
    const geoOr = areas
      .filter(a => a.poligono?.coordinates)
      .map(a => ({
        ubicacion: { $geoIntersects: { $geometry: a.poligono } }
      }));

    if (geoOr.length === 0) {
      return NextResponse.json({ total: 0, ferreterias: [] });
    }

    const ferreterias = await Ferretero.find({
      activo: true,
      catalogoActivo: true,
      $or: geoOr
    }).populate('user', 'nombre email telefono fotoUrl');

    // Opcionalmente adjuntar un preview del catálogo de cada ferretería
    let resultado = ferreterias.map(f => f.toObject());

    if (incluirCatalogo && ferreterias.length > 0) {
      resultado = await Promise.all(
        ferreterias.map(async (f) => {
          const materiales = await Material.find({ ferretero: f.user._id, activo: true })
            .sort({ categoria: 1, nombre: 1 })
            .limit(20);
          return { ...f.toObject(), totalMateriales: materiales.length, materiales };
        })
      );
    }

    return NextResponse.json({
      zonas: areas.map(a => ({ _id: a._id, nombre: a.nombre, clasificacion: a.clasificacion })),
      total: resultado.length,
      ferreterias: resultado
    });
  } catch (error) {
    console.error('Error en GET /api/ferreterias-por-zona:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
