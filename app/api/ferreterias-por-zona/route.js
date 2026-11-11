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
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { ferreteriaPublica, materialPublico, MAX_ZONAS_CONSULTA, MAX_MATERIALES_PREVIEW } from '@/lib/ferreterias-publico';

export async function GET(request) {
  try {
    await connectDB();

    // Solo quienes cotizan/surten obra (técnico, contratista) y el admin; no clientes ni otros roles
    const { error } = await requireSession(request, ['tecnico', 'contratista', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const areaIdParam = searchParams.get('areaId');
    const incluirCatalogo = searchParams.get('incluirCatalogo') === 'true';

    if (!areaIdParam) {
      return NextResponse.json(
        { error: 'Se requiere al menos un areaId' },
        { status: 400 }
      );
    }

    const areaIds = [...new Set(areaIdParam.split(',').map(s => s.trim()).filter(Boolean))];
    if (areaIds.length > MAX_ZONAS_CONSULTA || areaIds.some(id => !esObjectId(id))) {
      return NextResponse.json({ error: 'areaId no válido' }, { status: 400 });
    }

    // Obtener los polígonos de las zonas solicitadas
    const areas = await Area.find({ _id: { $in: areaIds } }).select('nombre clasificacion poligono');
    if (areas.length === 0) {
      return NextResponse.json({ total: 0, ferreterias: [] });
    }

    // Ferreterías activas, aprobadas y con catálogo activo cuya ubicación intersecta alguno de los polígonos
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
      pendienteAprobacion: { $ne: true },
      $or: geoOr
    }).populate('user', 'nombre telefono suspendido');

    // Sin usuario o con la cuenta suspendida no se muestra
    const visibles = ferreterias.filter(f => f.user && !f.user.suspendido);

    let materialesPorUser = {};
    if (incluirCatalogo && visibles.length > 0) {
      // Una sola consulta para todas las ferreterías (antes: una por ferretería)
      const todos = await Material.find({ ferretero: { $in: visibles.map(f => f.user._id) }, activo: true })
        .sort({ categoria: 1, nombre: 1 })
        .lean();
      for (const m of todos) (materialesPorUser[String(m.ferretero)] ||= []).push(m);
    }

    const resultado = visibles.map(f => {
      const base = ferreteriaPublica(f.toObject(), f.user);
      if (!incluirCatalogo) return base;
      const lista = materialesPorUser[String(f.user._id)] || [];
      return {
        ...base,
        totalMateriales: lista.length, // total real del catálogo activo (el preview trae hasta 20)
        materiales: lista.slice(0, MAX_MATERIALES_PREVIEW).map(materialPublico)
      };
    });

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
