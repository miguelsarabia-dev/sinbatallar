// app/api/materiales/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Material from '@/models/Material';

// GET /api/materiales/[id]
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const material = await Material.findById(id).populate('ferretero', 'nombre email');
    if (!material) {
      return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 });
    }

    return NextResponse.json(material);
  } catch (error) {
    console.error('Error en GET /api/materiales/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/materiales/[id]
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const material = await Material.findById(id);
    if (!material) {
      return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 });
    }

    const camposPermitidos = ['nombre', 'descripcion', 'categoria', 'marca', 'unidad', 'precio', 'imagenUrl', 'imagenPublicId', 'activo'];
    camposPermitidos.forEach(campo => {
      if (body[campo] !== undefined) material[campo] = body[campo];
    });

    if (body.precio !== undefined && parseFloat(body.precio) < 0) {
      return NextResponse.json({ error: 'El precio no puede ser negativo' }, { status: 400 });
    }

    if (body.precio !== undefined) material.precio = parseFloat(body.precio);

    await material.save();

    return NextResponse.json({ message: 'Material actualizado', material });
  } catch (error) {
    console.error('Error en PUT /api/materiales/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/materiales/[id]
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const material = await Material.findByIdAndDelete(id);
    if (!material) {
      return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Material eliminado correctamente' });
  } catch (error) {
    console.error('Error en DELETE /api/materiales/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
