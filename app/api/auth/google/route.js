// app/api/auth/google/route.js
import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request) {
    try {
        const { credential } = await request.json();

        if (!credential) {
            return NextResponse.json(
                { success: false, message: 'Token de Google requerido' },
                { status: 400 }
            );
        }

        // Verificar el token de Google
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            return NextResponse.json(
                { success: false, message: 'No se pudo obtener el email de Google' },
                { status: 400 }
            );
        }

        await connectDB();

        // Buscar usuario existente por email o googleId
        let user = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { googleId }]
        });

        if (!user) {
            // Crear nuevo usuario automáticamente
            user = await User.create({
                email: email.toLowerCase(),
                nombre: name || email.split('@')[0],
                googleId,
                role: 'cliente',
                fotoUrl: picture || '',
            });

            console.log('✅ Nuevo usuario creado con Google:', user.email);
        } else if (!user.googleId) {
            // Vincular cuenta existente con Google
            user.googleId = googleId;
            if (picture && !user.fotoUrl) {
                user.fotoUrl = picture;
            }
            await user.save();
            console.log('🔗 Cuenta existente vinculada con Google:', user.email);
        }

        // Generar JWT interno
        const userData = {
            id: user._id.toString(),
            email: user.email,
            nombre: user.nombre,
            telefono: user.telefono || '',
            role: user.role,
            userType: user.role,
        };

        const token = await signToken(userData);

        return NextResponse.json({
            success: true,
            user: userData,
            token,
        });

    } catch (error) {
        console.error('❌ Error en auth/google:', error);
        return NextResponse.json(
            { success: false, message: 'Error al autenticar con Google', error: error.message },
            { status: 500 }
        );
    }
}
