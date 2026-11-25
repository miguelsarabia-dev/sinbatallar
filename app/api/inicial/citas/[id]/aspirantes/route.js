// PUT /api/inicial/citas/[id]/aspirantes — el especialista elige qué aspirantes lleva (máximo 2, de los suyos).
// Se puede cambiar mientras el servicio no se cierre; el reparto usa los que estén al momento del cierre.
// Body: { aspirantes: [id, id] }  ([] = va solo)
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import Aspirante from '@/models/Aspirante';
import { ESTADOS_EDITABLES, validarAspirantes } from '@/lib/inicial-citas';
import { citaDelEspecialista } from '@/lib/inicial-rutas';
import { poblarCitaInicial } from '@/lib/inicial-citas-db';
import Cita from '@/models/Cita';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, cita, especialista } = await citaDelEspecialista(sesion.session, params);
    if (error) return error;
    if (!ESTADOS_EDITABLES.includes(cita.estado) || (cita.estado === 'completada' && cita.pagado)) {
      return NextResponse.json({ error: 'Ya no se pueden cambiar los aspirantes de este servicio' }, { status: 409 });
    }
    const body = await request.json().catch(() => ({}));
    const propios = await Aspirante.find({ especialista: especialista._id }).select('_id activo especialista').lean();
    const r = validarAspirantes(body.aspirantes, propios, especialista._id);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

    cita.aspirantes = r.aspirantes;
    cita.historial.push({ estado: cita.estado, fecha: new Date(), comentario: `Aspirantes en el servicio: ${r.aspirantes.length}` });
    await cita.save({ validateModifiedOnly: true });
    return NextResponse.json(await poblarCitaInicial(Cita.findById(cita._id)).lean());
  } catch (error) {
    console.error('Error en PUT /inicial/citas/[id]/aspirantes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
