// POST /api/inicial/citas/[id]/soltar — el especialista regresa la cita a la bolsa (antes de que el cliente acepte
// una cotización) para que la tome otro. Sus cotizaciones enviadas quedan rechazadas.
// Body opcional: { motivo }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import Cita from '@/models/Cita';
import Cotizacion from '@/models/Cotizacion';
import { puedeSoltar } from '@/lib/inicial-citas';
import { citaDelEspecialista } from '@/lib/inicial-rutas';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, cita, especialista } = await citaDelEspecialista(sesion.session, params);
    if (error) return error;
    if (!puedeSoltar(cita)) {
      return NextResponse.json({ error: 'Ya no puedes soltar esta cita: el cliente aceptó la cotización' }, { status: 409 });
    }
    const body = await request.json().catch(() => ({}));
    const motivo = typeof body.motivo === 'string' && body.motivo.trim() ? body.motivo.trim().slice(0, 300) : 'El especialista liberó la cita';

    const liberada = await Cita.findOneAndUpdate(
      { _id: cita._id, especialista: especialista._id, estado: { $in: ['atendida', 'cotizada'] }, cotizacionAceptada: null },
      {
        $set: { especialista: null, modelo: null, aspirantes: [], estado: 'solicitada', subestadoTecnico: null, fechaSubestadoTecnico: null,
                'acuerdoVisita.estado': null, 'acuerdoVisita.propuestaPor': null, 'acuerdoVisita.fechaAcuerdo': null },
        $push: { historial: { estado: 'solicitada', fecha: new Date(), comentario: motivo } }
      },
      { new: true }
    );
    if (!liberada) return NextResponse.json({ error: 'La cita cambió mientras tanto; recarga' }, { status: 409 });

    await Cotizacion.updateMany(
      { cita: cita._id, especialista: especialista._id, estado: { $in: ['pendiente', 'enviada'] } },
      { $set: { estado: 'rechazada', motivoRechazo: 'El especialista liberó la cita' } }
    );
    return NextResponse.json({ message: 'La cita regresó a la bolsa', citaId: liberada._id });
  } catch (error) {
    console.error('Error en POST /inicial/citas/[id]/soltar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
