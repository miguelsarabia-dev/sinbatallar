// lib/policy.js
// Política de acceso por ruta, evaluada en el middleware (edge) ANTES de llegar al handler.
// Sin dependencias de Node: solo regex. Los handlers siguen haciendo la autorización por DUEÑO
// (que un id pertenezca al usuario del token), esto solo garantiza token y rol.
//
// Reglas en orden, gana la primera que coincide. `admin` siempre pasa en las rutas protegidas.
// 'ANY' = cualquier usuario autenticado. Rutas /api no listadas: ANY.

const ANY = 'ANY';
const PUBLIC = 'PUBLIC';

/** [métodos | '*', regex del pathname, roles | ANY | PUBLIC, condición opcional sobre la query] */
export const REGLAS = [
  // ── Públicas (login, registro y catálogos necesarios antes de entrar) ──
  ['POST', /^\/api\/auth\/(login|google)$/, PUBLIC],
  ['POST', /^\/api\/users$/, PUBLIC],                           // registro de cliente (roles privilegiados: solo admin, en el handler)
  ['POST', /^\/api\/(contratistas|ferreteros)\/solicitud$/, PUBLIC],
  ['POST', /^\/api\/(contratistas|ferreteros)$/, PUBLIC],       // auto-registro; el handler lo deja inactivo si no es admin/incorporador
  ['GET',  /^\/api\/servicios$/, PUBLIC],                       // catálogo del registro de contratistas
  ['GET',  /^\/api\/areas$/, PUBLIC, (q) => q.get('activo') === 'true'],

  // ── Rutas específicas que las reglas genéricas de abajo (p. ej. DELETE /users/:id) NO deben tapar ──
  ['*', /^\/api\/users\/direcciones(\/|$)/, ['cliente']],

  // ── Solo admin ──
  ['*', /^\/api\/admin(\/|$)/, ['admin']],
  ['*', /^\/api\/test-email$/, ['admin']],
  ['GET', /^\/api\/(contratistas\/admin-search|users\/admin-search)$/, ['admin']],
  ['GET', /^\/api\/(users|contratistas)\/[^/]+\/details$/, ['admin']],
  ['DELETE', /^\/api\/(users|contratistas|ferreteros|areas)(\/[^/]+)?$/, ['admin']],
  ['DELETE', /^\/api\/citas\/[^/]+$/, ['admin']],
  ['PUT', /^\/api\/users\/[^/]+\/suspender$/, ['admin']],
  ['*', /^\/api\/servicios$/, ['admin']],                        // POST/PUT/DELETE (el GET público ya salió arriba)
  ['GET', /^\/api\/(aperturadores|incorporadores)(\/|$)/, ['aperturador', 'incorporador']],
  ['*', /^\/api\/(aperturadores|incorporadores)(\/|$)/, []],     // escritura: solo admin
  ['*', /^\/api\/areas\/[^/]+\/toggle-activo$/, ['aperturador']],
  ['*', /^\/api\/areas\/estadisticas$/, ['aperturador']],
  ['GET',  /^\/api\/areas\/demanda$/, ['aperturador']],
  ['POST', /^\/api\/areas$/, ['aperturador']],
  ['PUT',  /^\/api\/areas(\/|$)/, ['aperturador']],

  // ── Por rol ──
  ['POST', /^\/api\/calificaciones$/, ['cliente']],
  ['POST', /^\/api\/citas$/, ['cliente']],
  ['POST', /^\/api\/citas\/[^/]+\/calificar$/, ['cliente']],
  ['PUT',  /^\/api\/citas\/[^/]+\/calificar$/, ['cliente']],
  ['*', /^\/api\/citas\/[^/]+\/(tomar|asignar-tecnico)$/, ['contratista']],
  ['PATCH', /^\/api\/citas\/[^/]+\/subestado$/, ['tecnico']],
  ['*',    /^\/api\/citas\/[^/]+\/confirmar-cliente$/, ['cliente']],
  ['*',    /^\/api\/citas\/[^/]+\/liberar-ganancia$/, ['contratista']],
  ['PATCH', /^\/api\/citas\/[^/]+\/reembolso$/, []],                  // solo admin
  ['PUT',  /^\/api\/citas\/[^/]+\/finalizar$/, ['tecnico', 'contratista']],
  ['PATCH', /^\/api\/cotizaciones\/[^/]+\/verificar-pago$/, ['contratista']],
  ['PUT',  /^\/api\/cotizaciones\/[^/]+\/completar$/, ['contratista']],
  ['POST', /^\/api\/comprobantes$/, ['cliente']],
  ['GET',  /^\/api\/comprobantes$/, ['cliente', 'contratista']],
  ['GET',  /^\/api\/ganancias$/, ['contratista', 'tecnico', 'aperturador', 'incorporador']],
  ['GET',  /^\/api\/citas\/disponibles$/, ['tecnico']],
  ['POST', /^\/api\/citas\/[^/]+\/tomar-tecnico$/, ['tecnico']],
  ['GET', /^\/api\/citas\/pendientes-asignacion$/, ['contratista']],
  ['POST', /^\/api\/servicios-programables\/solicitar$/, ['cliente']],
  ['POST', /^\/api\/cotizaciones(\/crear)?$/, ['contratista', 'tecnico']],
  ['*', /^\/api\/cotizaciones\/[^/]+\/(aprobar|iniciar|responder)$/, ['contratista', 'tecnico']],
  ['*', /^\/api\/cotizaciones\/[^/]+\/decision$/, ['cliente']],
  ['POST', /^\/api\/tecnicos$/, ['contratista']],
  ['GET',  /^\/api\/solicitudes-materiales(\/|$)/, ['ferretero', 'contratista', 'tecnico']],
  ['POST', /^\/api\/solicitudes-materiales$/, ['contratista', 'tecnico']],
  ['PATCH', /^\/api\/solicitudes-materiales\/[^/]+$/, ['ferretero']],
  ['*',    /^\/api\/incorporaciones(\/|$)/, ['incorporador']],
  ['POST', /^\/api\/contratistas\/reclamar$/, ['incorporador']],
  ['GET', /^\/api\/materiales(\/|$)/, ANY],
  ['*', /^\/api\/materiales(\/|$)/, ['ferretero']],
  ['POST', /^\/api\/upload\/(cotizacion-images|fotos-antes|fotos-despues)$/, ['contratista', 'tecnico']],
  ['POST', /^\/api\/upload\/material-imagen$/, ['ferretero']],
  ['POST', /^\/api\/upload\/foto-perfil$/, ANY],
];

/**
 * @returns {'public'|'allow'|'forbidden'} — 'allow' = hay que exigir token; el rol ya es válido
 */
export function evaluarPolitica(method, pathname, searchParams, role) {
  for (const regla of REGLAS) {
    const [metodos, re, roles, cond] = regla;
    if (metodos !== '*' && metodos !== method) continue;
    if (!re.test(pathname)) continue;
    if (cond && !cond(searchParams)) continue;
    if (roles === PUBLIC) return 'public';
    if (!role) return 'allow';                              // sin token: el middleware responderá 401
    if (role === 'admin' || roles === ANY || roles.includes(role)) return 'allow';
    return 'forbidden';
  }
  return 'allow';
}

/**
 * Decisión final del middleware para una petición /api (pura, para poder probarla sin servidor).
 * @param role rol del token válido, o null/undefined si no hay token (o es inválido)
 * @returns {200|401|403}
 */
export function decidirAcceso(method, pathname, searchParams, role) {
  const decision = evaluarPolitica(method, pathname, searchParams, role);
  if (decision === 'public') return 200;
  if (!role) return 401;
  return decision === 'forbidden' ? 403 : 200;
}

/** ¿Qué regla explícita cubre esta ruta? (para auditar que ningún handler quede sin política). */
export function reglaDe(method, pathname, searchParams = new URLSearchParams()) {
  for (const [metodos, re, roles, cond] of REGLAS) {
    if (metodos !== '*' && metodos !== method) continue;
    if (!re.test(pathname)) continue;
    if (cond && !cond(searchParams)) continue;
    return { publica: roles === PUBLIC, roles: Array.isArray(roles) ? roles : roles === ANY ? 'ANY' : null };
  }
  return null; // sin regla explícita: solo exige token (cualquier rol)
}
