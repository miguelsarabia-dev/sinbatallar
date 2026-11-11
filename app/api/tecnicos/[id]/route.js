// app/api/tecnicos/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Tecnico from '@/models/Tecnico';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { requireSession } from '@/lib/session';

// GET /api/tecnicos/[id]
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['contratista', 'tecnico', 'admin']);
    if (error) return error;

    const { id } = await params;

    const tecnico = await Tecnico.findById(id)
      .populate('user', 'nombre email telefono fotoUrl')
      .populate('contratista', 'nombre email');

    if (!tecnico) {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }

    const esDueno = session.role === 'contratista' && tecnico.contratista?._id?.toString() === session.id;
    const esElMismo = session.role === 'tecnico' && tecnico.user?._id?.toString() === session.id;
    if (!esDueno && !esElMismo && session.role !== 'admin') {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }

    return NextResponse.json(tecnico);
  } catch (error) {
    console.error('Error en GET /api/tecnicos/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/tecnicos/[id]
// Body: { nombre?, telefono?, password?, especialidades?, areasCobertura?, activo?, porcentajeGanancia? }
// Solo el contratista dueño del técnico (o admin); el propio técnico puede editar su perfil
// pero NO su porcentajeGanancia.
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['contratista', 'admin', 'tecnico']);
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const tecnico = await Tecnico.findById(id);
    if (!tecnico) {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }

    const esDueno = session.role === 'contratista' && tecnico.contratista.toString() === session.id;
    const esElMismo = session.role === 'tecnico' && tecnico.user.toString() === session.id;
    if (!esDueno && !esElMismo && session.role !== 'admin') {
      return NextResponse.json({ error: 'No tienes permiso para editar este técnico' }, { status: 403 });
    }

    // El % del técnico es fijo para todos (config financiera, 5%): ya no lo fija el contratista
    if (body.porcentajeGanancia !== undefined) {
      return NextResponse.json({ error: 'El porcentaje del técnico es fijo y lo define Sin Batallar' }, { status: 400 });
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
    // Las especialidades las define el contratista dueño (o admin); el propio técnico no las cambia
    if (body.especialidades !== undefined) {
      if (!esDueno && session.role !== 'admin') {
        return NextResponse.json({ error: 'Las especialidades las asigna tu contratista' }, { status: 403 });
      }
      if (!Array.isArray(body.especialidades) || body.especialidades.some(e => typeof e !== 'string' || !e.trim())) {
        return NextResponse.json({ error: 'especialidades debe ser una lista de textos' }, { status: 400 });
      }
      tecnico.especialidades = [...new Set(body.especialidades.map(e => e.trim()))];
    }
    if (body.areasCobertura !== undefined) tecnico.areasCobertura = body.areasCobertura;
    // Activar/desactivar la cuenta lo decide el contratista dueño (o admin), no el propio técnico
    if (body.activo !== undefined) {
      if (!esDueno && session.role !== 'admin') {
        return NextResponse.json({ error: 'Solo el contratista puede activar o desactivar al técnico' }, { status: 403 });
      }
      tecnico.activo = body.activo;
    }
    // Disponibilidad para servicios directos: el propio técnico o su contratista
    if (body.disponible !== undefined) {
      if (typeof body.disponible !== 'boolean') {
        return NextResponse.json({ error: 'disponible debe ser true o false' }, { status: 400 });
      }
      tecnico.disponible = body.disponible;
    }

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

    const { session, error } = await requireSession(request, ['contratista', 'admin']);
    if (error) return error;

    const { id } = await params;

    const tecnico = await Tecnico.findById(id);
    if (!tecnico) {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }
    if (session.role === 'contratista' && tecnico.contratista.toString() !== session.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await User.findByIdAndDelete(tecnico.user);
    await Tecnico.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Técnico eliminado exitosamente' });
  } catch (error) {
    console.error('Error en DELETE /api/tecnicos/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
