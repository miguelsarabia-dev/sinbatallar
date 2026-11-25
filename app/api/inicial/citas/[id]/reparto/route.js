// GET /api/inicial/citas/[id]/reparto — reparto del servicio en el modelo inicial: el REAL si ya se cerró
// (ComisionInicial) o el ESTIMADO con la configuración vigente y la cotización aceptada.
// Lo ven el especialista dueño, los aspirantes que van (solo su parte) y el admin.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Cotizacion from '@/models/Cotizacion';
import ComisionInicial from '@/models/ComisionInicial';
import { requireSession } from '@/lib/session';
import { resolverActor } from '@/lib/citas-estado';
import { esObjectId } from '@/lib/sanitize';
import { repartoEstimadoInicial } from '@/lib/inicial-citas-db';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['especialista', 'aspirante', 'admin']);
    if (error) return error;
    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const cita = await Cita.findById(id).select('modelo especialista aspirantes cotizacionAceptada ubicacion estado').lean();
    if (!cita || cita.modelo !== 'inicial') return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    const actor = await resolverActor(session, cita);
    if (!actor.autorizado) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });

    const comision = await ComisionInicial.findOne({ cita: cita._id }).lean();
    let reparto;
    let estimado = false;
    if (comision && comision.estado !== 'cancelada') {
      reparto = { ...comision.distribucion, manoDeObra: comision.manoDeObra, version: comision.version, estado: comision.estado };
    } else {
      const cotizacion = cita.cotizacionAceptada ? await Cotizacion.findById(cita.cotizacionAceptada).lean() : null;
      reparto = await repartoEstimadoInicial(cita, cotizacion);
      estimado = true;
      if (!reparto) return NextResponse.json({ estimado, reparto: null, message: 'Aún no hay cotización aceptada' });
    }

    if (session.role === 'aspirante') {
      return NextResponse.json({ estimado, miParte: reparto.aspirantes?.porAspirante || { porcentaje: 0, monto: 0 } });
    }
    return NextResponse.json({ estimado, reparto });
  } catch (error) {
    console.error('Error en GET /inicial/citas/[id]/reparto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
