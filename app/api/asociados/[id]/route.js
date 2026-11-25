import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { perfilIdDe } from '@/lib/perfiles';

import { connectDB } from '@/lib/mongoose';
import Asociado from '@/models/Asociado';
import User from '@/models/User';
import Contratista from '@/models/Contratista';

// DELETE - Eliminar un asociado por ID
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { message: 'El ID del asociado es requerido' },
        { status: 400 }
      );
    }
    
    const asociado = await Asociado.findById(id);
    
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
      { asociado: id },
      { $set: { asociado: null } }
    );
    
    // Eliminar el asociado
    await Asociado.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Asociado eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando asociado:', error);
    return NextResponse.json(
      { message: 'Error al eliminar asociado', error: error.message },
      { status: 500 }
    );
  }
}

// GET - Obtener un asociado por ID
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['asociado', 'admin']);
    if (error) return error;
    
    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    if (session.role === 'asociado' && id !== await perfilIdDe(session)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }
    
    const asociado = await Asociado.findById(id)
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
  } catch (error) {
    console.error('Error obteniendo asociado:', error);
    return NextResponse.json(
      { message: 'Error al obtener asociado', error: error.message },
      { status: 500 }
    );
  }
}
