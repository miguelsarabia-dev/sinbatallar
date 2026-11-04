// app/api/users/[id]/suspender/route.js
// PUT { suspendido: boolean, motivo? } — solo admin. `id` puede ser el _id de un User (cliente, técnico,
// ferretero, aperturador, incorporador) o de un Contratista. Una cuenta suspendida no puede iniciar sesión
// (403 'Tu cuenta está suspendida') y su token deja de valer (401).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import Contratista from '@/models/Contratista';
import { requireSession, olvidarSuspension } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    const { suspendido, motivo } = await request.json();

    if (typeof suspendido !== 'boolean') {
      return NextResponse.json({ error: 'suspendido debe ser true o false' }, { status: 400 });
    }
    if (suspendido && (typeof motivo !== 'string' || !motivo.trim())) {
      return NextResponse.json({ error: 'Se requiere un motivo para suspender' }, { status: 400 });
    }
    if (suspendido && id === session.id) {
      return NextResponse.json({ error: 'No puedes suspender tu propia cuenta' }, { status: 400 });
    }

    const cambios = { suspendido, motivoSuspension: suspendido ? motivo.trim() : '' };
    const doc = (await User.findByIdAndUpdate(id, cambios, { new: true }).select('nombre email role suspendido motivoSuspension'))
      || (await Contratista.findByIdAndUpdate(id, cambios, { new: true }).select('nombre email suspendido motivoSuspension'));
    if (!doc) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    olvidarSuspension(id);
    return NextResponse.json({
      success: true,
      usuario: { _id: doc._id, nombre: doc.nombre, email: doc.email, role: doc.role || 'contratista', suspendido: doc.suspendido, motivoSuspension: doc.motivoSuspension }
    });
  } catch (error) {
    console.error('Error en PUT /api/users/[id]/suspender:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
