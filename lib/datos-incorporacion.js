// lib/datos-incorporacion.js
// Datos escritos requeridos para aprobar a un contratista y el estado de su incorporación (puro, sin base de datos).

// 'zona' = Contratista.areasIds (o areaId en cuentas antiguas): la asigna el incorporador (el contratista no elige su zona)
// 'servicios' = Contratista.servicios: los elige el incorporador al darlo de alta (el contratista no los edita)
export const DATOS_REQUERIDOS = ['nombre', 'email', 'telefono', 'curp', 'direccion', 'especialidad', 'servicios', 'zona'];

const tieneValor = (v) => (typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : v != null);

// Dónde se guarda cada dato en el contratista
const valorDe = (contratista, campo) => (campo === 'zona'
  ? (contratista?.zona ?? (contratista?.areasIds?.length ? contratista.areasIds : contratista?.areaId))
  : contratista?.[campo]);

/** {requeridos, presentes, faltantes} de los datos escritos de un contratista (doc o POJO). */
export function datosIncorporacion(contratista) {
  const presentes = DATOS_REQUERIDOS.filter(c => tieneValor(valorDe(contratista, c)));
  return {
    requeridos: DATOS_REQUERIDOS,
    presentes,
    faltantes: DATOS_REQUERIDOS.filter(c => !presentes.includes(c))
  };
}

/**
 * rechazada · completada (aprobado) · en_proceso (datos completos, esperando aprobación) · pendiente (faltan datos).
 * Un contratista ya aprobado queda 'completada' aunque no tenga zona: no se le exige retroactivamente.
 */
export function estadoIncorporacion(contratista) {
  if (contratista.estatus === 'rechazado') return 'rechazada';
  if (contratista.aprobado) return 'completada';
  return datosIncorporacion(contratista).faltantes.length === 0 ? 'en_proceso' : 'pendiente';
}

/**
 * ¿Quién puede cambiar la zona de un contratista? Solo el admin y el incorporador dueño. Si otro (el propio
 * contratista) manda `areaId`/`areasIds`, se le responde 403 en lugar de ignorarlo en silencio.
 * @param {'admin'|'self'|'incorporador'|null} relacion
 * @param {*} zonas valor recibido en el body (`areasIds`/`areaId`; undefined = no lo mandó)
 * @returns {{ok:true}|{ok:false,status:403,error:string}}
 */
export function permisoCambioZona(relacion, zonas) {
  if (zonas === undefined) return { ok: true };
  if (relacion === 'admin' || relacion === 'incorporador') return { ok: true };
  return { ok: false, status: 403, error: 'La zona la asigna tu incorporador' };
}

/** Igual que la zona: los servicios solo los asigna el incorporador dueño o el admin (403 explícito al contratista). */
export function permisoCambioServicios(relacion, servicios) {
  if (servicios === undefined) return { ok: true };
  if (relacion === 'admin' || relacion === 'incorporador') return { ok: true };
  return { ok: false, status: 403, error: 'Los servicios los asigna tu incorporador' };
}
