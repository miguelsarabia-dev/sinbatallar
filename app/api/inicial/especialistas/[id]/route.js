// /api/inicial/especialistas/[id] — MODELO INICIAL
// GET  el propio especialista, su asociado o el admin.
// PUT  cada quien solo los campos que le tocan (lib/inicial-cuentas.js):
//      especialista: disponible, informacionPago, direccion
//      asociado:     aprobado, areasIds, servicios, curp, direccion, notas
//      admin:        todo lo anterior + activo, sueldoSemanal, asociado
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Especialista from '@/models/Especialista';
import Aspirante from '@/models/Aspirante';
import Asociado from '@/models/Asociado';
import Servicio from '@/models/Servicio';
import Area from '@/models/Area';
import { requireSession } from '@/lib/session';
import { perfilIdDe } from '@/lib/perfiles';
import { esObjectId, pick } from '@/lib/sanitize';
import { validarZonas } from '@/lib/zona-contratista';
import { validarServicios } from '@/lib/servicios-contratista';
import { relacionConEspecialista, camposEspecialistaPara, sueldoValido } from '@/lib/inicial-cuentas';
import { SELECT_USER_PUBLICO } from '@/lib/inicial-db';

const poblar = (q) => q
  .populate('user', SELECT_USER_PUBLICO)
  .populate({ path: 'servicios', select: 'nombre categoria', model: Servicio })
  .populate({ path: 'areasIds', select: 'nombre activo', model: Area })
  .populate({ path: 'asociado', select: 'user', populate: { path: 'user', select: 'nombre email' } });

async function cargar(request, params, roles) {
  const { session, error } = await requireSession(request, roles);
  if (error) return { error };
  const { id } = await params;
  if (!esObjectId(id)) return { error: NextResponse.json({ error: 'ID inválido' }, { status: 400 }) };
  const especialista = await Especialista.findById(id);
  if (!especialista) return { error: NextResponse.json({ error: 'Especialista no encontrado' }, { status: 404 }) };
  const perfilIdActor = session.role === 'asociado' ? await perfilIdDe(session) : null;
  const relacion = relacionConEspecialista(session, especialista, { perfilIdActor });
  if (!relacion) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  return { session, especialista, relacion };
}

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { error, especialista } = await cargar(request, params, ['asociado', 'especialista', 'admin']);
    if (error) return error;
    const doc = await poblar(Especialista.findById(especialista._id)).lean();
    const aspirantes = await Aspirante.countDocuments({ especialista: especialista._id, activo: true });
    return NextResponse.json({ ...doc, aspirantesActivos: aspirantes });
  } catch (error) {
    console.error('Error en GET /inicial/especialistas/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { error, especialista, relacion } = await cargar(request, params, ['asociado', 'especialista', 'admin']);
    if (error) return error;
    if (especialista.ascenso?.contratista) {
      return NextResponse.json({ error: 'Esta cuenta ya ascendió a contratista; edítala como contratista' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const cambios = pick(body, camposEspecialistaPara(relacion));
    if (!Object.keys(cambios).length) {
      return NextResponse.json({ error: 'No hay campos que puedas modificar' }, { status: 400 });
    }

    for (const k of ['aprobado', 'activo', 'disponible']) {
      if (cambios[k] !== undefined && typeof cambios[k] !== 'boolean') {
        return NextResponse.json({ error: `${k} debe ser true o false` }, { status: 400 });
      }
    }
    for (const k of ['curp', 'direccion', 'notas']) {
      if (cambios[k] !== undefined && typeof cambios[k] !== 'string') {
        return NextResponse.json({ error: `${k} inválido` }, { status: 400 });
      }
    }
    if (cambios.informacionPago !== undefined) {
      const ip = cambios.informacionPago;
      if (!ip || typeof ip !== 'object' || Array.isArray(ip)) return NextResponse.json({ error: 'informacionPago inválida' }, { status: 400 });
      cambios.informacionPago = pick(ip, ['banco', 'numeroCuenta', 'clabe', 'nombreTitular']);
      if (Object.values(cambios.informacionPago).some(v => typeof v !== 'string')) {
        return NextResponse.json({ error: 'informacionPago inválida' }, { status: 400 });
      }
    }
    if (cambios.sueldoSemanal !== undefined && !sueldoValido(cambios.sueldoSemanal)) {
      return NextResponse.json({ error: 'sueldoSemanal inválido' }, { status: 400 });
    }
    if (cambios.asociado !== undefined) {
      if (cambios.asociado !== null && !esObjectId(cambios.asociado)) return NextResponse.json({ error: 'asociado inválido' }, { status: 400 });
      if (cambios.asociado && !(await Asociado.exists({ _id: cambios.asociado }))) {
        return NextResponse.json({ error: 'Asociado no encontrado' }, { status: 404 });
      }
    }
    if (cambios.servicios !== undefined) {
      const r = await validarServicios(cambios.servicios);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
      cambios.servicios = r.servicios;
    }
    if (cambios.areasIds !== undefined) {
      const r = await validarZonas(cambios.areasIds);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
      cambios.areasIds = r.areasIds;
    }

    await Especialista.updateOne({ _id: especialista._id }, { $set: cambios }, { runValidators: true });
    const doc = await poblar(Especialista.findById(especialista._id)).lean();
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error en PUT /inicial/especialistas/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
