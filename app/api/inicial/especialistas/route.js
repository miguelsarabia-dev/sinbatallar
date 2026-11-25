// /api/inicial/especialistas — MODELO INICIAL
// GET  asociado: sus especialistas · especialista: su propio perfil · admin: todos (?asociadoId= &activo=true|false)
// POST asociado o admin: da de alta un especialista (cuenta + perfil).
//      Body: { nombre, email, telefono, password, servicios[], areasIds[]?, curp?, direccion?, notas?,
//              asociadoId? (solo admin), sueldoSemanal? (solo admin) }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Especialista from '@/models/Especialista';
import Asociado from '@/models/Asociado';
import Servicio from '@/models/Servicio'; // registrado para el populate
import Area from '@/models/Area'; // registrado para el populate
import { requireSession } from '@/lib/session';
import { perfilIdDe } from '@/lib/perfiles';
import { esObjectId, soloTexto } from '@/lib/sanitize';
import { asociadoIdDe } from '@/lib/roles';
import { validarZonas } from '@/lib/zona-contratista';
import { validarServicios } from '@/lib/servicios-contratista';
import { validarAltaCuenta, sueldoValido, SUELDO_SEMANAL_DEFAULT } from '@/lib/inicial-cuentas';
import { crearCuentaConPerfil, SELECT_USER_PUBLICO } from '@/lib/inicial-db';

const poblar = (q) => q
  .populate('user', SELECT_USER_PUBLICO)
  .populate({ path: 'servicios', select: 'nombre categoria', model: Servicio })
  .populate({ path: 'areasIds', select: 'nombre activo', model: Area })
  .populate({ path: 'asociado', select: 'user', populate: { path: 'user', select: 'nombre email' } });

export async function GET(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['asociado', 'especialista', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const filtro = {};
    if (session.role === 'especialista') {
      filtro.user = session.id;
    } else if (session.role === 'asociado') {
      const miId = await perfilIdDe(session);
      if (!miId) return NextResponse.json([]);
      filtro.asociado = miId;
    } else {
      const asociadoId = asociadoIdDe(searchParams);
      if (esObjectId(asociadoId)) filtro.asociado = asociadoId;
    }
    const activo = searchParams.get('activo');
    if (activo === 'true' || activo === 'false') filtro.activo = activo === 'true';

    const especialistas = await poblar(Especialista.find(filtro).sort({ createdAt: -1 })).lean();
    return NextResponse.json(especialistas);
  } catch (error) {
    console.error('Error en GET /inicial/especialistas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['asociado', 'admin']);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const alta = validarAltaCuenta(body);
    if (!alta.ok) return NextResponse.json({ error: alta.error }, { status: 400 });

    // Asociado: el del token. Admin: el del body (opcional).
    let asociado = null;
    if (session.role === 'asociado') {
      asociado = await perfilIdDe(session);
      if (!asociado) return NextResponse.json({ error: 'Tu perfil de asociado no está configurado' }, { status: 409 });
    } else {
      const id = asociadoIdDe(body);
      if (id !== undefined && id !== null && id !== '') {
        if (!esObjectId(id)) return NextResponse.json({ error: 'asociadoId inválido' }, { status: 400 });
        if (!(await Asociado.exists({ _id: id }))) return NextResponse.json({ error: 'Asociado no encontrado' }, { status: 404 });
        asociado = id;
      }
    }

    const servicios = await validarServicios(body.servicios);
    if (!servicios.ok) return NextResponse.json({ error: servicios.error }, { status: servicios.status });

    let areasIds = [];
    if (body.areasIds !== undefined) {
      const zonas = await validarZonas(body.areasIds);
      if (!zonas.ok) return NextResponse.json({ error: zonas.error }, { status: zonas.status });
      areasIds = zonas.areasIds;
    }

    let sueldoSemanal = SUELDO_SEMANAL_DEFAULT;
    if (session.role === 'admin' && body.sueldoSemanal !== undefined) {
      if (!sueldoValido(body.sueldoSemanal)) return NextResponse.json({ error: 'sueldoSemanal inválido' }, { status: 400 });
      sueldoSemanal = body.sueldoSemanal;
    }

    const resultado = await crearCuentaConPerfil({
      datos: alta.datos,
      role: 'especialista',
      Modelo: Especialista,
      perfil: {
        asociado,
        servicios: servicios.servicios,
        areasIds,
        curp: soloTexto(body.curp) || undefined,
        direccion: soloTexto(body.direccion) || undefined,
        notas: soloTexto(body.notas) || undefined,
        sueldoSemanal,
        // Lo da de alta su asociado o el admin, que son quienes lo validan
        aprobado: true
      }
    });
    if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: resultado.status });

    const creado = await poblar(Especialista.findById(resultado.perfil._id)).lean();
    return NextResponse.json(creado, { status: 201 });
  } catch (error) {
    console.error('Error en POST /inicial/especialistas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
