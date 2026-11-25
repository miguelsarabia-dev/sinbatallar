// PATCH /api/inicial/sueldos/[id] — solo admin. Marca un sueldo semanal como pagado (o lo regresa a pendiente o lo
// cancela) y permite corregir el monto antes de pagarlo.
// Body: { estado?: 'pendiente'|'pagado'|'cancelado', referencia?: string, monto?: number }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import PagoSueldo from '@/models/PagoSueldo';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { sueldoValido } from '@/lib/inicial-cuentas';

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const pago = await PagoSueldo.findById(id);
    if (!pago) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const cambios = {};
    if (body.estado !== undefined) {
      if (!['pendiente', 'pagado', 'cancelado'].includes(body.estado)) {
        return NextResponse.json({ error: 'estado inválido' }, { status: 400 });
      }
      cambios.estado = body.estado;
      cambios.fechaPago = body.estado === 'pagado' ? new Date() : null;
    }
    if (body.referencia !== undefined) {
      if (typeof body.referencia !== 'string') return NextResponse.json({ error: 'referencia inválida' }, { status: 400 });
      cambios.referencia = body.referencia.trim();
    }
    if (body.monto !== undefined) {
      if (pago.estado === 'pagado' && cambios.estado !== 'pendiente') {
        return NextResponse.json({ error: 'No se puede cambiar el monto de un sueldo ya pagado' }, { status: 409 });
      }
      if (!sueldoValido(body.monto)) return NextResponse.json({ error: 'monto inválido' }, { status: 400 });
      cambios.monto = body.monto;
    }
    if (!Object.keys(cambios).length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

    const actualizado = await PagoSueldo.findByIdAndUpdate(id, { $set: cambios }, { new: true, runValidators: true }).lean();
    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('Error en PATCH /inicial/sueldos/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
