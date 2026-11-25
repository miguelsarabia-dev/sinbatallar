import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import Servicio from '@/models/Servicio'; // registrado para el populate de servicios
import { NextResponse } from 'next/server';
import DemandaFueraZona from '@/models/DemandaFueraZona';
import { areasQueContienen } from '@/lib/geo-utils';
import Especialista from '@/models/Especialista';
import { getModelosConfig } from '@/lib/modelos-config';
import { armarOfertaZona } from '@/lib/oferta-zona';

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
    // Zonas activas que contienen la ubicación del usuario. Pueden ser varias (polígonos encimados): con findOne se
    // tomaba una sola y el cliente no veía a los contratistas de la otra.
    const areas = await areasQueContienen({ lat, lng }, { soloActivas: true });

    if (!areas.length) {
      // Demanda sin cobertura: se agrega por celda de ~1 km para que los aperturadores vean dónde abrir zona
      try {
        const muni = searchParams.get('municipio');
        await DemandaFueraZona.updateOne(
          { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 },
          {
            $inc: { total: 1 },
            $set: { ultimaVez: new Date(), ...(typeof muni === 'string' && muni.trim() ? { municipio: muni.trim().slice(0, 80) } : {}) }
          },
          { upsert: true }
        );
      } catch (e) { console.error('Error registrando demanda fuera de zona:', e); }

      return NextResponse.json({
        message: 'No hay servicios disponibles en tu zona actualmente',
        servicios: [],
        area: null,
        ubicacion: { lat, lng }
      });
    }

    // Los dos modelos comparten zonas y solicitudes (lib/oferta-zona.js). Los contratistas solo cuentan si el admin
    // activó el modelo permanente.
    const areaIds = areas.map(a => a._id);
    const { permanenteActivo } = await getModelosConfig();

    // Contratistas de la zona: por Area.contratistas Y por las zonas del propio contratista (areasIds / areaId), para que
    // no queden fuera los que se asignaron a la zona sin actualizar el arreglo del Area. Solo aprobados y disponibles.
    const contratistas = permanenteActivo
      ? await Contratista.find({
        aprobado: true,
        activo: true,
        $or: [
          { _id: { $in: areas.flatMap(a => a.contratistas || []) } },
          { areasIds: { $in: areaIds } },
          { areaId: { $in: areaIds } }
        ]
      })
        .select('-password -curp -informacionPago -notas') // nunca datos sensibles
        .populate({ path: 'servicios', model: Servicio })
        .lean()
      : [];

    // Especialistas (modelo inicial) aprobados, activos y disponibles en estas zonas
    const especialistas = await Especialista.find({
      activo: true,
      aprobado: true,
      disponible: { $ne: false },
      areasIds: { $in: areaIds }
    })
      .select('areasIds servicios')
      .populate({ path: 'servicios', model: Servicio })
      .lean();

    // Un servicio borrado queda como null tras el populate: se descarta (antes tumbaba la ruta con un 500)
    [...contratistas, ...especialistas].forEach(c => { c.servicios = (c.servicios || []).filter(Boolean); });

    // Zona que se reporta al cliente: la primera que tenga a alguien con servicios (o la primera si ninguna)
    const ligadoA = (c, a) =>
      (a.contratistas || []).some(id => String(id) === String(c._id)) ||
      (c.areasIds || []).some(id => String(id) === String(a._id)) ||
      String(c.areaId) === String(a._id);
    const area = areas.find(a => [...contratistas, ...especialistas].some(c => c.servicios.length && ligadoA(c, a))) || areas[0];
    const zonaPublica = { _id: area._id, nombre: area.nombre, clasificacion: area.clasificacion };

    const servicios = armarOfertaZona({ contratistas, especialistas, permanenteActivo });
    if (servicios.length === 0) {
      return NextResponse.json({
        message: 'No hay especialistas activos en tu zona actualmente',
        servicios: [],
        categorias: [],
        area: zonaPublica,
        ubicacion: { lat, lng }
      });
    }

    return NextResponse.json({
      servicios,
      categorias: [...new Set(servicios.map(sc => sc.servicio.categoria))],
      area: zonaPublica,
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
