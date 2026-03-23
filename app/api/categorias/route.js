// app/api/categorias/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Servicio from '@/models/Servicio';

// GET - Obtener todas las categorías únicas
export async function GET(request) {
  try {
    await connectDB();
    
    // Obtener todas las categorías únicas de los servicios existentes
    const categorias = await Servicio.distinct('categoria');
    
    // Filtrar categorías vacías o null
    const categoriasLimpias = categorias.filter(cat => cat && cat.trim().length > 0);
    
    return NextResponse.json(categoriasLimpias.sort());
    
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
