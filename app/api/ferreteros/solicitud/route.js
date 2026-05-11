// POST /api/ferreteros/solicitud
// Registro público de ferretero — queda pendiente hasta aprobación del admin
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Ferretero from '@/models/Ferretero';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

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

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      telefono: telefono?.trim() || '',
      role: 'ferretero'
    });

    await Ferretero.create({
      user: user._id,
      nombreNegocio: nombreNegocio.trim(),
      telefono: telefono?.trim() || '',
      activo: false,
      catalogoActivo: false,
      pendienteAprobacion: true
    });

    return NextResponse.json(
      { message: 'Solicitud enviada. Un administrador revisará tu cuenta.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en POST /api/ferreteros/solicitud:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
