// middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { evaluarPolitica } from '@/lib/policy';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || ''
);

// CORS: solo orígenes web conocidos. La app móvil no usa CORS (no manda Origin).
// Orígenes extra: variable CORS_ORIGINS="https://a.com,https://b.com"
const ORIGENES_PERMITIDOS = new Set([
  'https://sinbatallar.vercel.app',
  ...(process.env.NEXTAUTH_URL ? [process.env.NEXTAUTH_URL.replace(/\/$/, '')] : []),
  ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')] : []),
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean) : []),
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : [])
]);

function addCorsHeaders(request, response) {
  const origin = request.headers.get('origin');
  // Origen no listado: sin headers CORS (el navegador bloquea) y sin credentials.
  if (origin && ORIGENES_PERMITIDOS.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

// Rutas protegidas y públicas
const protectedRoutes = ['/main', '/admin', '/contratista', '/aperturador', '/incorporador', '/ferretero', '/tecnico'];
const publicRoutes = ['/', '/login', '/register', '/politicas-de-privacidad', '/terminos-y-condiciones', '/api/auth/login', '/api/auth/register'];

async function verifyTokenMiddleware(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Manejar Preflight (OPTIONS) requests para rutas API
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return addCorsHeaders(request, new NextResponse(null, { status: 204 }));
  }

  // API: token obligatorio salvo las rutas públicas de lib/policy.js, con control de rol por ruta.
  // La autorización por dueño (que el id sea del usuario del token) la hacen los handlers.
  if (pathname.startsWith('/api/')) {
    let token = request.cookies.get('auth-token')?.value;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);

    const payload = token ? await verifyTokenMiddleware(token) : null;
    const role = payload ? (payload.role || payload.userType) : null;
    const normalizado = role === 'user' ? 'cliente' : role;

    const decision = evaluarPolitica(request.method, pathname, request.nextUrl.searchParams, normalizado);

    if (decision === 'public') {
      return addCorsHeaders(request, NextResponse.next());
    }
    if (!payload) {
      return addCorsHeaders(request, NextResponse.json({ error: 'No autenticado' }, { status: 401 }));
    }
    if (decision === 'forbidden') {
      return addCorsHeaders(request, NextResponse.json({ error: 'No autorizado' }, { status: 403 }));
    }
    return addCorsHeaders(request, NextResponse.next());
  }

  // Rutas públicas - permitir siempre
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Rutas estáticas y recursos - permitir siempre
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Verificar si es ruta protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Obtener token de cookies o header Authorization
  let token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Si no hay token, redirigir a login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return addCorsHeaders(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar token
  const payload = await verifyTokenMiddleware(token);

  if (!payload) {
    // Token inválido - redirigir a login o emitir 401 para API
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      response.cookies.delete('auth-token');
      return addCorsHeaders(request, response);
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth-token');
    return response;
  }

  const userRole = payload.role || payload.userType;
  // Admin puede acceder a todo
  if (userRole === 'admin') {
    return NextResponse.next();
  }

  // Verificar acceso específico por rol
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    return redirectByRole(userRole, request);
  }

  if (userRole === 'aperturador' && !pathname.startsWith('/aperturador')) {
    return NextResponse.redirect(new URL('/aperturador', request.url));
  }

  if (userRole === 'incorporador' && !pathname.startsWith('/incorporador')) {
    return NextResponse.redirect(new URL('/incorporador', request.url));
  }

  if (userRole === 'ferretero' && !pathname.startsWith('/ferretero')) {
    return NextResponse.redirect(new URL('/ferretero', request.url));
  }

  if (userRole === 'tecnico' && !pathname.startsWith('/tecnico')) {
    return NextResponse.redirect(new URL('/tecnico', request.url));
  }

  if (userRole === 'contratista' && !pathname.startsWith('/contratista')) {
    return NextResponse.redirect(new URL('/contratista/dashboard', request.url));
  }



  if ((userRole === 'cliente' || userRole === 'user') &&
    !pathname.startsWith('/main') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/main/servicios-programables', request.url));
  }

  const response = NextResponse.next();
  if (pathname.startsWith('/api/')) {
    return addCorsHeaders(request, response);
  }
  return response;
}

function redirectByRole(role, request) {
  const redirectMap = {
    'contratista': '/contratista/dashboard',
    'aperturador': '/aperturador',
    'incorporador': '/incorporador',
    'ferretero': '/ferretero',
    'tecnico': '/tecnico',
    'cliente': '/main/servicios-programables',
    'user': '/main/servicios-programables'
  };

  const redirectUrl = redirectMap[role] || '/login';
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}

export const config = {
  matcher: [
    '/api/:path*',
    '/main/:path*',
    '/admin/:path*',
    '/contratista/:path*',
    '/aperturador/:path*',
    '/incorporador/:path*',
    '/ferretero/:path*',
    '/tecnico/:path*'
  ]
};
