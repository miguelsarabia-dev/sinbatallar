// app/api/ferreteros/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Ferretero from '@/models/Ferretero';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { requireSession, getSessionFromRequest } from '@/lib/session';
import { esObjectId, pick } from '@/lib/sanitize';


// GET /api/ferreteros
// Query: ?userId=  → devuelve el perfil del ferretero por userId
export async function GET(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Perfil: el propio ferretero o admin
      if (!esObjectId(userId) || (session.role !== 'admin' && !(session.role === 'ferretero' && session.id === userId))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      const ferretero = await Ferretero.findOne({ user: userId }).populate('user', 'nombre email telefono fotoUrl');
      if (!ferretero) {
        return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
      }
      return NextResponse.json(ferretero);
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const ferreteros = await Ferretero.find()
      .populate('user', 'nombre email telefono fotoUrl')
      .sort({ createdAt: -1 });

    return NextResponse.json(ferreteros);
  } catch (error) {
    console.error('Error en GET /api/ferreteros:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/ferreteros
// Crea usuario con role ferretero + perfil Ferretero
export async function POST(request) {
  try {
    await connectDB();

    // Auto-registro público permitido, pero queda pendiente de aprobación (solo admin lo deja activo).
    const session = await getSessionFromRequest(request);
    const esAdmin = session?.role === 'admin';
    const { nombre, email, password, telefono, nombreNegocio, direccion, ubicacion } = await request.json();
    for (const v of [nombre, email, password, telefono, nombreNegocio, direccion]) {
      if (v !== undefined && typeof v !== 'string') {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
      }
    }

    if (!nombre || !email || !password || !nombreNegocio) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, email, password, nombreNegocio' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      nombre,
      email: email.toLowerCase(),
      password: hashedPassword,
      telefono,
      role: 'ferretero'
    });

    const ferretero = await Ferretero.create({
      user: user._id,
      nombreNegocio,
      telefono,
      direccion: direccion?.trim() || '',
      ...(ubicacion?.lat != null && ubicacion?.lng != null
        ? { ubicacion: { type: 'Point', coordinates: [ubicacion.lng, ubicacion.lat] } }
        : {}),
      ...(esAdmin ? {} : { activo: false, catalogoActivo: false, pendienteAprobacion: true })
    });

    return NextResponse.json(
      { message: 'Ferretero creado exitosamente', ferretero: { _id: ferretero._id, nombreNegocio: ferretero.nombreNegocio }, user: { id: user._id, email: user.email, nombre: user.nombre } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en POST /api/ferreteros:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
