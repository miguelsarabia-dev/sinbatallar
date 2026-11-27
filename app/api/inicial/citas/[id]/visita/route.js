// PUT /api/inicial/citas/[id]/visita — el especialista contesta sobre la VISITA para cotizar:
//   { aceptar: true }                     → acepta el día que propuso el cliente (visita acordada)
//   { fechaVisita, horaVisita? }          → propone otro día (le toca al cliente aceptarlo o contraproponer)
// Solo antes de llegar al domicilio y de cotizar. Reglas en lib/inicial-visita.js; el cliente contesta en
// /api/citas/[id]/visita. Cada respuesta avisa por correo a la otra parte.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { citaDelEspecialista } from '@/lib/inicial-rutas';
import { responderVisita } from '@/lib/inicial-visita';
import { avisarVisita } from '@/lib/inicial-citas-db';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, cita } = await citaDelEspecialista(sesion.session, params);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const r = responderVisita({ cita, actor: 'especialista', aceptar: body.aceptar === true, fecha: body.fechaVisita, hora: body.horaVisita });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

    cita.set(r.set);
    cita.historial.push({ estado: cita.estado, fecha: new Date(), comentario: r.comentario });
    await cita.save({ validateModifiedOnly: true });

    avisarVisita({ cita, avisarA: r.avisarA, tipo: r.acordada ? 'acordada' : 'propuesta', propuestaPor: 'especialista' });
    return NextResponse.json({ fechaVisita: cita.fechaVisita, horaVisita: cita.horaVisita, acuerdoVisita: cita.acuerdoVisita });
  } catch (error) {
    console.error('Error en PUT /inicial/citas/[id]/visita:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
