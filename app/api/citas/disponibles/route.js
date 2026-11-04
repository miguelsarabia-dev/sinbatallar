// app/api/citas/disponibles/route.js
// GET (técnico): servicios directos que puede tomar — citas 'aceptada' sin técnico, de SU contratista, cuyo
// servicio coincide con alguna de sus especialidades (sin especialidades = todas). Solo si está activo y
// disponible. Express primero, luego por fecha programada.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Tecnico from '@/models/Tecnico';
import { requireSession } from '@/lib/session';
import { coincideEspecialidad } from '@/lib/especialidades';

export async function GET(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['tecnico']);
    if (error) return error;

    const tecnico = await Tecnico.findOne({ user: session.id });
    if (!tecnico || !tecnico.activo || tecnico.disponible === false) return NextResponse.json([]);

    const citas = await Cita.find({ estado: 'aceptada', tecnico: null, contratista: tecnico.contratista })
      .populate('servicio', 'nombre descripcion categoria')
      .populate('cliente', 'nombre')
      .select('-historial')
      .lean();

    const filtradas = citas
      .filter(c => coincideEspecialidad(tecnico.especialidades, c.servicio))
      .sort((a, b) =>
        (b.esExpress ? 1 : 0) - (a.esExpress ? 1 : 0) ||
        (a.fechaProgramada ? new Date(a.fechaProgramada).getTime() : Infinity) -
        (b.fechaProgramada ? new Date(b.fechaProgramada).getTime() : Infinity)
      );

    return NextResponse.json(filtradas);
  } catch (error) {
    console.error('Error en GET /api/citas/disponibles:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
