import { connectDB } from '@/lib/mongoose'
import Area from '@/models/Area'
import Contratista from '@/models/Contratista'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

// GET: Obtener un contratista específico por ID
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const contratista = await Contratista.findById(id).populate('servicios');

    if (!contratista) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    return NextResponse.json(contratista);
  } catch (error) {
    console.error('Error al obtener contratista:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT: Actualizar un contratista específico por ID
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const data = await request.json();

    // Si se incluye password, hashearlo
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    }

    // Manejar cambio de área: actualizar el array contratistas en Area
    const contratistaActual = await Contratista.findById(id);
    if (!contratistaActual) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    if (data.areaId !== undefined) {
      const areaAnteriorId = contratistaActual.areaId?.toString();
      const areaNuevaId = data.areaId?.toString();

      // Quitar de área anterior si cambió
      if (areaAnteriorId && areaAnteriorId !== areaNuevaId) {
        await Area.findByIdAndUpdate(areaAnteriorId, {
          $pull: { contratistas: id }
        });
      }

      // Agregar a nueva área si hay una y es distinta
      if (areaNuevaId && areaNuevaId !== areaAnteriorId) {
        await Area.findByIdAndUpdate(areaNuevaId, {
          $addToSet: { contratistas: id }
        });
      }
    }

    // Actualizar el contratista
    const contratista = await Contratista.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true, upsert: false }
    );

    return NextResponse.json(contratista);

  } catch (error) {
    console.error('Error al actualizar contratista:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un contratista específico por ID
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const contratista = await Contratista.findByIdAndDelete(id);

    if (!contratista) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Contratista eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar contratista:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
