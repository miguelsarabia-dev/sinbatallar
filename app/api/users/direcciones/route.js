import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { NextResponse } from 'next/server';

// GET: Obtener todas las direcciones de un usuario
export async function GET(request) {
  await connectDB();

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        error: 'userId es requerido'
      }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({
        error: 'Usuario no encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      direcciones: user.direcciones || []
    });

  } catch (error) {
    console.error('Error al obtener direcciones:', error);
    return NextResponse.json({
      error: 'Error al obtener direcciones',
      details: error.message
    }, { status: 500 });
  }
}

// POST: Agregar nueva dirección
export async function POST(request) {
  await connectDB();

  try {
    const { userId, direccion } = await request.json();

    if (!userId || !direccion) {
      return NextResponse.json({
        error: 'userId y direccion son requeridos'
      }, { status: 400 });
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({
        error: 'Usuario no encontrado'
      }, { status: 404 });
    }

    // Inicializar el array de direcciones si no existe
    if (!user.direcciones) {
      user.direcciones = [];
    }

    // Agregar la nueva dirección
    user.direcciones.push({
      calle: direccion.calle || '',
      numeroCasa: direccion.numeroCasa || '',
      colonia: direccion.colonia || '',
      municipio: direccion.municipio || '',
      estado: direccion.estado || '',
      codigoPostal: direccion.codigoPostal || '',
      referencia: direccion.referencia || '',
      coordenadas: {
        lat: direccion.coordenadas?.lat || direccion.lat || null,
        lng: direccion.coordenadas?.lng || direccion.lng || null
      }
    });

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Dirección agregada correctamente',
      direcciones: user.direcciones
    });

  } catch (error) {
    console.error('Error al agregar dirección:', error);
    return NextResponse.json({
      error: 'Error al agregar dirección',
      details: error.message
    }, { status: 500 });
  }
}

// PUT: Actualizar una dirección existente
export async function PUT(request) {
  await connectDB();

  try {
    const { userId, direccionId, direccion } = await request.json();

    if (!userId || !direccionId || !direccion) {
      return NextResponse.json({
        error: 'userId, direccionId y direccion son requeridos'
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

    // Buscar la dirección por su _id
    const direccionIndex = user.direcciones.findIndex(
      dir => dir._id.toString() === direccionId
    );

    if (direccionIndex === -1) {
      return NextResponse.json({
        error: 'Dirección no encontrada'
      }, { status: 404 });
    }

    // Actualizar la dirección
    user.direcciones[direccionIndex] = {
      _id: user.direcciones[direccionIndex]._id, // Mantener el mismo _id
      calle: direccion.calle || '',
      numeroCasa: direccion.numeroCasa || '',
      colonia: direccion.colonia || '',
      municipio: direccion.municipio || '',
      estado: direccion.estado || '',
      codigoPostal: direccion.codigoPostal || '',
      referencia: direccion.referencia || '',
      coordenadas: {
        lat: direccion.coordenadas?.lat || direccion.lat || null,
        lng: direccion.coordenadas?.lng || direccion.lng || null
      }
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Dirección actualizada correctamente',
      direcciones: user.direcciones
    });

  } catch (error) {
    console.error('Error al actualizar dirección:', error);
    return NextResponse.json({
      error: 'Error al actualizar dirección',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE: Eliminar una dirección
export async function DELETE(request) {
  await connectDB();

  try {
    const { userId, direccionId } = await request.json();

    if (!userId || !direccionId) {
      return NextResponse.json({
        error: 'userId y direccionId son requeridos'
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

    // Filtrar para eliminar la dirección
    const direccionesOriginales = user.direcciones.length;
    user.direcciones = user.direcciones.filter(
      dir => dir._id.toString() !== direccionId
    );

    if (user.direcciones.length === direccionesOriginales) {
      return NextResponse.json({
        error: 'Dirección no encontrada'
      }, { status: 404 });
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Dirección eliminada correctamente',
      direcciones: user.direcciones
    });

  } catch (error) {
    console.error('Error al eliminar dirección:', error);
    return NextResponse.json({
      error: 'Error al eliminar dirección',
      details: error.message
    }, { status: 500 });
  }
}
