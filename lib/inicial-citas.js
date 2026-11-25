// lib/inicial-citas.js
// Reglas puras (sin BD) del flujo de una cita en el MODELO INICIAL:
//   1. El cliente solicita en su zona: la cita queda ABIERTA (sin contratista ni especialista).
//   2. La ven los especialistas de esa zona que ofrecen ese servicio; la toma el primero que acepta.
//   3. El especialista elige hasta 2 aspirantes, va al domicilio (visita sin costo) y cotiza ahí mismo.
//   4. El cliente aprueba y paga el anticipo (50%) con comprobante en la app; Sin Batallar lo verifica.
//   5. Se agenda día y hora, se hace el trabajo, el cliente paga el saldo y se cierra.
//
// Dos fechas distintas:
//   fechaVisita / horaVisita         -> visita para COTIZAR (la pide el cliente al solicitar; la confirma el especialista)
//   fechaProgramada / horaInicio     -> día en que EMPIEZA EL TRABAJO (se acuerda en sitio: va en la cotización y se
//                                      guarda cuando el cliente la acepta; el especialista puede reprogramarla)
import { MAX_ASPIRANTES_POR_SERVICIO } from './inicial-cuentas.js';

const id = (v) => String(v?._id || v || '');
export const TASA_IVA = 0.16;

/** Una cita está en la bolsa abierta (nadie la ha tomado). */
export function citaAbierta(cita) {
  return !!cita && cita.estado === 'solicitada' && !cita.contratista && !cita.especialista;
}

/** Zona de la cita (ubicacion.zona). */
export const zonaDeCita = (cita) => id(cita?.ubicacion?.zona) || null;

/**
 * ¿Este especialista puede ver/tomar esta cita abierta? Debe estar activo, aprobado y disponible, la cita en una de
 * sus zonas y el servicio entre los suyos.
 * @returns {{ok:true}|{ok:false, status:number, error:string}}
 */
export function puedeTomar(cita, especialista) {
  if (!especialista || !especialista.activo) return { ok: false, status: 403, error: 'Tu cuenta de especialista no está activa' };
  if (!especialista.aprobado) return { ok: false, status: 403, error: 'Tu cuenta aún está en revisión' };
  if (especialista.disponible === false) return { ok: false, status: 409, error: 'Estás en pausa: reanuda tu disponibilidad para tomar servicios' };
  if (!citaAbierta(cita)) return { ok: false, status: 409, error: 'La cita ya no está disponible: otro la tomó o fue cancelada' };
  const zona = zonaDeCita(cita);
  if (!zona || !(especialista.areasIds || []).map(id).includes(zona)) return { ok: false, status: 403, error: 'La cita no está en tus zonas' };
  if (!(especialista.servicios || []).map(id).includes(id(cita.servicio))) return { ok: false, status: 403, error: 'No ofreces este servicio' };
  return { ok: true };
}

/** El especialista dueño de la cita. */
export const esDeEspecialista = (cita, especialistaId) => !!especialistaId && id(cita?.especialista) === id(especialistaId);

/** Mientras no esté cerrada o cancelada, el especialista puede cambiar a los aspirantes que lleva. */
export const ESTADOS_EDITABLES = ['atendida', 'cotizada', 'aceptada', 'verificando_pago', 'en_progreso'];

/**
 * Valida la lista de aspirantes que lleva el especialista.
 * @param {string[]} ids
 * @param {Array<{_id, activo, especialista}>} propios aspirantes del especialista (sus docs)
 * @returns {{ok:true, aspirantes:string[]}|{ok:false, status:number, error:string}}
 */
export function validarAspirantes(ids, propios, especialistaId) {
  if (!Array.isArray(ids)) return { ok: false, status: 400, error: 'aspirantes debe ser una lista' };
  const unicos = [...new Set(ids.map(String))];
  if (unicos.length > MAX_ASPIRANTES_POR_SERVICIO) {
    return { ok: false, status: 400, error: `Puedes llevar máximo ${MAX_ASPIRANTES_POR_SERVICIO} aspirantes por servicio` };
  }
  const porId = new Map((propios || []).map(a => [id(a._id), a]));
  for (const a of unicos) {
    const doc = porId.get(a);
    if (!doc || id(doc.especialista) !== id(especialistaId)) return { ok: false, status: 403, error: 'Solo puedes llevar a tus propios aspirantes' };
    if (!doc.activo) return { ok: false, status: 409, error: 'Uno de los aspirantes no está activo' };
  }
  return { ok: true, aspirantes: unicos };
}

/** Avance en sitio que marca el especialista (mismo campo que usa el técnico en el modelo permanente). */
export const SUBESTADOS = ['en_camino', 'en_sitio', 'cotizando', 'trabajando'];

/** Estados en que el especialista puede (re)cotizar: antes de que el cliente acepte. */
export const ESTADOS_COTIZABLES = ['atendida', 'cotizada'];

const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Valida una fecha (ISO o 'YYYY-MM-DD') y una hora opcional 'HH:MM'. No acepta días que ya pasaron.
 * @returns {{ok:true, fecha:Date, hora:string|null}|{ok:false, error:string}}
 */
export function validarFechaHora({ fecha, hora } = {}, { etiqueta = 'fecha', ahora = new Date() } = {}) {
  if (typeof fecha !== 'string' || !fecha.trim()) return { ok: false, error: `${etiqueta} es requerida` };
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha}T12:00:00` : fecha);
  if (Number.isNaN(d.getTime())) return { ok: false, error: `${etiqueta} inválida` };
  if (d.getTime() < ahora.getTime() - 24 * 60 * 60 * 1000) return { ok: false, error: `${etiqueta}: ese día ya pasó` };
  if (hora !== undefined && hora !== null && hora !== '' && (typeof hora !== 'string' || !HORA_RE.test(hora))) {
    return { ok: false, error: `Hora de ${etiqueta} inválida (HH:MM)` };
  }
  return { ok: true, fecha: d, hora: hora || null };
}

/**
 * El cliente aceptó una cotización del modelo inicial: el día de inicio propuesto pasa a ser el inicio del trabajo.
 * No guarda. @returns {boolean} si cambió la cita
 */
export function aplicarInicioAceptado(cita, cotizacion) {
  if (cita?.modelo !== 'inicial' || !cotizacion?.fechaInicioPropuesta) return false;
  cita.fechaProgramada = cotizacion.fechaInicioPropuesta;
  if (cotizacion.horaInicioPropuesta) cita.horaInicio = cotizacion.horaInicioPropuesta;
  cita.historial?.push?.({
    estado: cita.estado,
    fecha: new Date(),
    comentario: `Inicio del trabajo acordado: ${new Date(cotizacion.fechaInicioPropuesta).toISOString().slice(0, 10)}${cotizacion.horaInicioPropuesta ? ' a las ' + cotizacion.horaInicioPropuesta : ''}`
  });
  return true;
}

/**
 * Arma los totales de la cotización hecha en sitio. La mano de obra es la base del reparto; los materiales van en
 * líneas aparte (no entran al reparto) y el IVA se suma encima.
 * @returns {{ok:true, cotizacion:object}|{ok:false, error:string}}
 */
export function armarCotizacion({ descripcionTrabajo, manoDeObra, materiales = [], fechaInicio, horaInicio } = {}, { ahora } = {}) {
  const mo = Number(manoDeObra);
  if (!Number.isFinite(mo) || mo <= 0) return { ok: false, error: 'La mano de obra debe ser mayor a 0' };
  if (mo > 10_000_000) return { ok: false, error: 'Mano de obra fuera de rango' };
  if (descripcionTrabajo !== undefined && typeof descripcionTrabajo !== 'string') return { ok: false, error: 'descripcionTrabajo inválida' };
  if (!Array.isArray(materiales)) return { ok: false, error: 'materiales debe ser una lista' };

  const lineas = [];
  for (const m of materiales) {
    const nombre = typeof m?.nombre === 'string' ? m.nombre.trim() : '';
    const cantidad = Number(m?.cantidad);
    const precio = Number(m?.precioPorUnidad);
    if (!nombre || !Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(precio) || precio < 0) {
      return { ok: false, error: 'Cada material necesita nombre, cantidad mayor a 0 y precio por unidad' };
    }
    lineas.push({
      nombre,
      ...(typeof m.descripcion === 'string' && m.descripcion.trim() ? { descripcion: m.descripcion.trim() } : {}),
      cantidad,
      precioPorUnidad: redondear(precio),
      total: redondear(cantidad * precio)
    });
  }

  // Inicio del trabajo acordado en sitio (opcional: también se puede agendar después)
  let inicio = null;
  if (fechaInicio !== undefined && fechaInicio !== null && fechaInicio !== '') {
    const f = validarFechaHora({ fecha: fechaInicio, hora: horaInicio }, { etiqueta: 'Fecha de inicio', ahora });
    if (!f.ok) return { ok: false, error: f.error };
    inicio = f;
  }

  const manoDeObraR = redondear(mo);
  const costoMateriales = redondear(lineas.reduce((s, l) => s + l.total, 0));
  const subtotal = redondear(manoDeObraR + costoMateriales);
  const iva = redondear(subtotal * TASA_IVA);
  const total = redondear(subtotal + iva);
  return {
    ok: true,
    cotizacion: {
      descripcionTrabajo: (descripcionTrabajo || '').trim(),
      materiales: lineas,
      manoDeObra: manoDeObraR,
      costoMateriales,
      subtotal,
      porcentajeIva: TASA_IVA * 100,
      iva,
      total,
      ...(inicio ? { fechaInicioPropuesta: inicio.fecha, horaInicioPropuesta: inicio.hora } : {})
    }
  };
}

/** El pago que permite empezar el trabajo ya fue verificado por Sin Batallar (anticipo, o pago total). */
export function pagoInicialVerificado(cotizacion) {
  if (!cotizacion) return false;
  return cotizacion.modalidadPago === 'total' ? !!cotizacion.pagoUnico?.verificado : !!cotizacion.anticipo?.verificado;
}

/** ¿Puede el especialista soltar la cita (regresarla a la bolsa)? Solo antes de que el cliente acepte una cotización. */
export function puedeSoltar(cita) {
  return ['atendida', 'cotizada'].includes(cita?.estado) && !cita?.cotizacionAceptada;
}
