// app/api/tecnicos/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Tecnico from '@/models/Tecnico';
import User from '@/models/User';
import Contratista from '@/models/Contratista';
import { hashPassword } from '@/lib/auth';

// GET /api/tecnicos?contratistaId=xxx
// GET /api/tecnicos?userId=xxx
// GET /api/tecnicos?contratistaId=xxx&areaId=yyy → solo técnicos que cubren esa zona
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const contratistaId = searchParams.get('contratistaId');
    const userId = searchParams.get('userId');
    const areaId = searchParams.get('areaId');

    const filtroBase = {};
    if (contratistaId) filtroBase.contratista = contratistaId;
    if (userId) filtroBase.user = userId;

    // Self-healing de zonas: rellenar el areasCobertura vacío de los técnicos con la
    // zona de su contratista antes de filtrar (mismo patrón que ubicacion.zona en citas).
    const conZonaVacia = await Tecnico.find({
      ...filtroBase,
      $or: [{ areasCobertura: { $exists: false } }, { areasCobertura: { $size: 0 } }]
    }).populate('contratista', 'areaId');

    for (const t of conZonaVacia) {
      const zonaContratista = t.contratista?.areaId;
      if (zonaContratista) {
        await Tecnico.updateOne(
          { _id: t._id },
          { $set: { areasCobertura: [zonaContratista] } }
        );
      }
    }

    const filtro = { ...filtroBase };
    // Filtrar por zona de cobertura solo si se proporciona areaId
    if (areaId) filtro.areasCobertura = areaId;

    const tecnicos = await Tecnico.find(filtro)
      .populate('user', 'nombre email telefono fotoUrl')
      .populate('contratista', 'nombre email')
      .populate('areasCobertura', 'nombre clasificacion')
      .sort({ createdAt: -1 });

    return NextResponse.json(tecnicos);
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

    const body = await request.json();
    const { nombre, email, password, telefono, contratistaId, especialidades = [], areasCobertura = [] } = body;

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
    if (areasFinales.length === 0 && contratista.areaId) {
      areasFinales = [contratista.areaId];
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
