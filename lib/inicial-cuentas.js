// lib/inicial-cuentas.js
// Reglas puras (sin BD) de las cuentas del MODELO INICIAL: alta de especialistas y aspirantes, qué campos edita
// cada quien y cómo se arma el contratista cuando el admin registra un ascenso. La parte con BD vive en las rutas
// /api/inicial/* y /api/admin/ascensos.
import { errorPasswordAlta } from './password-alta.js';

export const MAX_ASPIRANTES_POR_SERVICIO = 2;
export const SUELDO_SEMANAL_DEFAULT = 4500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Datos de la cuenta (User) al dar de alta a un especialista o aspirante.
 * @returns {{ok:true, datos:{nombre,email,telefono,password}}|{ok:false, error:string}}
 */
export function validarAltaCuenta(body = {}) {
  for (const k of ['nombre', 'email', 'telefono', 'password']) {
    if (body[k] !== undefined && typeof body[k] !== 'string') return { ok: false, error: 'Datos inválidos' };
  }
  const nombre = texto(body.nombre);
  const email = texto(body.email).toLowerCase();
  const telefono = texto(body.telefono);
  if (!nombre || !email || !telefono) return { ok: false, error: 'Campos requeridos: nombre, email, telefono, password' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Email inválido' };
  const errPass = errorPasswordAlta(body.password);
  if (errPass) return { ok: false, error: errPass };
  return { ok: true, datos: { nombre, email, telefono, password: body.password } };
}

// ── Campos editables de un Especialista según quién edita ──
// El propio especialista: solo su disponibilidad y sus datos de pago
export const CAMPOS_ESPECIALISTA_PROPIOS = ['disponible', 'informacionPago', 'direccion'];
// Su asociado: aprobación, zonas, servicios y datos escritos
export const CAMPOS_ESPECIALISTA_ASOCIADO = ['aprobado', 'areasIds', 'servicios', 'curp', 'direccion', 'notas'];
// Admin: todo lo anterior + sueldo, asociado y baja
export const CAMPOS_ESPECIALISTA_ADMIN = [...new Set([
  ...CAMPOS_ESPECIALISTA_PROPIOS, ...CAMPOS_ESPECIALISTA_ASOCIADO, 'activo', 'sueldoSemanal', 'asociado'
])];

// ── Campos editables de un Aspirante ──
// Su especialista: especialidades que aprende, notas y baja
export const CAMPOS_ASPIRANTE_ESPECIALISTA = ['especialidades', 'notas', 'activo'];
export const CAMPOS_ASPIRANTE_ADMIN = [...CAMPOS_ASPIRANTE_ESPECIALISTA, 'especialista'];

/** Relación del actor con un especialista: 'admin' | 'self' | 'asociado' | null */
export function relacionConEspecialista(session, especialista, { perfilIdActor } = {}) {
  if (!session || !especialista) return null;
  if (session.role === 'admin') return 'admin';
  if (session.role === 'especialista' && String(especialista.user?._id || especialista.user) === String(session.id)) return 'self';
  if (session.role === 'asociado' && perfilIdActor && String(especialista.asociado?._id || especialista.asociado) === String(perfilIdActor)) return 'asociado';
  return null;
}

export function camposEspecialistaPara(relacion) {
  if (relacion === 'admin') return CAMPOS_ESPECIALISTA_ADMIN;
  if (relacion === 'asociado') return CAMPOS_ESPECIALISTA_ASOCIADO;
  if (relacion === 'self') return CAMPOS_ESPECIALISTA_PROPIOS;
  return [];
}

/** Relación del actor con un aspirante: 'admin' | 'self' | 'especialista' | null */
export function relacionConAspirante(session, aspirante, { perfilIdActor } = {}) {
  if (!session || !aspirante) return null;
  if (session.role === 'admin') return 'admin';
  if (session.role === 'aspirante' && String(aspirante.user?._id || aspirante.user) === String(session.id)) return 'self';
  if (session.role === 'especialista' && perfilIdActor && String(aspirante.especialista?._id || aspirante.especialista) === String(perfilIdActor)) return 'especialista';
  return null;
}

export function camposAspirantePara(relacion) {
  if (relacion === 'admin') return CAMPOS_ASPIRANTE_ADMIN;
  if (relacion === 'especialista') return CAMPOS_ASPIRANTE_ESPECIALISTA;
  return [];
}

/** Las especialidades de un aspirante tienen que estar entre los servicios de su especialista. */
export function especialidadesFueraDe(especialidades = [], serviciosEspecialista = []) {
  const permitidos = new Set(serviciosEspecialista.map(s => String(s?._id || s)));
  return especialidades.map(String).filter(id => !permitidos.has(id));
}

/** El sueldo semanal es un monto en pesos, no negativo. */
export function sueldoValido(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1_000_000;
}

/**
 * Datos del Contratista que se crea cuando el admin registra el ascenso (examen aprobado fuera de la app).
 * Conserva la misma cuenta: mismo correo, teléfono y contraseña (hash). Zonas y servicios: los del especialista
 * (si asciende un aspirante, las zonas de su especialista y los servicios que aprendía).
 *
 * @param {object} p
 * @param {'especialista'|'aspirante'} p.rol
 * @param {object} p.perfil Especialista o Aspirante (POJO)
 * @param {object} p.user User de la cuenta (con password)
 * @param {object} [p.especialista] el especialista del aspirante (si rol === 'aspirante')
 * @param {Date} [p.fecha]
 * @returns {{ok:true, contratista:object}|{ok:false, status:number, error:string}}
 */
export function planAscenso({ rol, perfil, user, especialista, fecha = new Date() }) {
  if (!['especialista', 'aspirante'].includes(rol)) return { ok: false, status: 400, error: 'rol debe ser especialista o aspirante' };
  if (!perfil || !user) return { ok: false, status: 404, error: 'Cuenta no encontrada' };
  if (perfil.ascenso?.contratista) return { ok: false, status: 409, error: 'Esta cuenta ya ascendió a contratista' };
  if (!user.email) return { ok: false, status: 400, error: 'La cuenta no tiene correo: agrégalo antes de ascenderla' };
  if (!user.telefono) return { ok: false, status: 400, error: 'La cuenta no tiene teléfono: agrégalo antes de ascenderla' };
  if (!user.password) return { ok: false, status: 400, error: 'La cuenta no tiene contraseña' };
  if (rol === 'aspirante' && !especialista) return { ok: false, status: 404, error: 'El aspirante no tiene especialista' };

  const base = rol === 'especialista' ? perfil : especialista;
  const ids = (lista) => (lista || []).map(x => String(x?._id || x));
  const areasIds = ids(base.areasIds).slice(0, 5);
  const servicios = rol === 'especialista' ? ids(perfil.servicios) : ids(perfil.especialidades);

  return {
    ok: true,
    contratista: {
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono,
      password: user.password, // ya es hash: se conserva la misma contraseña
      ...(perfil.curp ? { curp: perfil.curp } : {}),
      ...(perfil.direccion ? { direccion: perfil.direccion } : {}),
      asociado: base.asociado?._id || base.asociado || null,
      servicios,
      areasIds,
      areaId: areasIds[0] || null,
      // El admin lo asciende tras aprobar el examen: entra ya aprobado y activo
      aprobado: true,
      estatus: 'activo',
      activo: true,
      origen: { rol, perfil: perfil._id, user: user._id, fecha }
    }
  };
}
