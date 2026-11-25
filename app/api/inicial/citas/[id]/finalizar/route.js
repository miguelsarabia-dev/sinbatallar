// POST /api/inicial/citas/[id]/finalizar — el especialista marca el trabajo como terminado. Después el cliente
// confirma y paga el saldo; cuando Sin Batallar verifica el pago completo, el servicio se cierra y se calcula el
// reparto del modelo inicial (ComisionInicial).
// Body opcional: { comentario }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import Cita from '@/models/Cita';
import { citaDelEspecialista } from '@/lib/inicial-rutas';
import { cambiarEstadoCita } from '@/lib/citas-estado';
import { cerrarServicioSiCorresponde } from '@/lib/comisiones';
import { contactoEspecialista, poblarCitaInicial } from '@/lib/inicial-citas-db';
import { enviarNotificacionCambioEstado } from '@/lib/email-service';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, cita, session, especialista } = await citaDelEspecialista(sesion.session, params);
    if (error) return error;
    if (cita.estado !== 'en_progreso') {
      return NextResponse.json({ error: 'Solo se finaliza un trabajo en progreso' }, { status: 409 });
    }
    const body = await request.json().catch(() => ({}));
    const comentario = typeof body.comentario === 'string' && body.comentario.trim() ? body.comentario.trim().slice(0, 500) : 'El especialista terminó el trabajo';
    const r = await cambiarEstadoCita({ cita, estado: 'completada', comentario, session });
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: r.error.status });

    // Si el pago ya estaba completo (pago total verificado y cliente confirmó), se cierra de una vez
    const { cerrada } = await cerrarServicioSiCorresponde(cita._id);

    if (!cerrada) {
      const poblada = await poblarCitaInicial(Cita.findById(cita._id));
      enviarNotificacionCambioEstado({
        nuevoEstado: 'completada', cita: poblada, cliente: poblada.cliente,
        contratista: await contactoEspecialista(especialista._id), servicio: poblada.servicio
      }).catch(err => console.error('Error enviando email de trabajo terminado (inicial):', err));
    }
    return NextResponse.json({ message: 'Trabajo terminado: falta que el cliente confirme y pague el saldo', cerrada });
  } catch (error) {
    console.error('Error en POST /inicial/citas/[id]/finalizar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
