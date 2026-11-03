// GET /api/admin/comprobantes?estado=vigente|rechazado|reemplazado — solo admin.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Comprobante from '@/models/Comprobante';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    const estado = new URL(request.url).searchParams.get('estado');
    const filtro = estado ? { estado } : {};

    const comprobantes = await Comprobante.find(filtro)
      .sort({ createdAt: -1 })
      .limit(300)
      .populate({
        path: 'cita',
        select: 'cliente servicio estado',
        populate: [
          { path: 'cliente', select: 'nombre email' },
          { path: 'servicio', select: 'nombre' }
        ]
      })
      .populate({
        path: 'cotizacion',
        select: 'total modalidadPago contratista anticipo saldo pagoUnico',
        populate: { path: 'contratista', select: 'nombre email' }
      });

    return NextResponse.json(comprobantes);
  } catch (error) {
    console.error('Error en GET /api/admin/comprobantes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
