// middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'tu-clave-secreta-muy-segura-aqui'
);

// Rutas protegidas y públicas
const protectedRoutes = ['/main', '/admin', '/contratista', '/aperturador', '/incorporador'];
const publicRoutes = ['/', '/login', '/register', '/politicas-de-privacidad', '/api/auth/login', '/api/auth/register'];

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

  // Rutas de API públicas - permitir siempre
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/protected/')) {
    return NextResponse.next();
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
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar token
  const payload = await verifyTokenMiddleware(token);

  if (!payload) {
    // Token inválido - redirigir a login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth-token');
    return response;
  }

  const userRole = payload.role || payload.userType;
  console.log('Middleware - User role:', userRole, 'Path:', pathname);

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

  if (userRole === 'contratista' && !pathname.startsWith('/contratista')) {
    return NextResponse.redirect(new URL('/contratista/dashboard', request.url));
  }



  if ((userRole === 'cliente' || userRole === 'user') &&
    !pathname.startsWith('/main') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/main/servicios-programables', request.url));
  }

  return NextResponse.next();
}

function redirectByRole(role, request) {
  const redirectMap = {
    'contratista': '/contratista/dashboard',
    'aperturador': '/aperturador',
    'incorporador': '/incorporador',
    'cliente': '/main/servicios-programables',
    'user': '/main/servicios-programables'
  };

  const redirectUrl = redirectMap[role] || '/login';
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}

export const config = {
  matcher: [
    '/main/:path*',
    '/admin/:path*',
    '/contratista/:path*',
    '/aperturador/:path*',
    '/incorporador/:path*'
  ]
};
