// lib/auth.js
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcrypt';

// Clave secreta para JWT - debe estar en .env
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'tu-clave-secreta-muy-segura-aqui'
);

const JWT_EXPIRES = '7d'; // Token expira en 7 días

/**
 * Genera un token JWT para el usuario
 * @param {Object} payload - Datos del usuario (id, email, role, nombre)
 * @returns {Promise<string>} Token JWT
 */
export async function signToken(payload) {
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRES)
        .sign(JWT_SECRET);

    return token;
}

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token JWT a verificar
 * @returns {Promise<Object|null>} Payload del token o null si es inválido
 */
export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        console.error('Error verificando token:', error.message);
        return null;
    }
}

/**
 * Hashea una contraseña
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Contraseña hasheada
 */
export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Compara una contraseña con su hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hashedPassword - Contraseña hasheada
 * @returns {Promise<boolean>} true si coinciden
 */
export async function comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Extrae el token del header Authorization
 * @param {Request} request - Request de Next.js
 * @returns {string|null} Token o null
 */
export function getTokenFromHeader(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

/**
 * Middleware helper para verificar autenticación
 * @param {Request} request - Request de Next.js
 * @returns {Promise<Object|null>} Usuario autenticado o null
 */
export async function getAuthUser(request) {
    const token = getTokenFromHeader(request);
    if (!token) return null;

    const payload = await verifyToken(token);
    return payload;
}

/**
 * Helper para respuestas de error de autenticación
 */
export const AuthErrors = {
    UNAUTHORIZED: { error: 'No autorizado', status: 401 },
    FORBIDDEN: { error: 'Acceso denegado', status: 403 },
    INVALID_CREDENTIALS: { error: 'Credenciales inválidas', status: 401 },
    TOKEN_EXPIRED: { error: 'Token expirado', status: 401 }
};
