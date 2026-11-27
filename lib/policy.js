// lib/policy.js
// Política de acceso por ruta, evaluada en el middleware (edge) ANTES de llegar al handler.
// Sin dependencias de Node: solo regex. Los handlers siguen haciendo la autorización por DUEÑO
// (que un id pertenezca al usuario del token), esto solo garantiza token y rol.
//
// Reglas en orden, gana la primera que coincide. `admin` siempre pasa en las rutas protegidas.
// 'ANY' = cualquier usuario autenticado. Rutas /api no listadas: ANY.

import { normalizarRol } from './roles.js';

const ANY = 'ANY';
const PUBLIC = 'PUBLIC';

/** [métodos | '*', regex del pathname, roles | ANY | PUBLIC, condición opcional sobre la query] */
export const REGLAS = [
  // ── Públicas (login, registro y catálogos necesarios antes de entrar) ──
  ['POST', /^\/api\/auth\/(login|google)$/, PUBLIC],
  ['POST', /^\/api\/users$/, PUBLIC],                           // registro: SOLO clientes se registran solos (roles privilegiados: solo admin, en el handler)
  ['GET',  /^\/api\/servicios$/, PUBLIC],                       // catálogo del registro de contratistas
  ['GET',  /^\/api\/areas$/, PUBLIC, (q) => q.get('activo') === 'true'],

  // ── Rutas específicas que las reglas genéricas de abajo (p. ej. DELETE /users/:id) NO deben tapar ──
  ['*', /^\/api\/users\/direcciones(\/|$)/, ['cliente']],

  // ── Alta de cuentas que no son de cliente (ya no hay auto-registro) ──
  ['POST', /^\/api\/contratistas$/, ['asociado']],              // el asociado da de alta a sus contratistas
  ['POST', /^\/api\/(contratistas|ferreteros)\/solicitud$/, []], // antes registro público; ahora solo admin
  ['POST', /^\/api\/ferreteros$/, []],                           // solo admin

  // ── Solo admin ──
  ['*', /^\/api\/admin(\/|$)/, ['admin']],
  ['*', /^\/api\/test-email$/, ['admin']],
  ['GET', /^\/api\/(contratistas\/admin-search|users\/admin-search)$/, ['admin']],
  ['GET', /^\/api\/(users|contratistas)\/[^/]+\/details$/, ['admin']],
  ['DELETE', /^\/api\/(users|contratistas|ferreteros|areas)(\/[^/]+)?$/, ['admin']],
  ['DELETE', /^\/api\/citas\/[^/]+$/, ['admin']],
  ['PUT', /^\/api\/users\/[^/]+\/suspender$/, ['admin']],
  ['*', /^\/api\/servicios$/, ['admin']],                        // POST/PUT/DELETE (el GET público ya salió arriba)
  ['GET', /^\/api\/(aperturadores|asociados|incorporadores)(\/|$)/, ['aperturador', 'asociado']],
  ['*', /^\/api\/(aperturadores|asociados|incorporadores)(\/|$)/, []],     // escritura: solo admin
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
  ['POST', /^\/api\/citas\/[^/]+\/visita$/, ['cliente']],           // modelo inicial: el cliente acepta o propone la visita
  ['*',    /^\/api\/citas\/[^/]+\/liberar-ganancia$/, ['contratista']],
  ['PATCH', /^\/api\/citas\/[^/]+\/reembolso$/, []],                  // solo admin
  ['PUT',  /^\/api\/citas\/[^/]+\/finalizar$/, ['tecnico', 'contratista']],
  ['PATCH', /^\/api\/cotizaciones\/[^/]+\/verificar-pago$/, []],   // solo admin: el dinero entra a Sin Batallar
  ['PUT',  /^\/api\/cotizaciones\/[^/]+\/completar$/, ['contratista']],
  ['POST', /^\/api\/comprobantes$/, ['cliente']],
  ['GET',  /^\/api\/comprobantes$/, ['cliente', 'contratista']],
  ['GET',  /^\/api\/ganancias$/, ['contratista', 'tecnico', 'aperturador', 'asociado']],
  ['GET',  /^\/api\/citas\/disponibles$/, ['tecnico']],
  ['GET',  /^\/api\/ferreterias-por-zona$/, ['tecnico', 'contratista']],   // ferreterías para surtir obra: no clientes
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
  ['*',    /^\/api\/incorporaciones(\/|$)/, ['asociado']],

  // ── Modelo inicial (/api/inicial/*): solo sus roles, el asociado que da de alta especialistas y el admin.
  //    Contratistas y técnicos (modelo permanente) no entran aquí. Los handlers además validan al dueño.
  ['GET', /^\/api\/inicial\/especialistas(\/|$)/, ['asociado', 'especialista']],
  ['PUT', /^\/api\/inicial\/especialistas\/[^/]+$/, ['asociado', 'especialista']],
  ['*',   /^\/api\/inicial\/especialistas(\/|$)/, ['asociado']],
  ['GET', /^\/api\/inicial\/aspirantes(\/|$)/, ['especialista', 'aspirante']],
  ['*',   /^\/api\/inicial\/aspirantes(\/|$)/, ['especialista']],
  ['GET', /^\/api\/inicial\/sueldos$/, ['especialista']],                 // sus propios sueldos; generar y pagar: admin
  ['GET', /^\/api\/inicial\/citas$/, ['especialista', 'aspirante']],
  ['GET', /^\/api\/inicial\/ganancias$/, ['especialista', 'aspirante']],
  ['GET', /^\/api\/inicial\/citas\/[^/]+\/reparto$/, ['especialista', 'aspirante']],
  ['*',   /^\/api\/inicial\/citas\/[^/]+\/(tomar|soltar|aspirantes|avance|visita|cotizar|agendar|iniciar|finalizar)$/, ['especialista']],
  ['*',   /^\/api\/inicial(\/|$)/, []],                                   // cualquier otra ruta del inicial: solo admin
  ['POST', /^\/api\/contratistas\/reclamar$/, ['asociado']],
  ['GET', /^\/api\/materiales(\/|$)/, ANY],
  ['*', /^\/api\/materiales(\/|$)/, ['ferretero']],
  ['POST', /^\/api\/upload\/(cotizacion-images|fotos-antes|fotos-despues)$/, ['contratista', 'tecnico']],
  ['POST', /^\/api\/upload\/material-imagen$/, ['ferretero']],
  ['POST', /^\/api\/upload\/foto-perfil$/, ANY],
];

/**
 * @returns {'public'|'allow'|'forbidden'} — 'allow' = hay que exigir token; el rol ya es válido
 */
export function evaluarPolitica(method, pathname, searchParams, rolToken) {
  const role = normalizarRol(rolToken); // 'incorporador' (tokens y cuentas sin migrar) = 'asociado'
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
