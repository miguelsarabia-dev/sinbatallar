import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Aperturador from '@/models/Aperturador';
import User from '@/models/User';
import Area from '@/models/Area';

// GET - Obtener todos los aperturadores o uno por userId
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (userId) {
      const aperturador = await Aperturador.findOne({ user: userId })
        .populate('user', 'nombre email telefono')
        .populate('areasCreadas');
      
      if (!aperturador) {
        return NextResponse.json(
          { message: 'Aperturador no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(aperturador);
    }
    
    // Obtener todos los aperturadores
    const aperturadores = await Aperturador.find()
      .populate('user', 'nombre email telefono foto')
      .populate('areasCreadas', 'nombre clasificacion estadisticas')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(aperturadores);
  } catch (error) {
    console.error('Error obteniendo aperturadores:', error);
    return NextResponse.json(
      { message: 'Error al obtener aperturadores', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo aperturador
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
    
    // Verificar que no existe ya un aperturador para este usuario
    const aperturadorExistente = await Aperturador.findOne({ user: userId });
    if (aperturadorExistente) {
      return NextResponse.json(
        { message: 'Ya existe un aperturador para este usuario' },
        { status: 400 }
      );
    }
    
    // Actualizar el rol del usuario a 'aperturador'
    user.role = 'aperturador';
    await user.save();
    
    // Crear el aperturador
    const nuevoAperturador = await Aperturador.create({
      user: userId,
      configuracion: {
        porcentajeComision: porcentajeComision || 0,
        notificaciones: {
          nuevoServicio: true,
          reportesSemanal: true
        }
      },
      observaciones: observaciones || ''
    });
    
    const aperturadorCompleto = await Aperturador.findById(nuevoAperturador._id)
      .populate('user', 'nombre email telefono');
    
    return NextResponse.json(aperturadorCompleto, { status: 201 });
  } catch (error) {
    console.error('Error creando aperturador:', error);
    return NextResponse.json(
      { message: 'Error al crear aperturador', error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un aperturador
export async function PUT(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { aperturadorId, activo, porcentajeComision, observaciones, notificaciones } = body;
    
    if (!aperturadorId) {
      return NextResponse.json(
        { message: 'El ID del aperturador es requerido' },
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
      if (typeof notificaciones.nuevoServicio !== 'undefined') {
        updateData['configuracion.notificaciones.nuevoServicio'] = notificaciones.nuevoServicio;
      }
      if (typeof notificaciones.reportesSemanal !== 'undefined') {
        updateData['configuracion.notificaciones.reportesSemanal'] = notificaciones.reportesSemanal;
      }
    }
    
    const aperturadorActualizado = await Aperturador.findByIdAndUpdate(
      aperturadorId,
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

// DELETE - Eliminar un aperturador
export async function DELETE(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const aperturadorId = searchParams.get('id');
    
    if (!aperturadorId) {
      return NextResponse.json(
        { message: 'El ID del aperturador es requerido' },
        { status: 400 }
      );
    }
    
    const aperturador = await Aperturador.findById(aperturadorId);
    
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
      { aperturador: aperturadorId },
      { $set: { aperturador: null } }
    );
    
    // Eliminar el aperturador
    await Aperturador.findByIdAndDelete(aperturadorId);
    
    return NextResponse.json({ message: 'Aperturador eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando aperturador:', error);
    return NextResponse.json(
      { message: 'Error al eliminar aperturador', error: error.message },
      { status: 500 }
    );
  }
}
