// GET /api/admin/reembolsos?estado=pendiente|resuelto — solo admin.
// Se resuelven con PATCH /api/citas/:id/reembolso.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    const estado = new URL(request.url).searchParams.get('estado');
    const filtro = estado ? { 'reembolso.estado': estado } : { 'reembolso.estado': { $in: ['pendiente', 'resuelto'] } };

    const citas = await Cita.find(filtro)
      .sort({ 'reembolso.fecha': -1 })
      .limit(300)
      .select('cliente contratista servicio estado reembolso motivoCancelacion')
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono')
      .populate('servicio', 'nombre');

    return NextResponse.json(citas);
  } catch (error) {
    console.error('Error en GET /api/admin/reembolsos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
