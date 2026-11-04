import { connectDB } from '@/lib/mongoose'
import User from '@/models/User'
import Incorporador from '@/models/Incorporador'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { enviarEmailBienvenidaCliente } from '@/lib/email-service'
import { getSessionFromRequest } from '@/lib/session'
import { limitarPorIp } from '@/lib/rate-limit'

// Roles que solo un admin puede crear/asignar (el registro público es solo para clientes).
const ROLES_RESTRINGIDOS = ['aperturador', 'incorporador', 'admin'];

async function esAdminLaPeticion(request) {
    const session = await getSessionFromRequest(request);
    return session?.role === 'admin';
}

// Garantiza que un usuario con rol incorporador tenga su doc en la colección
// incorporadores. Idempotente: no duplica si ya existe. El registro de
// contratistas requiere ese doc (POST /contratistas exige su _id).
async function asegurarDocIncorporador(userId) {
    try {
        const existente = await Incorporador.findOne({ user: userId });
        if (!existente) {
            await Incorporador.create({ user: userId });
        }
    } catch (err) {
        console.error('Error asegurando doc de incorporador:', err);
    }
}

// Función de validación sin YUP
function validateUserData(data, isRegister = false) {
    const errors = [];

    const telefonoValido = /^\d{10}$/.test(String(data.telefono ?? '').replace(/\D/g, '').replace(/^52(?=\d{10}$)/, ''));
    if (data.email) {
        if (!data.email.includes('@')) errors.push('Email inválido');
    } else if (!telefonoValido) {
        // Sin email, el teléfono (10 dígitos) es la identidad de la cuenta
        errors.push('Ingresa un email válido o un teléfono de 10 dígitos');
    }

    if (isRegister) {
        if (!data.password || data.password.length < 6) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        }
        if (!data.nombre) errors.push('Nombre requerido');
        if (!data.telefono) errors.push('Teléfono requerido');
    }

    if (data.role && !['cliente', 'contratista', 'admin', 'aperturador', 'incorporador'].includes(data.role)) {
        errors.push('Rol inválido');
    }

    return errors;
}

// GET: Listar usuarios (admin) o leer uno por id / email / teléfono.
// Requiere token. Un usuario solo puede leerse a sí mismo; el admin puede leer a cualquiera.
// Nunca devuelve el password.
export async function GET(request) {
    await connectDB();

    const session = await getSessionFromRequest(request);
    if (!session) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const admin = session.role === 'admin';

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    try {
        if (id) {
            let user;
            if (id.includes('@')) {
                user = await User.findOne({ email: id.toLowerCase() }).select('-password');
            } else if (/^[0-9a-fA-F]{24}$/.test(id)) {
                user = await User.findById(id).select('-password');
            } else {
                user = await User.findOne({ telefono: id }).select('-password');
            }

            const esElMismo = !!user && (String(user._id) === session.id || (!!session.email && user.email === session.email.toLowerCase()));
            if (!admin && !esElMismo) {
                // Mismo 403 exista o no el usuario: no se revela nada a quien no es el dueño.
                return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
            }
            if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
            return NextResponse.json(user);
        }

        if (!admin) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        const users = await User.find({}).select('-password');
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener usuario(s)' }, { status: 400 });
    }
}

// POST: Registro o login de usuario
export async function POST(request) {
    try {
        await connectDB();
        // Registro público: límite por IP (un admin que crea cuentas no se limita)
        if (!(await esAdminLaPeticion(request))) {
            const espera = await limitarPorIp(request, 'registro-usuario', 10);
            if (espera) {
                return NextResponse.json(
                    { error: 'Demasiados intentos de registro. Intenta de nuevo más tarde.' },
                    { status: 429, headers: { 'Retry-After': String(espera) } }
                );
            }
        }
        const contentType = request.headers.get('content-type') || '';
        let email, password, nombre, telefono, role, fotoBuffer;
        let isRegister = false;

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            email = formData.get('email');
            password = formData.get('password');
            nombre = formData.get('nombre');
            telefono = formData.get('telefono');
            role = formData.get('role') || 'cliente';
            isRegister = true;
            const foto = formData.get('foto');
            if (foto && typeof foto.arrayBuffer === 'function') {
                const arrayBuffer = await foto.arrayBuffer();
                fotoBuffer = Buffer.from(arrayBuffer);
            }
        } else {
            const body = await request.json();
            email = body.email;
            password = body.password;
            nombre = body.nombre;
            telefono = body.telefono;
            role = body.role || 'cliente';

            if (nombre && telefono) {
                isRegister = true;
            }
        }

        // El login vive en POST /api/auth/login (con límite de intentos); aquí solo se registra.
        if (!isRegister) {
            return NextResponse.json({ error: 'Para iniciar sesión usa /api/auth/login' }, { status: 400 });
        }
        if ((email != null && typeof email !== 'string') || typeof password !== 'string' || typeof telefono !== 'string') {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }
        // Email opcional (registro solo con teléfono) y teléfono normalizado a 10 dígitos cuando lo es
        email = email && email.trim() ? email.trim().toLowerCase() : null;
        const digitosTel = telefono.replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
        if (/^\d{10}$/.test(digitosTel)) telefono = digitosTel;

        // Validación
        if (isRegister) {
            const errors = validateUserData({ email, password, nombre, telefono, role }, true);
            if (errors.length > 0) {
                return NextResponse.json({ error: 'Datos inválidos', details: errors }, { status: 400 });
            }

            const esAdminQuienCrea = await esAdminLaPeticion(request);
            if (ROLES_RESTRINGIDOS.includes(role) && !esAdminQuienCrea) {
                return NextResponse.json({ error: `Solo un administrador puede crear usuarios con rol ${role}` }, { status: 403 });
            }
            // Registro público: siempre cliente (cualquier otro rol lo asigna un admin)
            if (!esAdminQuienCrea) role = 'cliente';

            const existingEmail = email ? await User.findOne({ email }) : null;
            if (existingEmail) {
                return NextResponse.json({ error: 'Ya existe un usuario con este email' }, { status: 409 });
            }

            const existingPhone = await User.findOne({ telefono });
            if (existingPhone) {
                return NextResponse.json({ error: 'Ya existe un usuario con este teléfono' }, { status: 409 });
            }
        }

        let user = email ? await User.findOne({ email }) : null;

        if (!user) {
            if (isRegister) {
                const hashedPassword = await bcrypt.hash(password, 12);
                const userData = {
                    ...(email ? { email } : {}),
                    password: hashedPassword,
                    nombre,
                    telefono,
                    role: role || 'cliente'
                };
                if (fotoBuffer) {
                    userData.foto = fotoBuffer;
                }
                user = await User.create(userData);

                if (user.role === 'cliente' && user.email) {
                    enviarEmailBienvenidaCliente({
                        email: user.email,
                        nombre: user.nombre
                    }).catch(err => console.error('Error enviando email de bienvenida:', err));
                }

                if (user.role === 'incorporador') {
                    await asegurarDocIncorporador(user._id);
                }

                return NextResponse.json({
                    message: 'Usuario creado exitosamente',
                    _id: user._id,
                    email: user.email,
                    nombre: user.nombre,
                    telefono: user.telefono,
                    role: user.role
                });
            } else {
                return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
            }
        } else {
            if (isRegister) {
                return NextResponse.json({ error: 'Ya existe un usuario con este email' }, { status: 409 });
            }
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: 'Contraseña inválida' }, { status: 401 });
        }

        return NextResponse.json({
            message: 'Usuario autenticado exitosamente',
            user: { email: user.email, nombre: user.nombre, telefono: user.telefono }
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Error del Servidor' },
            { status: 500 }
        );
    }
}

// PUT: Actualizar usuario. Solo uno mismo (campos de perfil) o un admin (además rol).
const CAMPOS_PERFIL = ['nombre', 'telefono', 'email', 'password', 'fotoUrl', 'fotoPublicId', 'identificacion', 'direcciones'];

export async function PUT(request) {
    await connectDB();

    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const admin = session.role === 'admin';

    const contentType = request.headers.get('content-type') || '';
    let data = {};

    if (contentType.includes('application/json')) {
        data = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        data._id = formData.get('_id');
        data.nombre = formData.get('nombre');
        data.telefono = formData.get('telefono');
        data.email = formData.get('email');
        if (formData.get('password')) data.password = formData.get('password');
    }

    const userId = data._id || data.id;
    if (typeof userId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(userId)) {
        return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Solo el propio usuario o admin (un contratista no es un User: usa /api/contratistas)
    if (!admin && userId !== session.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (data.role !== undefined) {
        if (!admin) {
            return NextResponse.json({ error: 'Solo un administrador puede cambiar el rol' }, { status: 403 });
        }
        if (typeof data.role !== 'string' || !['cliente', 'admin', 'aperturador', 'incorporador', 'ferretero', 'tecnico'].includes(data.role)) {
            return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
        }
    }

    // Solo campos permitidos (nada de googleId, _id, etc.), y solo valores string/arreglos simples
    const update = {};
    for (const k of CAMPOS_PERFIL) {
        if (data[k] === undefined) continue;
        if (k === 'direcciones') { if (Array.isArray(data[k])) update[k] = data[k]; continue; }
        if (typeof data[k] !== 'string') {
            return NextResponse.json({ error: `Valor inválido en ${k}` }, { status: 400 });
        }
        update[k] = data[k];
    }
    if (admin && data.role) update.role = data.role;
    if (update.password) {
        if (update.password.length < 6) {
            return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
        }
        update.password = await bcrypt.hash(update.password, 10);
    }
    if (update.email) update.email = update.email.toLowerCase().trim();

    try {
        const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
        if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

        // Si el usuario quedó como incorporador, garantizar su doc para no
        // bloquear el registro de contratistas.
        if (user.role === 'incorporador') {
            await asegurarDocIncorporador(user._id);
        }

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 400 });
    }
}

// DELETE: Eliminar usuario
export async function DELETE(request) {
    await connectDB();
    if (!(await esAdminLaPeticion(request))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    try {
        const deleted = await User.findByIdAndDelete(id);
        if (!deleted) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        return NextResponse.json({ message: 'Eliminado' });
    } catch (error) {
        return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 400 });
    }
}