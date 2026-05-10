// app/api/materiales/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Material from '@/models/Material';
import Ferretero from '@/models/Ferretero';

// GET /api/materiales
// Query: ?ferreteroUserId=  ?categoria=  ?soloActivos=true
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const ferreteroUserId = searchParams.get('ferreteroUserId');
    const categoria = searchParams.get('categoria');
    const soloActivos = searchParams.get('soloActivos') !== 'false';

    const filtro = {};

    if (ferreteroUserId) {
      filtro.ferretero = ferreteroUserId;
    } else {
      // Sin filtro de ferretero → solo mostrar materiales de catálogos activos
      const ferreterosActivos = await Ferretero.find({ activo: true, catalogoActivo: true }).select('user');
      const userIds = ferreterosActivos.map(f => f.user);
      filtro.ferretero = { $in: userIds };
    }

    if (soloActivos) filtro.activo = true;
    if (categoria) filtro.categoria = categoria;

    const materiales = await Material.find(filtro)
      .populate('ferretero', 'nombre')
      .sort({ categoria: 1, nombre: 1 });

    return NextResponse.json(materiales);
  } catch (error) {
    console.error('Error en GET /api/materiales:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/materiales
// Body: { nombre, descripcion, categoria, marca, unidad, precio, ferreteroUserId, imagenUrl, imagenPublicId }
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { nombre, categoria, unidad, precio, ferreteroUserId } = body;

    if (!nombre || !categoria || !unidad || precio === undefined || !ferreteroUserId) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, categoria, unidad, precio, ferreteroUserId' },
        { status: 400 }
      );
    }

    if (precio < 0) {
      return NextResponse.json({ error: 'El precio no puede ser negativo' }, { status: 400 });
    }

    const material = await Material.create({
      nombre: body.nombre,
      descripcion: body.descripcion || '',
      categoria: body.categoria,
      marca: body.marca || '',
      unidad: body.unidad,
      precio: parseFloat(body.precio),
      imagenUrl: body.imagenUrl || '',
      imagenPublicId: body.imagenPublicId || '',
      ferretero: ferreteroUserId
    });

    return NextResponse.json(
      { message: 'Material creado exitosamente', material },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en POST /api/materiales:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
