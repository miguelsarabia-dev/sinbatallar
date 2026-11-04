// PATCH /api/calificaciones/:id { oculta: boolean, motivo? } — solo admin (moderación de reseñas abusivas).
// Ocultar excluye la reseña del promedio del contratista/técnico y de los listados públicos.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Calificacion from '@/models/Calificacion';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { recalcularPromedio } from '@/lib/calificaciones';

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Calificación no encontrada' }, { status: 404 });
    const { oculta, motivo } = await request.json();
    if (typeof oculta !== 'boolean') return NextResponse.json({ error: 'oculta debe ser true o false' }, { status: 400 });
    if (oculta && (typeof motivo !== 'string' || !motivo.trim())) {
      return NextResponse.json({ error: 'Se requiere un motivo para ocultar la reseña' }, { status: 400 });
    }

    const calificacion = await Calificacion.findByIdAndUpdate(
      id,
      { oculta, motivoOculta: oculta ? motivo.trim() : '', ocultadaPor: oculta ? session.id : null },
      { new: true }
    );
    if (!calificacion) return NextResponse.json({ error: 'Calificación no encontrada' }, { status: 404 });

    const promedio = await recalcularPromedio(calificacion.tipoCalificado, calificacion.calificado);
    return NextResponse.json({ success: true, calificacion, promedio });
  } catch (error) {
    console.error('Error en PATCH /api/calificaciones/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
