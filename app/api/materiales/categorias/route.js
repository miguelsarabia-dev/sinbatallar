// app/api/materiales/categorias/route.js
// GET /api/materiales/categorias
// Devuelve la lista de categorías únicas del catálogo activo
// Usado por el formulario de nuevo material y el filtro del buscador
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Material from '@/models/Material';
import Ferretero from '@/models/Ferretero';

// Categorías base siempre disponibles como sugerencia
const CATEGORIAS_BASE = [
  'Construcción',
  'Plomería',
  'Electricidad',
  'Pintura',
  'Herramientas',
  'Madera y Carpintería',
  'Impermeabilización',
  'Pisos y Recubrimientos',
  'Iluminación',
  'Ferretería General',
  'Jardinería',
  'Seguridad',
  'Otro'
];

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const ferreteroUserId = searchParams.get('ferreteroUserId');

    const filtro = { activo: true };

    if (ferreteroUserId) {
      filtro.ferretero = ferreteroUserId;
    } else {
      const ferreterosActivos = await Ferretero.find({ activo: true, catalogoActivo: true }).select('user');
      const userIds = ferreterosActivos.map(f => f.user);
      filtro.ferretero = { $in: userIds };
    }

    const categoriasEnBD = await Material.distinct('categoria', filtro);

    // Unir categorías de BD con las base, sin duplicados, ordenadas
    const todas = [...new Set([...CATEGORIAS_BASE, ...categoriasEnBD])].sort();

    return NextResponse.json(todas);
  } catch (error) {
    console.error('Error en GET /api/materiales/categorias:', error);
    return NextResponse.json(CATEGORIAS_BASE);
  }
}
