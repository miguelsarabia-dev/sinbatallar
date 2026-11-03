// app/api/auth/login/route.js
// Body: { email | telefono, password, userType? }  (userType: contratista | tecnico | ferretero | otro = usuario)
// El teléfono son 10 dígitos (se toleran +52, espacios y guiones).
// Toda falla de credenciales responde el MISMO 401 genérico para no revelar si la cuenta existe.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import Contratista from '@/models/Contratista';
import Ferretero from '@/models/Ferretero';
import Tecnico from '@/models/Tecnico';
import { signToken, comparePassword } from '@/lib/auth';
import { bloqueadoPor, registrarIntento, registrarFallo, limpiarFallos, ipDeLaPeticion } from '@/lib/rate-limit';

const CREDENCIALES_INVALIDAS = 'Credenciales inválidas';
// Hash bcrypt válido de una contraseña al azar: se compara cuando la cuenta no existe para que
// el tiempo de respuesta no delate si existe o no.
const HASH_FALSO = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.fk.rRVhr1RFv6bl2kRwWe5kYbmzq';

const credencialesInvalidas = () =>
  NextResponse.json({ success: false, message: CREDENCIALES_INVALIDAS }, { status: 401 });

const demasiadosIntentos = (segundos) =>
  NextResponse.json(
    { success: false, message: 'Demasiados intentos. Intenta de nuevo más tarde.' },
    { status: 429, headers: { 'Retry-After': String(segundos) } }
  );

/** Normaliza un teléfono mexicano a 10 dígitos; null si no lo es. */
function normalizarTelefono(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  const diez = digitos.length === 12 && digitos.startsWith('52') ? digitos.slice(2) : digitos;
  return /^\d{10}$/.test(diez) ? diez : null;
}

/** Filtro de Mongo que empata el teléfono guardado con o sin lada/separadores. */
function filtroTelefono(diez) {
  const separados = diez.split('').join('[\\s.-]*');
  return { telefono: { $regex: `^(\\+?52)?[\\s.-]*${separados}$` } };
}

/** Busca por email o teléfono. Devuelve null si el identificador no es utilizable. */
function consultaIdentificador({ email, telefono }, extra = {}) {
  if (email && String(email).includes('@')) {
    return { email: String(email).toLowerCase().trim(), ...extra };
  }
  const diez = normalizarTelefono(telefono ?? email);
  return diez ? { ...filtroTelefono(diez), ...extra } : null;
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password, userType, telefono } = body;

    if (typeof password !== 'string' || !password ||
        (email !== undefined && typeof email !== 'string') ||
        (telefono !== undefined && typeof telefono !== 'string' && typeof telefono !== 'number') ||
        (!email && !telefono)) {
      return NextResponse.json(
        { success: false, message: 'Email o teléfono y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const identificador = { email, telefono };

    // Límite de intentos: por IP y por cuenta (identificador normalizado, exista o no la cuenta).
    const ip = ipDeLaPeticion(request);
    const claveCuenta = (typeof email === 'string' && email.includes('@'))
      ? email.toLowerCase().trim()
      : normalizarTelefono(telefono ?? email);
    const espera = await bloqueadoPor({ ip, cuenta: claveCuenta });
    if (espera) return demasiadosIntentos(espera);
    await registrarIntento(ip);

    let cuenta = null;     // documento con `password`
    let userData = null;

    if (userType === 'contratista') {
      const consulta = consultaIdentificador(identificador);
      cuenta = consulta ? await Contratista.findOne(consulta) : null;
    } else if (userType === 'tecnico' || userType === 'ferretero') {
      const consulta = consultaIdentificador(identificador, { role: userType });
      cuenta = consulta ? await User.findOne(consulta) : null;
    } else {
      const consulta = consultaIdentificador(identificador);
      cuenta = consulta ? await User.findOne(consulta) : null;
    }

    const valida = await comparePassword(password, cuenta?.password || HASH_FALSO);
    if (!cuenta || !cuenta.password || !valida) {
      await registrarFallo(claveCuenta);
      return credencialesInvalidas();
    }
    await limpiarFallos(claveCuenta);

    // Las comprobaciones de estado van después de validar la contraseña (ya se probó que es la cuenta).
    if (userType === 'contratista') {
      userData = {
        id: cuenta._id.toString(),
        email: cuenta.email,
        nombre: cuenta.nombre,
        telefono: cuenta.telefono,
        role: 'contratista',
        userType: 'contratista'
      };
    } else if (userType === 'tecnico') {
      const perfilTecnico = await Tecnico.findOne({ user: cuenta._id })
        .populate('contratista', 'nombre email');

      if (!perfilTecnico || !perfilTecnico.activo) {
        return NextResponse.json(
          { success: false, message: 'Tu cuenta está inactiva. Contacta a tu contratista.' },
          { status: 403 }
        );
      }

      userData = {
        id: cuenta._id.toString(),
        email: cuenta.email,
        nombre: cuenta.nombre,
        telefono: cuenta.telefono,
        role: 'tecnico',
        userType: 'tecnico',
        contratistaId: perfilTecnico.contratista?._id?.toString() || null,
        contratistaNombre: perfilTecnico.contratista?.nombre || null
      };
    } else if (userType === 'ferretero') {
      // La cuenta debe estar activa (aprobada por admin)
      const perfilFerretero = await Ferretero.findOne({ user: cuenta._id });
      if (!perfilFerretero || !perfilFerretero.activo) {
        return NextResponse.json(
          { success: false, message: 'Tu cuenta está pendiente de aprobación. Te notificaremos cuando esté activa.' },
          { status: 403 }
        );
      }

      userData = {
        id: cuenta._id.toString(),
        email: cuenta.email,
        nombre: cuenta.nombre,
        telefono: cuenta.telefono,
        role: 'ferretero',
        userType: 'ferretero'
      };
    } else {
      userData = {
        id: cuenta._id.toString(),
        email: cuenta.email,
        nombre: cuenta.nombre,
        telefono: cuenta.telefono,
        role: cuenta.role,
        userType: cuenta.role
      };
    }

    const token = await signToken(userData);

    return NextResponse.json({ success: true, user: userData, token });

  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { success: false, message: 'Error del servidor' },
      { status: 500 }
    );
  }
}
