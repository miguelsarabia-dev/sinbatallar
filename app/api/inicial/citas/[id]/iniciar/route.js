// POST /api/inicial/citas/[id]/iniciar — el especialista empieza el trabajo. Requiere que Sin Batallar haya
// verificado el anticipo (o el pago total).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import Cotizacion from '@/models/Cotizacion';
import { citaDelEspecialista } from '@/lib/inicial-rutas';
import { pagoInicialVerificado } from '@/lib/inicial-citas';
import { cambiarEstadoCita } from '@/lib/citas-estado';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, cita, session } = await citaDelEspecialista(sesion.session, params);
    if (error) return error;
    if (cita.estado === 'en_progreso') return NextResponse.json({ message: 'El trabajo ya estaba iniciado', estado: cita.estado });
    const cotizacion = cita.cotizacionAceptada ? await Cotizacion.findById(cita.cotizacionAceptada).lean() : null;
    if (!pagoInicialVerificado(cotizacion)) {
      return NextResponse.json({ error: 'Aún no se verifica el anticipo del cliente' }, { status: 409 });
    }
    const r = await cambiarEstadoCita({ cita, estado: 'en_progreso', comentario: 'El especialista inició el trabajo', session });
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: r.error.status });
    cita.subestadoTecnico = 'trabajando';
    cita.fechaSubestadoTecnico = new Date();
    await cita.save({ validateModifiedOnly: true });
    return NextResponse.json({ message: 'Trabajo iniciado', estado: cita.estado });
  } catch (error) {
    console.error('Error en POST /inicial/citas/[id]/iniciar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
