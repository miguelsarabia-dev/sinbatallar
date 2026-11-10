// GET /api/cuenta-empresa — datos bancarios de Sin Batallar para que el cliente transfiera su pago.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { getCuentaEmpresa } from '@/lib/cuenta-empresa';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request);
    if (error) return error;
    return NextResponse.json({ informacionPago: await getCuentaEmpresa() });
  } catch (error) {
    console.error('Error en GET cuenta-empresa:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
