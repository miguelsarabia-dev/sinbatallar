// /api/inicial/aspirantes — MODELO INICIAL
// GET  especialista: sus aspirantes (?activo=true|false) · aspirante: su propio perfil · admin: todos (?especialistaId=)
// POST especialista o admin: da de alta un aspirante (cuenta + perfil).
//      Body: { nombre, email, telefono, password, especialidades[]?, notas?, especialistaId (solo admin) }
//      Las especialidades deben estar entre los servicios de su especialista.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Aspirante from '@/models/Aspirante';
import Especialista from '@/models/Especialista';
import Servicio from '@/models/Servicio'; // registrado para el populate
import { requireSession } from '@/lib/session';
import { esObjectId, soloTexto } from '@/lib/sanitize';
import { validarAltaCuenta, especialidadesFueraDe } from '@/lib/inicial-cuentas';
import { crearCuentaConPerfil, especialistaDeSesion, SELECT_USER_PUBLICO } from '@/lib/inicial-db';

const poblar = (q) => q
  .populate('user', SELECT_USER_PUBLICO)
  .populate({ path: 'especialidades', select: 'nombre categoria', model: Servicio })
  .populate({ path: 'especialista', select: 'user', populate: { path: 'user', select: 'nombre email telefono' } });

export async function GET(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['especialista', 'aspirante', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const filtro = {};
    if (session.role === 'aspirante') {
      filtro.user = session.id;
    } else if (session.role === 'especialista') {
      const propio = await especialistaDeSesion(session);
      if (!propio) return NextResponse.json([]);
      filtro.especialista = propio._id;
    } else {
      const especialistaId = searchParams.get('especialistaId');
      if (esObjectId(especialistaId)) filtro.especialista = especialistaId;
    }
    const activo = searchParams.get('activo');
    if (activo === 'true' || activo === 'false') filtro.activo = activo === 'true';

    const aspirantes = await poblar(Aspirante.find(filtro).sort({ createdAt: -1 })).lean();
    return NextResponse.json(aspirantes);
  } catch (error) {
    console.error('Error en GET /inicial/aspirantes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['especialista', 'admin']);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const alta = validarAltaCuenta(body);
    if (!alta.ok) return NextResponse.json({ error: alta.error }, { status: 400 });

    // Especialista: el del token. Admin: el del body.
    let especialista;
    if (session.role === 'especialista') {
      especialista = await especialistaDeSesion(session);
      if (!especialista) return NextResponse.json({ error: 'Tu perfil de especialista no está configurado' }, { status: 409 });
    } else {
      if (!esObjectId(body.especialistaId)) return NextResponse.json({ error: 'especialistaId requerido' }, { status: 400 });
      especialista = await Especialista.findById(body.especialistaId);
      if (!especialista) return NextResponse.json({ error: 'Especialista no encontrado' }, { status: 404 });
    }
    if (!especialista.activo) {
      return NextResponse.json({ error: 'El especialista no está activo' }, { status: 409 });
    }

    let especialidades = [];
    if (body.especialidades !== undefined) {
      if (!Array.isArray(body.especialidades) || body.especialidades.some(v => !esObjectId(v))) {
        return NextResponse.json({ error: 'especialidades inválidas' }, { status: 400 });
      }
      especialidades = [...new Set(body.especialidades.map(String))];
      if (especialidadesFueraDe(especialidades, especialista.servicios).length) {
        return NextResponse.json({ error: 'Las especialidades deben estar entre los servicios del especialista' }, { status: 400 });
      }
    }

    const resultado = await crearCuentaConPerfil({
      datos: alta.datos,
      role: 'aspirante',
      Modelo: Aspirante,
      perfil: {
        especialista: especialista._id,
        especialidades,
        notas: soloTexto(body.notas) || undefined
      }
    });
    if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: resultado.status });

    const creado = await poblar(Aspirante.findById(resultado.perfil._id)).lean();
    return NextResponse.json(creado, { status: 201 });
  } catch (error) {
    console.error('Error en POST /inicial/aspirantes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
