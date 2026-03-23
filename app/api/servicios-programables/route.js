// app/api/servicios-programables/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Servicio from '@/models/Servicio';
import Contratista from '@/models/Contratista';

// GET: Obtener servicios programables con contratistas que los ofrecen
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const ubicacionCliente = searchParams.get('ubicacion'); // lat,lng para calcular distancia
    
    let filtroServicios = { tipo: 'programable' };
    if (categoria) {
      filtroServicios.categoria = categoria;
    }
    
    // Obtener servicios programables
    const servicios = await Servicio.find(filtroServicios);
    
    // Para cada servicio, encontrar contratistas que lo ofrecen
    const serviciosConContratistas = [];
    
    for (const servicio of servicios) {
      // Buscar contratistas activos que ofrecen este servicio
      const contratistas = await Contratista.find({
        servicios: servicio._id,
        activo: true // Asumiendo que hay un campo activo
      }).populate('servicios', 'nombre descripcion categoria')
        .select('nombre direccion telefono email calificacion ubicacion servicios');
      
      if (contratistas.length > 0) {
        // Calcular distancia si se proporciona ubicación del cliente
        let contratistasConDistancia = contratistas;
        
        if (ubicacionCliente) {
          const [lat, lng] = ubicacionCliente.split(',').map(parseFloat);
          contratistasConDistancia = contratistas.map(contratista => {
            let distancia = null;
            if (contratista.ubicacion && contratista.ubicacion.lat && contratista.ubicacion.lng) {
              // Fórmula simple de distancia euclidiana (para demo)
              const deltaLat = lat - contratista.ubicacion.lat;
              const deltaLng = lng - contratista.ubicacion.lng;
              distancia = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) * 111; // Aprox km
            }
            return {
              ...contratista.toObject(),
              distancia: distancia ? Math.round(distancia * 10) / 10 : null
            };
          });
          
          // Ordenar por distancia (más cercanos primero)
          contratistasConDistancia.sort((a, b) => {
            if (a.distancia === null) return 1;
            if (b.distancia === null) return -1;
            return a.distancia - b.distancia;
          });
        }
        
        serviciosConContratistas.push({
          servicio: {
            _id: servicio._id,
            nombre: servicio.nombre,
            descripcion: servicio.descripcion,
            categoria: servicio.categoria,
            tipo: servicio.tipo
          },
          contratistas: contratistasConDistancia,
          totalContratistas: contratistas.length
        });
      }
    }
    
    // Obtener categorías únicas
    const categorias = [...new Set(serviciosConContratistas.map(sc => sc.servicio.categoria))];
    
    return NextResponse.json({
      servicios: serviciosConContratistas,
      categorias,
      total: serviciosConContratistas.length
    });
    
  } catch (error) {
    console.error('Error al obtener servicios programables:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
