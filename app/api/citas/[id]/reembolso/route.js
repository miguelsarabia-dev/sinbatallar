// app/api/citas/[id]/reembolso/route.js
// Solo admin: marca como resuelto un reembolso pendiente. Body: { estado: 'resuelto', nota? }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import { requireSession } from '@/lib/session';


export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;

    const { id } = await params;
    const { estado, nota } = await request.json();

    if (estado !== 'resuelto') {
      return NextResponse.json({ error: "estado debe ser 'resuelto'" }, { status: 400 });
    }

    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    if (cita.reembolso?.estado !== 'pendiente') {
      return NextResponse.json({ error: 'La cita no tiene un reembolso pendiente' }, { status: 400 });
    }

    cita.reembolso.estado = 'resuelto';
    cita.reembolso.nota = (nota || '').trim();
    cita.reembolso.fechaResolucion = new Date();
    cita.reembolso.resueltoPor = session.id;
    cita.historial.push({
      estado: cita.estado,
      comentario: `Reembolso resuelto por el administrador${nota ? `: ${nota}` : ''}`,
      fecha: new Date(),
      usuario: session.id
    });
    await cita.save({ validateModifiedOnly: true });

    return NextResponse.json({ success: true, reembolso: cita.reembolso });
  } catch (error) {
    console.error('Error al resolver reembolso:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
