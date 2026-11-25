// GET /api/inicial/citas — MODELO INICIAL
//   especialista ?vista=disponibles: citas ABIERTAS de sus zonas y servicios que puede tomar (el primero que acepta
//                                    se la lleva). Express primero, luego por fecha.
//   especialista ?vista=mias (default): las que tomó (?estado= para filtrar)
//   aspirante: las citas a las que su especialista lo lleva
//   admin: todas las citas del modelo inicial (?estado=)
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Especialista from '@/models/Especialista';
import Aspirante from '@/models/Aspirante';
import { requireSession } from '@/lib/session';
import { poblarCitaInicial } from '@/lib/inicial-citas-db';

const ESTADOS = Cita.schema.path('estado').enumValues;

const ordenar = (a, b) =>
  (b.esExpress ? 1 : 0) - (a.esExpress ? 1 : 0) ||
  (a.fechaProgramada ? new Date(a.fechaProgramada).getTime() : Infinity) - (b.fechaProgramada ? new Date(b.fechaProgramada).getTime() : Infinity) ||
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

export async function GET(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['especialista', 'aspirante', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const estado = ESTADOS.includes(searchParams.get('estado')) ? searchParams.get('estado') : null;

    if (session.role === 'especialista') {
      const esp = await Especialista.findOne({ user: session.id }).lean();
      if (!esp || !esp.activo) return NextResponse.json([]);

      if (searchParams.get('vista') === 'disponibles') {
        if (!esp.aprobado || esp.disponible === false || !esp.areasIds?.length || !esp.servicios?.length) {
          return NextResponse.json([]);
        }
        const citas = await Cita.find({
          estado: 'solicitada',
          contratista: null,
          especialista: null,
          'ubicacion.zona': { $in: esp.areasIds },
          servicio: { $in: esp.servicios }
        })
          .populate('servicio', 'nombre descripcion categoria')
          .populate('cliente', 'nombre')
          .select('-historial')
          .lean();
        // Antes de tomarla el especialista ve la colonia y el municipio, no el domicilio exacto ni el teléfono
        const resumen = citas.sort(ordenar).map(c => ({
          ...c,
          ubicacion: { colonia: c.ubicacion?.colonia, municipio: c.ubicacion?.municipio, zona: c.ubicacion?.zona }
        }));
        return NextResponse.json(resumen);
      }

      const filtro = { especialista: esp._id, ...(estado ? { estado } : {}) };
      const citas = await poblarCitaInicial(Cita.find(filtro).sort({ updatedAt: -1 })).lean();
      return NextResponse.json(citas);
    }

    if (session.role === 'aspirante') {
      const asp = await Aspirante.findOne({ user: session.id }).select('_id activo').lean();
      if (!asp || !asp.activo) return NextResponse.json([]);
      const citas = await poblarCitaInicial(
        Cita.find({ aspirantes: asp._id, ...(estado ? { estado } : {}) }).sort({ fechaProgramada: 1, updatedAt: -1 })
      ).select('-historial -reembolso').lean();
      return NextResponse.json(citas);
    }

    const citas = await poblarCitaInicial(
      Cita.find({ modelo: 'inicial', ...(estado ? { estado } : {}) }).sort({ updatedAt: -1 }).limit(500)
    ).lean();
    return NextResponse.json(citas);
  } catch (error) {
    console.error('Error en GET /inicial/citas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
