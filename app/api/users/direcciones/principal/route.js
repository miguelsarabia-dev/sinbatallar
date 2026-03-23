import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { NextResponse } from 'next/server';

// PUT: Cambiar dirección principal
export async function PUT(request) {
  await connectDB();

  try {
    const { userId, direccionId } = await request.json();

    if (!userId || !direccionId) {
      return NextResponse.json({
        error: 'UserId y direccionId son requeridos'
      }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({
        error: 'Usuario no encontrado'
      }, { status: 404 });
    }

    if (!user.direcciones || user.direcciones.length === 0) {
      return NextResponse.json({
        error: 'El usuario no tiene direcciones'
      }, { status: 404 });
    }

    // Encontrar el índice de la dirección solicitada
    const direccionIndex = user.direcciones.findIndex(
      dir => dir._id.toString() === direccionId
    );

    if (direccionIndex === -1) {
      return NextResponse.json({
        error: 'Dirección no encontrada'
      }, { status: 404 });
    }

    if (direccionIndex === 0) {
      return NextResponse.json({
        success: true,
        message: 'Esta dirección ya es la principal'
      });
    }

    // Mover la dirección al inicio del array (índice 0 = principal)
    const direccion = user.direcciones[direccionIndex];
    user.direcciones.splice(direccionIndex, 1); // Quitar de su posición actual
    user.direcciones.unshift(direccion); // Agregar al inicio

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Dirección principal actualizada exitosamente',
      direcciones: user.direcciones
    });

  } catch (error) {
    console.error('Error al cambiar dirección principal:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
