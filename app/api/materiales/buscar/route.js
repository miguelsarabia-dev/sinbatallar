// app/api/materiales/buscar/route.js
// GET /api/materiales/buscar?q=cemento&categoria=Construcción
// Usado por el BuscadorMateriales en el modal de cotización del contratista
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Material from '@/models/Material';
import Ferretero from '@/models/Ferretero';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const categoria = searchParams.get('categoria') || '';

    // Solo materiales de catálogos activos
    const ferreterosActivos = await Ferretero.find({ activo: true, catalogoActivo: true }).select('user');
    const userIds = ferreterosActivos.map(f => f.user);

    const filtro = {
      ferretero: { $in: userIds },
      activo: true
    };

    if (categoria) filtro.categoria = categoria;

    if (q) {
      // Búsqueda por texto si hay índice text, con fallback a regex
      try {
        filtro.$text = { $search: q };
      } catch {
        filtro.$or = [
          { nombre: { $regex: q, $options: 'i' } },
          { marca: { $regex: q, $options: 'i' } },
          { descripcion: { $regex: q, $options: 'i' } }
        ];
      }
    }

    const materiales = await Material.find(filtro)
      .populate('ferretero', 'nombre')
      .limit(20)
      .sort({ nombre: 1 });

    return NextResponse.json(materiales);
  } catch (error) {
    // Fallback a regex si $text falla (índice no creado todavía)
    try {
      const { searchParams } = new URL(request.url);
      const q = searchParams.get('q')?.trim() || '';
      const categoria = searchParams.get('categoria') || '';

      const ferreterosActivos = await Ferretero.find({ activo: true, catalogoActivo: true }).select('user');
      const userIds = ferreterosActivos.map(f => f.user);

      const filtro = { ferretero: { $in: userIds }, activo: true };
      if (categoria) filtro.categoria = categoria;
      if (q) {
        filtro.$or = [
          { nombre: { $regex: q, $options: 'i' } },
          { marca: { $regex: q, $options: 'i' } },
          { descripcion: { $regex: q, $options: 'i' } }
        ];
      }

      const materiales = await Material.find(filtro)
        .populate('ferretero', 'nombre')
        .limit(20)
        .sort({ nombre: 1 });

      return NextResponse.json(materiales);
    } catch (fallbackError) {
      console.error('Error en GET /api/materiales/buscar:', fallbackError);
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }
}
