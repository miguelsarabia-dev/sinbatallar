import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { buscarPerfilId } from '@/lib/perfiles';
import { esObjectId } from '@/lib/sanitize';
import { perfilIdDe } from '@/lib/perfiles';

import { connectDB } from '@/lib/mongoose';
import Asociado from '@/models/Asociado';
import User from '@/models/User';
import Contratista from '@/models/Contratista';
import { esAsociado } from '@/lib/roles';

// GET - Obtener todos los asociados o uno por userId
export async function GET(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['asociado', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    // Un asociado solo accede a su propio perfil; el admin a cualquiera.
    const userId = session.role === 'asociado' ? session.id : searchParams.get('userId');
    const asociadoId = searchParams.get('id');
    if (session.role === 'asociado') {
      const miId = await perfilIdDe(session);
      if (asociadoId && asociadoId !== miId) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
      }
    }
    if ((userId && !esObjectId(userId)) || (asociadoId && !esObjectId(asociadoId))) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }
    
    if (userId) {
      let asociado = await Asociado.findById(await buscarPerfilId(Asociado, userId))
        .populate('user', 'nombre email telefono foto')
        .populate({
          path: 'contratistasIncorporados',
          populate: {
            path: 'servicios',
            select: 'nombre categoria tipo'
          }
        });

      // Self-healing: si el usuario tiene rol asociado pero le falta su doc,
      // lo creamos al vuelo. Desbloquea cuentas antiguas creadas antes de que el
      // alta generara el doc automáticamente.
      if (!asociado) {
        const user = await User.findById(userId).select('role');
        if (user && esAsociado(user.role)) {
          await Asociado.create({ user: userId });
          asociado = await Asociado.findOne({ user: userId })
            .populate('user', 'nombre email telefono foto')
            .populate({
              path: 'contratistasIncorporados',
              populate: {
                path: 'servicios',
                select: 'nombre categoria tipo'
              }
            });
        }
      }

      if (!asociado) {
        return NextResponse.json(
          { message: 'Asociado no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json(asociado);
    }
    
    if (asociadoId) {
      const asociado = await Asociado.findById(asociadoId)
        .populate('user', 'nombre email telefono foto')
        .populate({
          path: 'contratistasIncorporados',
          populate: {
            path: 'servicios',
            select: 'nombre categoria tipo'
          }
        });
      
      if (!asociado) {
        return NextResponse.json(
          { message: 'Asociado no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(asociado);
    }
    
    // Obtener todos los asociados
    const asociados = await Asociado.find()
      .populate('user', 'nombre email telefono foto')
      .populate({
        path: 'contratistasIncorporados',
        select: 'nombre email telefono activo calificacionNivel'
      })
      .sort({ createdAt: -1 });
    
    return NextResponse.json(asociados);
  } catch (error) {
    console.error('Error obteniendo asociados:', error);
    return NextResponse.json(
      { message: 'Error al obtener asociados' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo asociado
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
    
    // Idempotente: si ya existe el doc para este usuario, lo devolvemos en vez
    // de rechazar. Permite que el cliente lo use como fallback sin error opaco.
    const asociadoExistente = await Asociado.findOne({ user: userId })
      .populate('user', 'nombre email telefono');
    if (asociadoExistente) {
      return NextResponse.json(asociadoExistente, { status: 200 });
    }

    // Actualizar el rol del usuario a 'asociado'
    user.role = 'asociado';
    await user.save();

    // Crear el asociado
    const nuevoAsociado = await Asociado.create({
      user: userId,
      comision: {
        porcentaje: typeof porcentajeComision === 'number' ? porcentajeComision : 3
      },
      observaciones: observaciones || ''
    });

    const asociadoCompleto = await Asociado.findById(nuevoAsociado._id)
      .populate('user', 'nombre email telefono');

    return NextResponse.json(asociadoCompleto, { status: 201 });
  } catch (error) {
    console.error('Error creando asociado:', error);
    return NextResponse.json(
      { message: 'Error al crear asociado', error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un asociado
export async function PUT(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { asociadoId, activo, porcentajeComision, observaciones } = body;

    if (!asociadoId) {
      return NextResponse.json(
        { message: 'El ID del asociado es requerido' },
        { status: 400 }
      );
    }

    const updateData = {};

    if (typeof activo !== 'undefined') {
      updateData.activo = activo;
    }

    if (typeof porcentajeComision !== 'undefined') {
      updateData['comision.porcentaje'] = porcentajeComision;
    }

    if (observaciones !== undefined) {
      updateData.observaciones = observaciones;
    }

    const asociadoActualizado = await Asociado.findByIdAndUpdate(
      asociadoId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('user', 'nombre email telefono');
    
    if (!asociadoActualizado) {
      return NextResponse.json(
        { message: 'Asociado no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(asociadoActualizado);
  } catch (error) {
    console.error('Error actualizando asociado:', error);
    return NextResponse.json(
      { message: 'Error al actualizar asociado', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un asociado
export async function DELETE(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const asociadoId = searchParams.get('id');
    
    if (!asociadoId) {
      return NextResponse.json(
        { message: 'El ID del asociado es requerido' },
        { status: 400 }
      );
    }
    
    const asociado = await Asociado.findById(asociadoId);
    
    if (!asociado) {
      return NextResponse.json(
        { message: 'Asociado no encontrado' },
        { status: 404 }
      );
    }
    
    // Actualizar el rol del usuario de vuelta a 'cliente'
    await User.findByIdAndUpdate(asociado.user, { role: 'cliente' });
    
    // Quitar la referencia del asociado en los contratistas que incorporó
    await Contratista.updateMany(
      { asociado: asociadoId },
      { $set: { asociado: null } }
    );
    
    // Eliminar el asociado
    await Asociado.findByIdAndDelete(asociadoId);
    
    return NextResponse.json({ message: 'Asociado eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando asociado:', error);
    return NextResponse.json(
      { message: 'Error al eliminar asociado', error: error.message },
      { status: 500 }
    );
  }
}
