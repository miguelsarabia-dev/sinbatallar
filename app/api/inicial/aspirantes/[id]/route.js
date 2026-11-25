// /api/inicial/aspirantes/[id] — MODELO INICIAL
// GET  el propio aspirante, su especialista o el admin.
// PUT  especialista dueño: especialidades, notas, activo (baja/alta) · admin: además cambiar de especialista.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Aspirante from '@/models/Aspirante';
import Especialista from '@/models/Especialista';
import Servicio from '@/models/Servicio';
import { requireSession } from '@/lib/session';
import { perfilIdDe } from '@/lib/perfiles';
import { esObjectId, pick } from '@/lib/sanitize';
import { relacionConAspirante, camposAspirantePara, especialidadesFueraDe } from '@/lib/inicial-cuentas';
import { SELECT_USER_PUBLICO } from '@/lib/inicial-db';

const poblar = (q) => q
  .populate('user', SELECT_USER_PUBLICO)
  .populate({ path: 'especialidades', select: 'nombre categoria', model: Servicio })
  .populate({ path: 'especialista', select: 'user', populate: { path: 'user', select: 'nombre email telefono' } });

async function cargar(request, params, roles) {
  const { session, error } = await requireSession(request, roles);
  if (error) return { error };
  const { id } = await params;
  if (!esObjectId(id)) return { error: NextResponse.json({ error: 'ID inválido' }, { status: 400 }) };
  const aspirante = await Aspirante.findById(id);
  if (!aspirante) return { error: NextResponse.json({ error: 'Aspirante no encontrado' }, { status: 404 }) };
  const perfilIdActor = session.role === 'especialista' ? await perfilIdDe(session) : null;
  const relacion = relacionConAspirante(session, aspirante, { perfilIdActor });
  if (!relacion) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  return { session, aspirante, relacion };
}

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { error, aspirante } = await cargar(request, params, ['especialista', 'aspirante', 'admin']);
    if (error) return error;
    return NextResponse.json(await poblar(Aspirante.findById(aspirante._id)).lean());
  } catch (error) {
    console.error('Error en GET /inicial/aspirantes/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { error, aspirante, relacion } = await cargar(request, params, ['especialista', 'admin']);
    if (error) return error;
    if (aspirante.ascenso?.contratista) {
      return NextResponse.json({ error: 'Esta cuenta ya ascendió a contratista' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const cambios = pick(body, camposAspirantePara(relacion));
    if (!Object.keys(cambios).length) {
      return NextResponse.json({ error: 'No hay campos que puedas modificar' }, { status: 400 });
    }
    if (cambios.activo !== undefined && typeof cambios.activo !== 'boolean') {
      return NextResponse.json({ error: 'activo debe ser true o false' }, { status: 400 });
    }
    if (cambios.notas !== undefined && typeof cambios.notas !== 'string') {
      return NextResponse.json({ error: 'notas inválidas' }, { status: 400 });
    }

    let especialistaId = aspirante.especialista;
    if (cambios.especialista !== undefined) {
      if (!esObjectId(cambios.especialista)) return NextResponse.json({ error: 'especialista inválido' }, { status: 400 });
      if (!(await Especialista.exists({ _id: cambios.especialista, activo: true }))) {
        return NextResponse.json({ error: 'Especialista no encontrado o inactivo' }, { status: 404 });
      }
      especialistaId = cambios.especialista;
    }

    if (cambios.especialidades !== undefined || cambios.especialista !== undefined) {
      const especialidades = cambios.especialidades !== undefined ? cambios.especialidades : aspirante.especialidades.map(String);
      if (!Array.isArray(especialidades) || especialidades.some(v => !esObjectId(String(v)))) {
        return NextResponse.json({ error: 'especialidades inválidas' }, { status: 400 });
      }
      const especialista = await Especialista.findById(especialistaId).select('servicios').lean();
      const unicas = [...new Set(especialidades.map(String))];
      if (especialidadesFueraDe(unicas, especialista?.servicios).length) {
        return NextResponse.json({ error: 'Las especialidades deben estar entre los servicios del especialista' }, { status: 400 });
      }
      cambios.especialidades = unicas;
    }

    await Aspirante.updateOne({ _id: aspirante._id }, { $set: cambios }, { runValidators: true });
    return NextResponse.json(await poblar(Aspirante.findById(aspirante._id)).lean());
  } catch (error) {
    console.error('Error en PUT /inicial/aspirantes/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
