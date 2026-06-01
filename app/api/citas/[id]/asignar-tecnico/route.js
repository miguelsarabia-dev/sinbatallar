// app/api/citas/[id]/asignar-tecnico/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Tecnico from '@/models/Tecnico';

// POST /api/citas/[id]/asignar-tecnico
// Body: { tecnicoId }
// Solo el contratista dueño de la cita puede asignar un técnico suyo
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const { tecnicoId } = await request.json();

    if (!tecnicoId) {
      return NextResponse.json({ error: 'tecnicoId requerido' }, { status: 400 });
    }

    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    if (!['solicitada', 'atendida', 'cotizada', 'aceptada', 'en_progreso'].includes(cita.estado)) {
      return NextResponse.json(
        { error: 'No se puede asignar técnico en el estado actual de la cita' },
        { status: 400 }
      );
    }

    const tecnico = await Tecnico.findById(tecnicoId).populate('user', 'nombre');
    if (!tecnico) {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 });
    }

    if (!tecnico.activo) {
      return NextResponse.json({ error: 'El técnico está inactivo' }, { status: 400 });
    }

    // Verificar que el técnico pertenece al contratista de la cita
    if (cita.contratista && tecnico.contratista.toString() !== cita.contratista.toString()) {
      return NextResponse.json(
        { error: 'El técnico no pertenece al contratista de esta cita' },
        { status: 403 }
      );
    }

    cita.tecnico = tecnicoId;
    cita.historial.push({
      estado: cita.estado,
      fecha: new Date(),
      comentario: `Técnico ${tecnico.user?.nombre || tecnicoId} asignado`
    });

    await cita.save();

    const citaActualizada = await Cita.findById(id)
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono')
      .populate('servicio', 'nombre descripcion categoria')
      .populate({ path: 'tecnico', populate: { path: 'user', select: 'nombre email telefono' } });

    return NextResponse.json(citaActualizada);
  } catch (error) {
    console.error('Error en POST /api/citas/[id]/asignar-tecnico:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/citas/[id]/asignar-tecnico
// Quita el técnico asignado de la cita
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    cita.tecnico = null;
    cita.historial.push({
      estado: cita.estado,
      fecha: new Date(),
      comentario: 'Técnico desasignado'
    });

    await cita.save();

    return NextResponse.json({ message: 'Técnico desasignado exitosamente' });
  } catch (error) {
    console.error('Error en DELETE /api/citas/[id]/asignar-tecnico:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
