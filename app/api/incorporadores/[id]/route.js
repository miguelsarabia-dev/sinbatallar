import { NextResponse } from 'next/server';
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
    
    const { id } = params;
    
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
