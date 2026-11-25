// GET/PUT /api/admin/modelos — solo admin. Interruptor del modelo permanente (ver lib/modelos-negocio.js).
// Body PUT: { permanenteActivo: boolean }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { getModelosConfig, setModelosConfig } from '@/lib/modelos-config';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;
    return NextResponse.json(await getModelosConfig());
  } catch (error) {
    console.error('Error en GET /admin/modelos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;
    const body = await request.json().catch(() => ({}));
    if (typeof body.permanenteActivo !== 'boolean') {
      return NextResponse.json({ error: 'permanenteActivo debe ser true o false' }, { status: 400 });
    }
    return NextResponse.json(await setModelosConfig({ permanenteActivo: body.permanenteActivo }, session.id));
  } catch (error) {
    console.error('Error en PUT /admin/modelos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
