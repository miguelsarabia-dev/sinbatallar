import { redirect } from "next/navigation";

/**
 * Obtiene la ruta de dashboard para un rol
 */
function dashboardPathForRole(role) {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'contratista':
      return '/contratista/dashboard';
    case 'cliente':
    case 'user':
      return '/main/servicios-programables';
    default:
      return '/login';
  }
}

/**
 * Redirige al usuario a su dashboard correspondiente según su rol
 * @param {Object} session - La sesión del usuario
 * @param {string} requiredRole - El rol requerido para acceder a la página actual
 */
export function redirectByRole(session, requiredRole) {
  // Si no hay sesión, redirigir al login
  if (!session) {
    redirect('/login');
  }

  // Si el usuario tiene el rol correcto, no hacer nada (permitir acceso)
  const userRole = session.user?.role || session.user?.userType;
  if (userRole === requiredRole) {
    return; // Usuario tiene el rol correcto, no redirigir
  }

  // Solo redirigir si el usuario tiene un rol diferente al requerido
  const dashboardPath = dashboardPathForRole(userRole);
  redirect(dashboardPath);
}

/**
 * Middleware para proteger rutas específicas de roles
 * @param {Object} session - La sesión del usuario
 * @param {string} requiredRole - El rol requerido
 * @returns {void}
 */
export function requireRole(session, requiredRole) {
  redirectByRole(session, requiredRole);
}
