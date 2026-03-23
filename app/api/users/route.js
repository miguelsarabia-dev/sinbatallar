import { connectDB } from '@/lib/mongoose'
import User from '@/models/User'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { enviarEmailBienvenidaCliente } from '@/lib/email-service'

// Función de validación sin YUP
function validateUserData(data, isRegister = false) {
    const errors = [];

    if (!data.email || !data.email.includes('@')) {
        errors.push('Email inválido');
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

// GET: Listar todos los usuarios o uno por ID
export async function GET(request) {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    try {
        if (id) {
            let user;
            if (id.includes('@')) {
                user = await User.findOne({ email: id });
            } else if (/^[0-9a-fA-F]{24}$/.test(id)) {
                user = await User.findById(id);
            } else {
                user = await User.findOne({ telefono: id });
            }
            if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
            return NextResponse.json(user);
        } else {
            const users = await User.find({});
            return NextResponse.json(users);
        }
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener usuario(s)', details: error.message }, { status: 400 });
    }
}

// POST: Registro o login de usuario
export async function POST(request) {
    try {
        await connectDB();
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

        // Validación
        if (isRegister) {
            const errors = validateUserData({ email, password, nombre, telefono, role }, true);
            if (errors.length > 0) {
                return NextResponse.json({ error: 'Datos inválidos', details: errors }, { status: 400 });
            }

            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return NextResponse.json({ error: 'Ya existe un usuario con este email' }, { status: 409 });
            }

            const existingPhone = await User.findOne({ telefono });
            if (existingPhone) {
                return NextResponse.json({ error: 'Ya existe un usuario con este teléfono' }, { status: 409 });
            }
        }

        let user = await User.findOne({ email });

        if (!user) {
            if (isRegister) {
                const hashedPassword = await bcrypt.hash(password, 12);
                const userData = {
                    email,
                    password: hashedPassword,
                    nombre,
                    telefono,
                    role: role || 'cliente'
                };
                if (fotoBuffer) {
                    userData.foto = fotoBuffer;
                }
                user = await User.create(userData);

                if (user.role === 'cliente') {
                    enviarEmailBienvenidaCliente({
                        email: user.email,
                        nombre: user.nombre
                    }).catch(err => console.error('Error enviando email de bienvenida:', err));
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
            { error: 'Error del Servidor', details: error.message },
            { status: 500 }
        );
    }
}

// PUT: Actualizar usuario existente
export async function PUT(request) {
    await connectDB();
    const contentType = request.headers.get('content-type') || '';
    let data = {};

    if (contentType.includes('application/json')) {
        data = await request.json();
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
    } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        data._id = formData.get('_id');
        data.nombre = formData.get('nombre');
        data.telefono = formData.get('telefono');
        data.email = formData.get('email');

        const foto = formData.get('foto');
        if (foto && typeof foto.arrayBuffer === 'function') {
            const arrayBuffer = await foto.arrayBuffer();
            data.foto = Buffer.from(arrayBuffer);
        }

        if (formData.get('password')) {
            data.password = await bcrypt.hash(formData.get('password'), 10);
        }
    }

    if (!data._id && !data.id) {
        return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const userId = data._id || data.id;

    // Validación básica
    if (data.role && !['cliente', 'contratista', 'admin', 'aperturador', 'incorporador'].includes(data.role)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    try {
        const { _id, id, ...rest } = data;
        const user = await User.findByIdAndUpdate(userId, rest, { new: true });
        if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: 'Error al actualizar usuario', details: error.message }, { status: 400 });
    }
}

// DELETE: Eliminar usuario
export async function DELETE(request) {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    try {
        const deleted = await User.findByIdAndDelete(id);
        if (!deleted) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
        return NextResponse.json({ message: 'Eliminado' });
    } catch (error) {
        return NextResponse.json({ error: 'Error al eliminar usuario', details: error.message }, { status: 400 });
    }
}