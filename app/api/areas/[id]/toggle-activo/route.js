// app/api/areas/[id]/toggle-activo/route.js
// PUT /api/areas/[id]/toggle-activo
// Activa o desactiva un área sin necesidad de reenviar el polígono completo.
// Body: { activo: boolean }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Area from '@/models/Area';

export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const { activo } = await request.json();

    if (typeof activo !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo activo debe ser true o false' },
        { status: 400 }
      );
    }

    const area = await Area.findByIdAndUpdate(
      id,
      { activo },
      { new: true }
    )
      .populate('contratistas', 'nombre email telefono')
      .populate('aperturador');

    if (!area) {
      return NextResponse.json(
        { error: 'Área no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Área ${activo ? 'activada' : 'desactivada'} exitosamente`,
      area
    });

  } catch (error) {
    console.error('Error en PUT /api/areas/[id]/toggle-activo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
