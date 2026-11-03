// GET /api/admin/comisiones?liberacion=pendiente|liberada — solo admin. Comisiones con la
// ganancia del técnico y su estado de liberación (la libera el contratista).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Comision from '@/models/Comision';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    const liberacion = new URL(request.url).searchParams.get('liberacion');
    const filtro = liberacion ? { 'liberacionTecnico.estado': liberacion, 'distribucion.tecnico.monto': { $gt: 0 } } : {};

    const comisiones = await Comision.find(filtro)
      .sort({ createdAt: -1 })
      .limit(300)
      .populate({
        path: 'cita',
        select: 'cliente servicio tecnico',
        populate: [
          { path: 'cliente', select: 'nombre' },
          { path: 'servicio', select: 'nombre' },
          { path: 'tecnico', select: 'user', populate: { path: 'user', select: 'nombre' } }
        ]
      })
      .populate('distribucion.contratista.id', 'nombre');

    return NextResponse.json(comisiones);
  } catch (error) {
    console.error('Error en GET /api/admin/comisiones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
