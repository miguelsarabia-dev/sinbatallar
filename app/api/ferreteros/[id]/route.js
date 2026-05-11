// app/api/ferreteros/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Ferretero from '@/models/Ferretero';
import User from '@/models/User';
import Material from '@/models/Material';

// GET /api/ferreteros/[id]
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const ferretero = await Ferretero.findById(id).populate('user', 'nombre email telefono fotoUrl');
    if (!ferretero) {
      return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ferretero);
  } catch (error) {
    console.error('Error en GET /api/ferreteros/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/ferreteros/[id]
// Actualiza nombreNegocio, telefono, activo, catalogoActivo
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const ferretero = await Ferretero.findById(id);
    if (!ferretero) {
      return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
    }

    const camposPermitidos = ['nombreNegocio', 'telefono', 'activo', 'catalogoActivo', 'pendienteAprobacion'];
    camposPermitidos.forEach(campo => {
      if (body[campo] !== undefined) ferretero[campo] = body[campo];
    });

    await ferretero.save();

    // Si se desactiva el catálogo, desactivar todos sus materiales también
    if (body.catalogoActivo === false) {
      await Material.updateMany({ ferretero: ferretero.user }, { activo: false });
    }

    return NextResponse.json({ message: 'Ferretero actualizado', ferretero });
  } catch (error) {
    console.error('Error en PUT /api/ferreteros/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/ferreteros/[id]
// Elimina perfil Ferretero, sus materiales y el User asociado
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const ferretero = await Ferretero.findById(id);
    if (!ferretero) {
      return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
    }

    await Material.deleteMany({ ferretero: ferretero.user });
    await User.findByIdAndDelete(ferretero.user);
    await Ferretero.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Ferretero eliminado correctamente' });
  } catch (error) {
    console.error('Error en DELETE /api/ferreteros/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
