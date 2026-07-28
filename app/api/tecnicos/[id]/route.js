// app/api/tecnicos/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Tecnico from '@/models/Tecnico';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

// GET /api/tecnicos/[id]
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const tecnico = await Tecnico.findById(id)
      .populate('user', 'nombre email telefono fotoUrl')
      .populate('contratista', 'nombre email');

    if (!tecnico) {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }

    return NextResponse.json(tecnico);
  } catch (error) {
    console.error('Error en GET /api/tecnicos/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/tecnicos/[id]
// Body: { nombre?, telefono?, password?, especialidades?, activo? }
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();

    const tecnico = await Tecnico.findById(id);
    if (!tecnico) {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }

    // Actualizar campos del perfil User
    const userUpdates = {};
    if (body.nombre) userUpdates.nombre = body.nombre;
    if (body.telefono) userUpdates.telefono = body.telefono;
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }
      userUpdates.password = await hashPassword(body.password);
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(tecnico.user, userUpdates);
    }

    // Actualizar campos del perfil Tecnico
    if (body.especialidades !== undefined) tecnico.especialidades = body.especialidades;
    if (body.areasCobertura !== undefined) tecnico.areasCobertura = body.areasCobertura;
    if (body.activo !== undefined) tecnico.activo = body.activo;

    await tecnico.save();

    const tecnicoActualizado = await Tecnico.findById(id)
      .populate('user', 'nombre email telefono fotoUrl')
      .populate('contratista', 'nombre email');

    return NextResponse.json(tecnicoActualizado);
  } catch (error) {
    console.error('Error en PUT /api/tecnicos/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/tecnicos/[id]
// Desactiva al técnico y elimina su User asociado
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const tecnico = await Tecnico.findById(id);
    if (!tecnico) {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }

    await User.findByIdAndDelete(tecnico.user);
    await Tecnico.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Técnico eliminado exitosamente' });
  } catch (error) {
    console.error('Error en DELETE /api/tecnicos/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
