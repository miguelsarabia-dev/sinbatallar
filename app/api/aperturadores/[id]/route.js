import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { perfilIdDe } from '@/lib/perfiles';

import { connectDB } from '@/lib/mongoose';
import Aperturador from '@/models/Aperturador';
import User from '@/models/User';
import Area from '@/models/Area';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['aperturador', 'admin']);
    if (error) return error;
    
    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    if (session.role === 'aperturador' && id !== await perfilIdDe(session)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }
    
    const aperturador = await Aperturador.findById(id)
      .populate('user', 'nombre email telefono foto')
      .populate({
        path: 'areasCreadas',
        select: 'nombre descripcion clasificacion estadisticas createdAt'
      });
    
    if (!aperturador) {
      return NextResponse.json(
        { message: 'Aperturador no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(aperturador);
  } catch (error) {
    console.error('Error obteniendo aperturador:', error);
    return NextResponse.json(
      { message: 'Error al obtener aperturador', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    const body = await request.json();
    
    const { activo, porcentajeComision, observaciones, notificaciones } = body;
    
    const updateData = {};
    
    if (typeof activo !== 'undefined') {
      updateData.activo = activo;
    }
    
    if (typeof porcentajeComision !== 'undefined') {
      updateData['configuracion.porcentajeComision'] = porcentajeComision;
    }
    
    if (observaciones !== undefined) {
      updateData.observaciones = observaciones;
    }
    
    if (notificaciones) {
      if (typeof notificaciones.nuevoServicio !== 'undefined') {
        updateData['configuracion.notificaciones.nuevoServicio'] = notificaciones.nuevoServicio;
      }
      if (typeof notificaciones.reportesSemanal !== 'undefined') {
        updateData['configuracion.notificaciones.reportesSemanal'] = notificaciones.reportesSemanal;
      }
    }
    
    const aperturadorActualizado = await Aperturador.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('user', 'nombre email telefono');
    
    if (!aperturadorActualizado) {
      return NextResponse.json(
        { message: 'Aperturador no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(aperturadorActualizado);
  } catch (error) {
    console.error('Error actualizando aperturador:', error);
    return NextResponse.json(
      { message: 'Error al actualizar aperturador', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    
    const aperturador = await Aperturador.findById(id);
    
    if (!aperturador) {
      return NextResponse.json(
        { message: 'Aperturador no encontrado' },
        { status: 404 }
      );
    }
    
    // Actualizar el rol del usuario de vuelta a 'cliente'
    await User.findByIdAndUpdate(aperturador.user, { role: 'cliente' });
    
    // Eliminar la referencia del aperturador en las áreas que creó
    await Area.updateMany(
      { aperturador: id },
      { $set: { aperturador: null } }
    );
    
    // Eliminar el aperturador
    await Aperturador.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Aperturador eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando aperturador:', error);
    return NextResponse.json(
      { message: 'Error al eliminar aperturador', error: error.message },
      { status: 500 }
    );
  }
}
