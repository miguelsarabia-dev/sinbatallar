// app/api/citas/[id]/liberar-ganancia/route.js
// El contratista dueño (por token) libera al técnico su parte (Comision.liberacionTecnico).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Comision from '@/models/Comision';
import { requireSession } from '@/lib/session';
import Tecnico from '@/models/Tecnico';
import { enviarPush } from '@/lib/push';



async function liberar(request, params) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['contratista']);
    if (error) return error;

    const { id } = await params;
    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    if (cita.contratista?.toString() !== session.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const comision = await Comision.findOne({ cita: cita._id });
    if (!comision || comision.estadoPago === 'cancelada') {
      return NextResponse.json(
        { error: 'La comisión aún no existe: el pago debe estar verificado y el servicio cerrado' },
        { status: 400 }
      );
    }
    if (!comision.distribucion?.tecnico?.id || !(comision.distribucion.tecnico.monto > 0)) {
      return NextResponse.json({ error: 'Este servicio no tiene ganancia de técnico por liberar' }, { status: 400 });
    }

    if (comision.liberacionTecnico?.estado !== 'liberada') {
      comision.liberacionTecnico = { estado: 'liberada', fecha: new Date(), por: session.id };
      await comision.save();
      const tecnico = await Tecnico.findById(comision.distribucion.tecnico.id).select('user').lean();
      await enviarPush([tecnico?.user], {
        titulo: 'Ganancia liberada',
        cuerpo: `Tu ganancia de $${comision.distribucion.tecnico.monto} fue liberada`,
        data: { tipo: 'ganancia_liberada', citaId: String(cita._id) }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Ganancia del técnico liberada',
      liberacionTecnico: comision.liberacionTecnico,
      gananciaTecnico: comision.distribucion.tecnico.monto
    });
  } catch (error) {
    console.error('Error al liberar ganancia:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  return liberar(request, params);
}

export async function POST(request, { params }) {
  return liberar(request, params);
}
