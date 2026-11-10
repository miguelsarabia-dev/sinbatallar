// app/api/tecnicos/route.js
import { zonasDe } from '@/lib/zona-contratista';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Tecnico from '@/models/Tecnico';
import User from '@/models/User';
import Contratista from '@/models/Contratista';
import { hashPassword } from '@/lib/auth';
import Cita from '@/models/Cita';
import { requireSession, getSessionFromRequest } from '@/lib/session';
import { esObjectId, pick } from '@/lib/sanitize';


// GET /api/tecnicos?contratistaId=xxx
// GET /api/tecnicos?userId=xxx
// GET /api/tecnicos?contratistaId=xxx&areaId=yyy → el contratista recibe TODOS sus técnicos con `cubreZona`
//   (true si cubren esa zona; primero los que sí). Admin: filtra por zona.
export async function GET(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['contratista', 'tecnico', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const contratistaId = searchParams.get('contratistaId');
    const userId = searchParams.get('userId');
    const areaId = esObjectId(searchParams.get('areaId')) ? searchParams.get('areaId') : null;

    // El alcance sale del token: el contratista ve sus técnicos, el técnico su propio perfil.
    const filtroBase = {};
    if (session.role === 'contratista') {
      filtroBase.contratista = session.id;
    } else if (session.role === 'tecnico') {
      filtroBase.user = session.id;
    } else {
      if (esObjectId(contratistaId)) filtroBase.contratista = contratistaId;
      if (esObjectId(userId)) filtroBase.user = userId;
    }

    // Self-healing de zonas: rellenar el areasCobertura vacío de los técnicos con la
    // zona de su contratista antes de filtrar (mismo patrón que ubicacion.zona en citas).
    const conZonaVacia = await Tecnico.find({
      ...filtroBase,
      $or: [{ areasCobertura: { $exists: false } }, { areasCobertura: { $size: 0 } }]
    }).populate('contratista', 'areaId areasIds');

    for (const t of conZonaVacia) {
      const zonasContratista = zonasDe(t.contratista);
      if (zonasContratista.length) {
        await Tecnico.updateOne(
          { _id: t._id },
          { $set: { areasCobertura: zonasContratista } }
        );
      }
    }

    const filtro = { ...filtroBase };
    // El contratista responde por sus técnicos: no se le ocultan por zona (antes, si la zona del técnico no
    // coincidía con la de la cita, la lista salía vacía). Solo el admin filtra por zona.
    if (areaId && session.role === 'admin') filtro.areasCobertura = areaId;

    const tecnicos = await Tecnico.find(filtro)
      .populate('user', 'nombre email telefono fotoUrl suspendido')
      .populate('contratista', 'nombre email')
      .populate('areasCobertura', 'nombre clasificacion')
      .sort({ createdAt: -1 });

    // Carga actual: citas aceptadas o en progreso por técnico
    const activas = await Cita.aggregate([
      { $match: { tecnico: { $in: tecnicos.map(t => t._id) }, estado: { $in: ['aceptada', 'en_progreso'] } } },
      { $group: { _id: '$tecnico', total: { $sum: 1 } } }
    ]);
    const activasPorTecnico = Object.fromEntries(activas.map(a => [String(a._id), a.total]));

    const lista = tecnicos.map(t => ({
      ...t.toObject(),
      cubreZona: !areaId || (t.areasCobertura || []).some(a => String(a?._id || a) === areaId),
      disponible: t.disponible !== false,
      citasActivas: activasPorTecnico[String(t._id)] || 0,
      promedioCalificacion: t.promedioCalificacion || 0,
      totalCalificaciones: t.totalCalificaciones || 0
    }));
    lista.sort((a, b) => Number(b.cubreZona) - Number(a.cubreZona));
    return NextResponse.json(lista);
  } catch (error) {
    console.error('Error en GET /api/tecnicos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/tecnicos
// Body: { nombre, email, password, telefono, contratistaId, especialidades? }
export async function POST(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['contratista', 'admin']);
    if (error) return error;

    const body = await request.json();
    const { nombre, email, password, telefono, especialidades = [], areasCobertura = [] } = body;
    // El técnico se crea siempre para el contratista del token (admin: el del body)
    const contratistaId = session.role === 'contratista' ? session.id : body.contratistaId;
    for (const v of [nombre, email, password, telefono]) {
      if (v !== undefined && typeof v !== 'string') {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
      }
    }

    if (!nombre || !email || !password || !contratistaId) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, email, password, contratistaId' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const contratista = await Contratista.findById(contratistaId);
    if (!contratista) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    const existente = await User.findOne({ email: email.toLowerCase() });
    if (existente) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      nombre,
      email: email.toLowerCase(),
      password: hashedPassword,
      telefono,
      role: 'tecnico'
    });

    // Herencia de zonas: si el body no trae areasCobertura, el técnico hereda por
    // defecto la zona de su contratista. Si viene explícito, se respeta (override manual).
    let areasFinales = Array.isArray(areasCobertura) ? areasCobertura : [];
    if (areasFinales.length === 0 && zonasDe(contratista).length) {
      areasFinales = zonasDe(contratista);
    }

    const tecnico = await Tecnico.create({
      user: user._id,
      contratista: contratistaId,
      especialidades,
      areasCobertura: areasFinales,
      activo: true
    });

    const tecnicoPopulado = await Tecnico.findById(tecnico._id)
      .populate('user', 'nombre email telefono fotoUrl')
      .populate('contratista', 'nombre email');

    return NextResponse.json(
      { message: 'Técnico creado exitosamente', tecnico: tecnicoPopulado },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en POST /api/tecnicos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
