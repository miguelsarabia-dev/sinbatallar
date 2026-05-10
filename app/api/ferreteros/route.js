// app/api/ferreteros/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Ferretero from '@/models/Ferretero';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

// GET /api/ferreteros
// Query: ?userId=  → devuelve el perfil del ferretero por userId
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const ferretero = await Ferretero.findOne({ user: userId }).populate('user', 'nombre email telefono fotoUrl');
      if (!ferretero) {
        return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
      }
      return NextResponse.json(ferretero);
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

    const { nombre, email, password, telefono, nombreNegocio } = await request.json();

    if (!nombre || !email || !password || !nombreNegocio) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, email, password, nombreNegocio' },
        { status: 400 }
      );
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
      telefono
    });

    return NextResponse.json(
      { message: 'Ferretero creado exitosamente', ferretero, user: { id: user._id, email: user.email, nombre: user.nombre } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en POST /api/ferreteros:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
