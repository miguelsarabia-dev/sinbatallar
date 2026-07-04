// app/api/tecnicos/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Tecnico from '@/models/Tecnico';
import User from '@/models/User';
import Contratista from '@/models/Contratista';
import { hashPassword } from '@/lib/auth';

// GET /api/tecnicos?contratistaId=xxx
// GET /api/tecnicos?userId=xxx
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const contratistaId = searchParams.get('contratistaId');
    const userId = searchParams.get('userId');

    const filtro = {};
    if (contratistaId) filtro.contratista = contratistaId;
    if (userId) filtro.user = userId;

    const tecnicos = await Tecnico.find(filtro)
      .populate('user', 'nombre email telefono fotoUrl')
      .populate('contratista', 'nombre email')
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
    const { nombre, email, password, telefono, contratistaId, especialidades = [] } = body;

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

    const tecnico = await Tecnico.create({
      user: user._id,
      contratista: contratistaId,
      especialidades,
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
