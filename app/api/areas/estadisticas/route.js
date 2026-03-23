import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Area from '@/models/Area';

// Función para consultar Overpass API (OpenStreetMap)
async function consultarOverpassAPI(poligono) {
  try {
    // Convertir coordenadas del polígono al formato de Overpass
    const coords = poligono.coordinates[0];
    const polyCoords = coords.map(c => `${c[1]} ${c[0]}`).join(' ');

    // Query de Overpass API para contar edificios residenciales y comerciales
    const query = `
      [out:json][timeout:15];
      (
        // Edificios residenciales (viviendas)
        way(poly:"${polyCoords}")["building"~"residential|house|apartments|detached|semidetached_house|terrace|bungalow"];
        
        // Negocios y comercios
        node(poly:"${polyCoords}")["shop"];
        way(poly:"${polyCoords}")["shop"];
        node(poly:"${polyCoords}")["amenity"~"restaurant|cafe|bar|fast_food|bank|pharmacy"];
        way(poly:"${polyCoords}")["amenity"~"restaurant|cafe|bar|fast_food|bank|pharmacy"];
        
        // Todos los edificios
        way(poly:"${polyCoords}")["building"];
      );
      out count;
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 segundos timeout

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Overpass API error response:', response.status, errorText);
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    // Procesar resultados
    let viviendas = 0;
    let negocios = 0;
    let edificios = 0;

    if (data.elements) {
      data.elements.forEach(element => {
        if (element.tags) {
          const { building, shop, amenity, office } = element.tags;

          // Contar viviendas
          if (building && ['residential', 'house', 'apartments', 'detached', 'semidetached_house', 'terrace', 'bungalow'].includes(building)) {
            viviendas++;
          }

          // Contar negocios
          if (shop || office || (amenity && ['restaurant', 'cafe', 'bar', 'fast_food', 'bank', 'pharmacy', 'clinic', 'hospital'].includes(amenity))) {
            negocios++;
          }

          // Contar edificios totales
          if (building) {
            edificios++;
          }
        }
      });
    }

    // Si no hay datos exactos de OSM, hacer una estimación basada en el área
    if (viviendas === 0 && edificios === 0) {
      const area = calcularAreaPoligono(poligono);
      // Estimación conservadora: 15 viviendas por km², 8 negocios por km²
      viviendas = Math.round(area * 15);
      negocios = Math.round(area * 8);
      edificios = Math.round(area * 23);
    }

    return { viviendas, negocios, edificios };
  } catch (error) {
    console.error('Error consultando Overpass API:', error.message);

    // Fallback: estimación basada en área del polígono
    const area = calcularAreaPoligono(poligono);
    console.log(`Usando estimación por área (${area.toFixed(2)} km²)`);
    return {
      viviendas: Math.round(area * 15),
      negocios: Math.round(area * 8),
      edificios: Math.round(area * 23),
    };
  }
}

// Función para calcular área de un polígono (en km²)
function calcularAreaPoligono(poligono) {
  const coords = poligono.coordinates[0];
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    area += (lon2 - lon1) * (lat2 + lat1);
  }

  area = Math.abs(area / 2);

  // Convertir a km² (aproximado usando la fórmula de Mercator)
  const latMedia = coords[0][1];
  const kmSquared = area * 111.32 * 111.32 * Math.cos((latMedia * Math.PI) / 180);

  return kmSquared;
}

// POST - Actualizar estadísticas de un área específica
export async function POST(request) {
  try {



    const { areaId } = await request.json();

    if (!areaId) {
      return NextResponse.json(
        { error: 'ID del área es requerido' },
        { status: 400 }
      );
    }

    await connectDB();

    const area = await Area.findById(areaId);
    if (!area) {
      return NextResponse.json(
        { error: 'Área no encontrada' },
        { status: 404 }
      );
    }

    // Consultar estadísticas usando Overpass API
    console.log(`Consultando estadísticas para área: ${area.nombre}`);
    const estadisticas = await consultarOverpassAPI(area.poligono);

    console.log(`Estadísticas calculadas para ${area.nombre}:`, estadisticas);

    // Inicializar estadisticas si no existe
    if (!area.estadisticas) {
      area.estadisticas = {
        viviendas: 0,
        negocios: 0,
        edificios: 0,
        ultimaActualizacion: null
      };
    }

    // Actualizar valores
    area.estadisticas.viviendas = estadisticas.viviendas || 0;
    area.estadisticas.negocios = estadisticas.negocios || 0;
    area.estadisticas.edificios = estadisticas.edificios || 0;
    area.estadisticas.ultimaActualizacion = new Date();

    // Marcar como modificado y guardar
    area.markModified('estadisticas');
    await area.save();

    // Verificar en DB
    const areaVerificada = await Area.findById(areaId);
    console.log(`Área verificada en DB:`, {
      nombre: areaVerificada.nombre,
      estadisticas: areaVerificada.estadisticas
    });

    return NextResponse.json({
      success: true,
      estadisticas: area.estadisticas,
    });
  } catch (error) {
    console.error('Error actualizando estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener estadísticas de todas las áreas o de una específica
export async function GET(request) {
  try {



    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('areaId');
    const actualizarTodas = searchParams.get('actualizarTodas') === 'true';

    await connectDB();

    if (areaId) {
      // Obtener estadísticas de un área específica
      const area = await Area.findById(areaId);
      if (!area) {
        return NextResponse.json(
          { error: 'Área no encontrada' },
          { status: 404 }
        );
      }

      // Retornar las estadísticas existentes sin actualizar automáticamente
      // Para actualizar, usar el método POST
      return NextResponse.json(area.estadisticas || {
        viviendas: 0,
        negocios: 0,
        edificios: 0,
        ultimaActualizacion: null
      });
    }

    if (actualizarTodas) {
      // Actualizar estadísticas de todas las áreas
      const areas = await Area.find();
      const resultados = [];

      for (const area of areas) {
        try {
          console.log(`Actualizando estadísticas de: ${area.nombre}`);
          const estadisticas = await consultarOverpassAPI(area.poligono);

          // Inicializar estadisticas si no existe
          if (!area.estadisticas) {
            area.estadisticas = {
              viviendas: 0,
              negocios: 0,
              edificios: 0,
              ultimaActualizacion: null
            };
          }

          // Actualizar valores
          area.estadisticas.viviendas = estadisticas.viviendas || 0;
          area.estadisticas.negocios = estadisticas.negocios || 0;
          area.estadisticas.edificios = estadisticas.edificios || 0;
          area.estadisticas.ultimaActualizacion = new Date();

          // Marcar como modificado y guardar
          area.markModified('estadisticas');
          await area.save();

          resultados.push({
            areaId: area._id,
            nombre: area.nombre,
            estadisticas: area.estadisticas,
          });

          // Pequeña pausa para no saturar la API de Overpass
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error actualizando área ${area.nombre}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        areasActualizadas: resultados.length,
        resultados,
      });
    }

    // Obtener estadísticas de todas las áreas
    const areas = await Area.find().select('nombre estadisticas');
    return NextResponse.json(areas);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
