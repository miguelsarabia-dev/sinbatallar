'use client';

import { useEffect } from 'react';
import { useSession, signIn } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import useSessionPersistence from '../hooks/useSessionPersistence';

/**
 * Wrapper que maneja la persistencia de sesión para PWA
 * Asegura que la sesión se mantenga abierta como en apps nativas
 */
export default function SessionPersistenceWrapper({ children }) {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const { 
    session: persistentSession, 
    isLoading: isPersistenceLoading,
    isAuthenticated,
    isPersistent 
  } = useSessionPersistence();
  
  const router = useRouter();
  const pathname = usePathname();

  // Rutas que no requieren autenticación
  const publicRoutes = ['/', '/login', '/register', '/offline', '/politicas-de-privacidad'];
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith('/register/') || pathname.startsWith('/politicas-de-privacidad')
  );

  // Determinar si está cargando
  const isLoading = nextAuthStatus === 'loading' || isPersistenceLoading;

  useEffect(() => {
    // Si estamos en una ruta pública, no hacer nada
    if (isPublicRoute) return;

    // Si aún está cargando, esperar
    if (isLoading) return;

    // Si no hay ninguna sesión (ni NextAuth ni persistente)
    if (!isAuthenticated && !nextAuthSession) {
      console.log('[SessionPersistence] No hay sesión, redirigiendo a login');
      router.push('/login');
      return;
    }

    // Si hay sesión persistente pero no NextAuth, intentar restaurar
    if (persistentSession && !nextAuthSession && isPersistent) {
      console.log('[SessionPersistence] Sesión persistente encontrada, manteniendo acceso');
      // La sesión persistente es suficiente para mantener acceso
      // No redirigir a login
    }
  }, [
    isAuthenticated, 
    nextAuthSession, 
    persistentSession, 
    isPersistent,
    isLoading, 
    isPublicRoute, 
    router, 
    pathname
  ]);

  // Mostrar loading mientras se determina el estado de sesión
  if (isLoading && !isPublicRoute) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando Sin Batallar...</p>
          <p className="text-gray-400 text-sm mt-2">Verificando sesión</p>
        </div>
      </div>
    );
  }

  return children;
}