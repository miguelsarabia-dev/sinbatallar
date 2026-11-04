// POST /api/contratistas/solicitud
// Registro público — queda con estatus 'pendiente' hasta que un incorporador lo acepte
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import { hashPassword } from '@/lib/auth';
import { enviarEmailBienvenidaContratista } from '@/lib/email-service';
import { limitarPorIp } from '@/lib/rate-limit';

export async function POST(request) {
  try {
    await connectDB();

    const espera = await limitarPorIp(request, 'solicitud-contratista', 5);
    if (espera) {
      return NextResponse.json(
        { error: 'Demasiados intentos de registro. Intenta de nuevo más tarde.' },
        { status: 429, headers: { 'Retry-After': String(espera) } }
      );
    }
    const { nombre, direccion, telefono, email, password, servicios, ubicacion } = await request.json();

    if (!nombre || !direccion || !telefono || !email || !password) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, direccion, telefono, email, password' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(telefono)) {
      return NextResponse.json(
        { error: 'El teléfono debe tener 10 dígitos' },
        { status: 400 }
      );
    }

    if (!ubicacion?.lat || !ubicacion?.lng) {
      return NextResponse.json(
        { error: 'Ubicación requerida' },
        { status: 400 }
      );
    }

    const existe = await Contratista.findOne({ email: email.toLowerCase() });
    if (existe) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta registrada con ese email' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const contratista = await Contratista.create({
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      servicios: servicios || [],
      ubicacion: {
        lat: ubicacion.lat,
        lng: ubicacion.lng,
        direccion: ubicacion.direccion || direccion.trim()
      },
      incorporador: null,
      aprobado: false,
      activo: false,
      estatus: 'pendiente'
    });

    enviarEmailBienvenidaContratista({ email: contratista.email, nombre: contratista.nombre })
      .catch(err => console.error('Error enviando email bienvenida contratista:', err));

    return NextResponse.json(
      { message: 'Solicitud enviada. Un incorporador revisará y activará tu cuenta.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en POST /api/contratistas/solicitud:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
