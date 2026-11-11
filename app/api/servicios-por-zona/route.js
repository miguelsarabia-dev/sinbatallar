import { connectDB } from '@/lib/mongoose';
import Area from '@/models/Area';
import Contratista from '@/models/Contratista';
import Servicio from '@/models/Servicio'; // registrado para el populate de servicios
import { NextResponse } from 'next/server';
import DemandaFueraZona from '@/models/DemandaFueraZona';

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
    });

    if (!area) {
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

    // Contratistas de la zona: por Area.contratistas Y por las zonas del propio contratista (areasIds / areaId), para que
    // no queden fuera los que se asignaron a la zona sin actualizar el arreglo del Area. Solo aprobados y disponibles.
    const contratistas = await Contratista.find({
      aprobado: true,
      activo: true,
      $or: [{ _id: { $in: area.contratistas || [] } }, { areasIds: area._id }, { areaId: area._id }]
    })
      .select('-password -curp -informacionPago -notas') // nunca datos sensibles
      .populate({ path: 'servicios', model: Servicio });

    if (contratistas.length === 0) {
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

    contratistas.forEach(contratista => {
      if (contratista.servicios) {
        contratista.servicios.forEach(servicio => {
          const servicioId = servicio._id.toString();

          if (!serviciosSet.has(servicioId)) {
            serviciosSet.add(servicioId);

            serviciosConContratistas.push({
              servicio: servicio.toObject ? servicio.toObject() : servicio,
              contratistas: contratistas
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
              totalContratistas: contratistas.filter(c =>
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
