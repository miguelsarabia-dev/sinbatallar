// app/api/ferreteros/[id]/catalogo/route.js
// GET /api/ferreteros/[id]/catalogo
// Devuelve el perfil de la ferretería junto con sus materiales activos en una sola llamada.
// Query opcional:
//   ?soloActivos=false  → incluir también materiales inactivos (para el propio ferretero/admin)
//   ?categoria=Plomería → filtrar el catálogo por categoría
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Ferretero from '@/models/Ferretero';
import Material from '@/models/Material';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const soloActivos = searchParams.get('soloActivos') !== 'false';
    const categoria = searchParams.get('categoria');

    const ferretero = await Ferretero.findById(id).populate('user', 'nombre email telefono fotoUrl');
    if (!ferretero) {
      return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
    }

    // Los materiales referencian al User del ferretero, no al doc Ferretero
    const filtro = { ferretero: ferretero.user._id || ferretero.user };
    if (soloActivos) filtro.activo = true;
    if (categoria) filtro.categoria = categoria;

    const materiales = await Material.find(filtro).sort({ categoria: 1, nombre: 1 });

    return NextResponse.json({
      ferreteria: ferretero,
      totalMateriales: materiales.length,
      materiales
    });
  } catch (error) {
    console.error('Error en GET /api/ferreteros/[id]/catalogo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
