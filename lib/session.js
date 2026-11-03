// lib/session.js
// Sesión a partir del JWT (cookie `auth-token` o `Authorization: Bearer`).
// Los handlers deben deducir al actor de aquí y no de ids mandados en el body.
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * @returns {Promise<{id:string, role:string, email?:string, nombre?:string, contratistaId?:string|null}|null>}
 * `id` es el _id del documento Contratista si role === 'contratista'; en el resto de roles es el _id del User.
 */
export async function getSessionFromRequest(request) {
  let token = request.cookies?.get?.('auth-token')?.value;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.id) return null;

  const role = payload.role || payload.userType;
  return {
    id: String(payload.id),
    role: role === 'user' ? 'cliente' : role,
    email: payload.email,
    nombre: payload.nombre,
    contratistaId: payload.contratistaId || null
  };
}

/**
 * Exige sesión (y opcionalmente un rol). Uso:
 *   const { session, error } = await requireSession(request, ['admin']);
 *   if (error) return error;
 */
export async function requireSession(request, roles) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  if (roles && !roles.includes(session.role)) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }
  return { session };
}

export const esAdmin = (session) => session?.role === 'admin';
