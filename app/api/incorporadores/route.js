import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Incorporador from '@/models/Incorporador';
import User from '@/models/User';
import Contratista from '@/models/Contratista';

// GET - Obtener todos los incorporadores o uno por userId
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const incorporadorId = searchParams.get('id');
    
    if (userId) {
      const incorporador = await Incorporador.findOne({ user: userId })
        .populate('user', 'nombre email telefono foto')
        .populate({
          path: 'contratistasIncorporados',
          populate: {
            path: 'servicios',
            select: 'nombre categoria tipo'
          }
        });
      
      if (!incorporador) {
        return NextResponse.json(
          { message: 'Incorporador no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(incorporador);
    }
    
    if (incorporadorId) {
      const incorporador = await Incorporador.findById(incorporadorId)
        .populate('user', 'nombre email telefono foto')
        .populate({
          path: 'contratistasIncorporados',
          populate: {
            path: 'servicios',
            select: 'nombre categoria tipo'
          }
        });
      
      if (!incorporador) {
        return NextResponse.json(
          { message: 'Incorporador no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(incorporador);
    }
    
    // Obtener todos los incorporadores
    const incorporadores = await Incorporador.find()
      .populate('user', 'nombre email telefono foto')
      .populate({
        path: 'contratistasIncorporados',
        select: 'nombre email telefono activo calificacionNivel'
      })
      .sort({ createdAt: -1 });
    
    return NextResponse.json(incorporadores);
  } catch (error) {
    console.error('Error obteniendo incorporadores:', error);
    return NextResponse.json(
      { message: 'Error al obtener incorporadores', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo incorporador
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, porcentajeComision, observaciones } = body;
    
    if (!userId) {
      return NextResponse.json(
        { message: 'El ID de usuario es requerido' },
        { status: 400 }
      );
    }
    
    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar que no existe ya un incorporador para este usuario
    const incorporadorExistente = await Incorporador.findOne({ user: userId });
    if (incorporadorExistente) {
      return NextResponse.json(
        { message: 'Ya existe un incorporador para este usuario' },
        { status: 400 }
      );
    }
    
    // Actualizar el rol del usuario a 'incorporador'
    user.role = 'incorporador';
    await user.save();
    
    // Crear el incorporador
    const nuevoIncorporador = await Incorporador.create({
      user: userId,
      configuracion: {
        porcentajeComision: porcentajeComision || 0,
        notificaciones: {
          nuevoContratista: true,
          reportesSemanal: true
        }
      },
      observaciones: observaciones || ''
    });
    
    const incorporadorCompleto = await Incorporador.findById(nuevoIncorporador._id)
      .populate('user', 'nombre email telefono');
    
    return NextResponse.json(incorporadorCompleto, { status: 201 });
  } catch (error) {
    console.error('Error creando incorporador:', error);
    return NextResponse.json(
      { message: 'Error al crear incorporador', error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un incorporador
export async function PUT(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { incorporadorId, activo, porcentajeComision, observaciones, notificaciones } = body;
    
    if (!incorporadorId) {
      return NextResponse.json(
        { message: 'El ID del incorporador es requerido' },
        { status: 400 }
      );
    }
    
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
      if (typeof notificaciones.nuevoContratista !== 'undefined') {
        updateData['configuracion.notificaciones.nuevoContratista'] = notificaciones.nuevoContratista;
      }
      if (typeof notificaciones.reportesSemanal !== 'undefined') {
        updateData['configuracion.notificaciones.reportesSemanal'] = notificaciones.reportesSemanal;
      }
    }
    
    const incorporadorActualizado = await Incorporador.findByIdAndUpdate(
      incorporadorId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('user', 'nombre email telefono');
    
    if (!incorporadorActualizado) {
      return NextResponse.json(
        { message: 'Incorporador no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(incorporadorActualizado);
  } catch (error) {
    console.error('Error actualizando incorporador:', error);
    return NextResponse.json(
      { message: 'Error al actualizar incorporador', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un incorporador
export async function DELETE(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const incorporadorId = searchParams.get('id');
    
    if (!incorporadorId) {
      return NextResponse.json(
        { message: 'El ID del incorporador es requerido' },
        { status: 400 }
      );
    }
    
    const incorporador = await Incorporador.findById(incorporadorId);
    
    if (!incorporador) {
      return NextResponse.json(
        { message: 'Incorporador no encontrado' },
        { status: 404 }
      );
    }
    
    // Actualizar el rol del usuario de vuelta a 'cliente'
    await User.findByIdAndUpdate(incorporador.user, { role: 'cliente' });
    
    // Quitar la referencia del incorporador en los contratistas que incorporó
    await Contratista.updateMany(
      { incorporador: incorporadorId },
      { $set: { incorporador: null } }
    );
    
    // Eliminar el incorporador
    await Incorporador.findByIdAndDelete(incorporadorId);
    
    return NextResponse.json({ message: 'Incorporador eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando incorporador:', error);
    return NextResponse.json(
      { message: 'Error al eliminar incorporador', error: error.message },
      { status: 500 }
    );
  }
}
