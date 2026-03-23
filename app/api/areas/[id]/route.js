import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Area from '@/models/Area';

// DELETE - Eliminar área
export async function DELETE(request, { params }) {
  try {



    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del área es requerido' },
        { status: 400 }
      );
    }

    await connectDB();

    const area = await Area.findByIdAndDelete(id);

    if (!area) {
      return NextResponse.json(
        { error: 'Área no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Área eliminada exitosamente',
      area: area
    });
  } catch (error) {
    console.error('Error eliminando área:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener área específica
export async function GET(request, { params }) {
  try {



    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del área es requerido' },
        { status: 400 }
      );
    }

    // Validar que el ID sea un ObjectId válido
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { error: 'ID del área no válido' },
        { status: 400 }
      );
    }

    await connectDB();

    const area = await Area.findById(id)
      .populate('contratistas', 'nombre email telefono calificacionNivel');

    if (!area) {
      return NextResponse.json(
        { error: 'Área no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(area);
  } catch (error) {
    console.error('Error obteniendo área:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
