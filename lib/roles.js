// lib/roles.js
// Roles del sistema y sus equivalencias. Puro (sin BD ni Node): lo usan el middleware (edge), la sesión,
// la política de rutas, componentes y pruebas.
//
// Modelos de negocio:
//   inicial    -> especialista (antes de ser contratista) y sus aspirantes (aprendices)
//   permanente -> contratista y sus técnicos
//   compartidos -> cliente, aperturador, asociado (antes "incorporador"), ferretero, admin
//
// "incorporador" es el nombre ANTERIOR del asociado. Las cuentas existentes lo conservan en la base hasta que se
// corra la migración (scripts/migrar-asociado.mjs) y la app móvil instalada lo sigue mandando; en el servidor se
// trata siempre como 'asociado'.

export const ROL_ASOCIADO = 'asociado';
export const ROL_ESPECIALISTA = 'especialista';
export const ROL_ASPIRANTE = 'aspirante';

/** Alias de roles antiguos -> rol vigente. */
export const ALIAS_ROL = { incorporador: ROL_ASOCIADO, user: 'cliente' };

/** Roles válidos en User.role (incluye el alias antiguo mientras haya cuentas sin migrar). */
export const ROLES_USUARIO = ['cliente', 'admin', 'aperturador', ROL_ASOCIADO, 'incorporador', 'ferretero', 'tecnico', ROL_ESPECIALISTA, ROL_ASPIRANTE];

export const ROLES_INICIAL = [ROL_ESPECIALISTA, ROL_ASPIRANTE];
export const ROLES_PERMANENTE = ['contratista', 'tecnico'];

/** Rol vigente a partir del guardado en la base o en el token. */
export function normalizarRol(rol) {
  if (!rol) return rol;
  return ALIAS_ROL[rol] || rol;
}

export const esAsociado = (rol) => normalizarRol(rol) === ROL_ASOCIADO;

/** Valores con los que se busca a los asociados en User.role (vigente + alias). */
export const ROLES_ASOCIADO_BD = [ROL_ASOCIADO, 'incorporador'];

/** Modelo de negocio al que pertenece un rol operativo, o null si es compartido. */
export function modeloDeRol(rol) {
  const r = normalizarRol(rol);
  if (ROLES_INICIAL.includes(r)) return 'inicial';
  if (ROLES_PERMANENTE.includes(r)) return 'permanente';
  return null;
}

/** Id del asociado mandado por un cliente: acepta el nombre nuevo y el antiguo (app móvil instalada). */
export function asociadoIdDe(fuente) {
  if (!fuente) return undefined;
  if (typeof fuente.get === 'function') return fuente.get('asociadoId') ?? fuente.get('incorporadorId') ?? undefined;
  return fuente.asociadoId ?? fuente.incorporadorId;
}
