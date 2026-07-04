// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import Contratista from '@/models/Contratista';
import Ferretero from '@/models/Ferretero';
import { signToken, comparePassword } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password, userType, telefono } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Contraseña requerida' },
        { status: 400 }
      );
    }

    let user = null;
    let userData = null;

    if (userType === 'contratista') {
      // Login de contratista
      if (!email) {
        return NextResponse.json(
          { success: false, message: 'Email requerido para contratistas' },
          { status: 400 }
        );
      }

      user = await Contratista.findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Contratista no encontrado' },
          { status: 401 }
        );
      }

      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }

      userData = {
        id: user._id.toString(),
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        role: 'contratista',
        userType: 'contratista'
      };

    } else if (userType === 'tecnico') {
      if (!email) {
        return NextResponse.json(
          { success: false, message: 'Email requerido' },
          { status: 400 }
        );
      }

      user = await User.findOne({ email: email.toLowerCase(), role: 'tecnico' });
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Técnico no encontrado' },
          { status: 401 }
        );
      }

      const isValidTecnico = await comparePassword(password, user.password);
      if (!isValidTecnico) {
        return NextResponse.json(
          { success: false, message: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }

      const perfilTecnico = await Tecnico.findOne({ user: user._id })
        .populate('contratista', 'nombre email');

      if (!perfilTecnico || !perfilTecnico.activo) {
        return NextResponse.json(
          { success: false, message: 'Tu cuenta está inactiva. Contacta a tu contratista.' },
          { status: 403 }
        );
      }

      userData = {
        id: user._id.toString(),
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        role: 'tecnico',
        userType: 'tecnico',
        contratistaId: perfilTecnico.contratista?._id?.toString() || null,
        contratistaNombre: perfilTecnico.contratista?.nombre || null
      };

    } else if (userType === 'ferretero') {
      if (!email) {
        return NextResponse.json(
          { success: false, message: 'Email requerido' },
          { status: 400 }
        );
      }

      user = await User.findOne({ email: email.toLowerCase(), role: 'ferretero' });
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Ferretero no encontrado' },
          { status: 401 }
        );
      }

      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }

      // Verificar que la cuenta esté activa (aprobada por admin)
      const perfilFerretero = await Ferretero.findOne({ user: user._id });
      if (!perfilFerretero || !perfilFerretero.activo) {
        return NextResponse.json(
          { success: false, message: 'Tu cuenta está pendiente de aprobación. Te notificaremos cuando esté activa.' },
          { status: 403 }
        );
      }

      userData = {
        id: user._id.toString(),
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        role: 'ferretero',
        userType: 'ferretero'
      };

    } else {
      // Login de usuario normal (puede usar email o teléfono)
      if (email && email.includes('@')) {
        user = await User.findOne({ email: email.toLowerCase() });
      } else if (telefono) {
        user = await User.findOne({ telefono });
      } else {
        return NextResponse.json(
          { success: false, message: 'Email o teléfono requerido' },
          { status: 400 }
        );
      }

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Usuario no encontrado' },
          { status: 401 }
        );
      }

      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }

      userData = {
        id: user._id.toString(),
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        role: user.role,
        userType: user.role
      };
    }

    // Generar JWT usando jose
    const token = await signToken(userData);

    return NextResponse.json({
      success: true,
      user: userData,
      token
    });

  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { success: false, message: 'Error del servidor', error: error.message },
      { status: 500 }
    );
  }
}
