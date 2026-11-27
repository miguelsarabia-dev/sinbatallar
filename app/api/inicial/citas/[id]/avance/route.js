// PATCH /api/inicial/citas/[id]/avance — el especialista marca su avance: en_camino | en_sitio | cotizando | trabajando
// Body: { subestado }
// Antes de cotizar, en camino / en sitio / cotizando solo con la visita acordada y el día de la visita
// (lib/inicial-visita.js). En camino y en sitio le llegan al cliente por correo.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { SUBESTADOS, ESTADOS_EDITABLES } from '@/lib/inicial-citas';
import { citaDelEspecialista } from '@/lib/inicial-rutas';
import { puedeAvanzarVisita } from '@/lib/inicial-visita';
import { avisarVisita } from '@/lib/inicial-citas-db';

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, cita } = await citaDelEspecialista(sesion.session, params);
    if (error) return error;
    const body = await request.json().catch(() => ({}));
    if (!SUBESTADOS.includes(body.subestado)) {
      return NextResponse.json({ error: `subestado debe ser: ${SUBESTADOS.join(', ')}` }, { status: 400 });
    }
    if (!ESTADOS_EDITABLES.includes(cita.estado)) {
      return NextResponse.json({ error: 'El servicio ya terminó o fue cancelado' }, { status: 409 });
    }
    if (body.subestado === 'trabajando' && cita.estado !== 'en_progreso') {
      return NextResponse.json({ error: 'Primero inicia el trabajo (requiere el anticipo verificado)' }, { status: 409 });
    }
    const visita = puedeAvanzarVisita(cita, body.subestado);
    if (!visita.ok) return NextResponse.json({ error: visita.error }, { status: visita.status });
    const cambio = cita.subestadoTecnico !== body.subestado;
    cita.subestadoTecnico = body.subestado;
    cita.fechaSubestadoTecnico = new Date();
    if (cambio && ['en_camino', 'en_sitio'].includes(body.subestado)) {
      cita.historial.push({ estado: cita.estado, fecha: new Date(), comentario: body.subestado === 'en_camino' ? 'El especialista va en camino' : 'El especialista llegó al domicilio' });
    }
    await cita.save({ validateModifiedOnly: true });
    if (cambio && cita.estado === 'atendida' && ['en_camino', 'en_sitio'].includes(body.subestado)) {
      avisarVisita({ cita, avisarA: 'cliente', tipo: body.subestado });
    }
    return NextResponse.json({ subestado: cita.subestadoTecnico, fecha: cita.fechaSubestadoTecnico });
  } catch (error) {
    console.error('Error en PATCH /inicial/citas/[id]/avance:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
