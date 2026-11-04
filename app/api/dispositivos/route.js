// app/api/dispositivos/route.js
// POST { token, plataforma }: registra (o reasigna al usuario actual) el token de push Expo del dispositivo.
// DELETE { token }: da de baja un token propio (p. ej. al cerrar sesión).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Dispositivo from '@/models/Dispositivo';
import { requireSession } from '@/lib/session';
import { TOKEN_EXPO } from '@/lib/push';

const PLATAFORMAS = ['ios', 'android', 'web'];

export async function POST(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request);
    if (error) return error;

    const { token, plataforma } = await request.json();
    if (typeof token !== 'string' || !TOKEN_EXPO.test(token)) {
      return NextResponse.json({ error: 'token de Expo inválido' }, { status: 400 });
    }

    // Un token pertenece al último usuario que lo registró (mismo teléfono, otra cuenta)
    const dispositivo = await Dispositivo.findOneAndUpdate(
      { token },
      { user: session.id, plataforma: PLATAFORMAS.includes(plataforma) ? plataforma : 'desconocida', activo: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ success: true, dispositivo: { _id: dispositivo._id, plataforma: dispositivo.plataforma, activo: dispositivo.activo } }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/dispositivos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request);
    if (error) return error;

    const { token } = await request.json();
    if (typeof token !== 'string') return NextResponse.json({ error: 'token requerido' }, { status: 400 });

    await Dispositivo.deleteOne({ token, user: session.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/dispositivos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
