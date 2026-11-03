import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { perfilIdDe } from '@/lib/perfiles';

import { connectDB } from '@/lib/mongoose';
import Incorporador from '@/models/Incorporador';
import User from '@/models/User';
import Contratista from '@/models/Contratista';

// DELETE - Eliminar un incorporador por ID
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { message: 'El ID del incorporador es requerido' },
        { status: 400 }
      );
    }
    
    const incorporador = await Incorporador.findById(id);
    
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
      { incorporador: id },
      { $set: { incorporador: null } }
    );
    
    // Eliminar el incorporador
    await Incorporador.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Incorporador eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando incorporador:', error);
    return NextResponse.json(
      { message: 'Error al eliminar incorporador', error: error.message },
      { status: 500 }
    );
  }
}

// GET - Obtener un incorporador por ID
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['incorporador', 'admin']);
    if (error) return error;
    
    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    if (session.role === 'incorporador' && id !== await perfilIdDe(session)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }
    
    const incorporador = await Incorporador.findById(id)
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
  } catch (error) {
    console.error('Error obteniendo incorporador:', error);
    return NextResponse.json(
      { message: 'Error al obtener incorporador', error: error.message },
      { status: 500 }
    );
  }
}
