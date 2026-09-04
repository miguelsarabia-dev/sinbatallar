// app/api/materiales/buscar/route.js
// GET /api/materiales/buscar?q=cemento&categoria=Construcción
// GET /api/materiales/buscar?q=cemento&lat=19.43&lng=-99.13[&radioKm=5]
// Usado por el BuscadorMateriales en el modal de cotización del contratista/técnico.
// Con lat/lng: devuelve solo materiales de ferreterías dentro del radio, con distanciaKm,
// ordenados por cercanía ascendente. Sin lat/lng: comportamiento global por texto.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Material from '@/models/Material';
import Ferretero from '@/models/Ferretero';

const RADIO_DEFAULT_KM = 5;

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const categoria = searchParams.get('categoria') || '';
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const radioKm = parseFloat(searchParams.get('radioKm')) || RADIO_DEFAULT_KM;

    const usarCercania = Number.isFinite(lat) && Number.isFinite(lng);

    // Mapa userId(ferretero) -> { nombre, distanciaKm } de ferreterías candidatas
    let distanciaPorUser = null;

    if (usarCercania) {
      // $geoNear sobre Ferretero: ferreterías activas con catálogo activo dentro del radio
      const ferreteriasCercanas = await Ferretero.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanciaMetros',
            maxDistance: radioKm * 1000,
            spherical: true,
            query: { activo: true, catalogoActivo: true }
          }
        },
        { $project: { user: 1, nombreNegocio: 1, distanciaMetros: 1 } }
      ]);

      distanciaPorUser = new Map(
        ferreteriasCercanas.map(f => [
          f.user.toString(),
          {
            nombre: f.nombreNegocio,
            distanciaKm: Math.round((f.distanciaMetros / 1000) * 10) / 10
          }
        ])
      );

      if (distanciaPorUser.size === 0) {
        return NextResponse.json([]);
      }
    } else {
      // Sin cercanía: todos los catálogos activos (comportamiento previo)
      const ferreterosActivos = await Ferretero.find({ activo: true, catalogoActivo: true }).select('user nombreNegocio');
      distanciaPorUser = new Map(
        ferreterosActivos.map(f => [f.user.toString(), { nombre: f.nombreNegocio, distanciaKm: null }])
      );
    }

    const userIds = [...distanciaPorUser.keys()];

    const filtro = { ferretero: { $in: userIds }, activo: true };
    if (categoria) filtro.categoria = categoria;
    if (q) {
      filtro.$or = [
        { nombre: { $regex: q, $options: 'i' } },
        { marca: { $regex: q, $options: 'i' } },
        { descripcion: { $regex: q, $options: 'i' } }
      ];
    }

    const materiales = await Material.find(filtro).limit(50).lean();

    // Adjuntar ferretería de origen + distancia a cada material
    const resultado = materiales.map(m => {
      const info = distanciaPorUser.get(m.ferretero.toString()) || { nombre: '', distanciaKm: null };
      return {
        ...m,
        ferreteria: { _id: m.ferretero, nombre: info.nombre },
        distanciaKm: info.distanciaKm
      };
    });

    // Con cercanía: ordenar por distancia ascendente; sin cercanía: por nombre
    if (usarCercania) {
      resultado.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));
    } else {
      resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error en GET /api/materiales/buscar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
