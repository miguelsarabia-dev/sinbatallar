// lib/inicial-visita.js
// Reglas puras (sin BD) del ACUERDO de la visita para cotizar en el MODELO INICIAL.
//
//   1. El cliente propone un día (y hora) al solicitar → la cita abierta trae fechaVisita/horaVisita.
//   2. El especialista la toma y acepta ese día ("acordada"), o propone otro ("pendiente_cliente").
//   3. Quien recibe una propuesta la acepta o propone otra fecha, y así hasta que los dos estén de acuerdo.
//   4. Con la visita acordada y ya en ese día, el especialista marca su avance: en camino → en sitio → cotizando,
//      y cotiza. El cliente ve cada paso.
//
// cita.acuerdoVisita = { estado, propuestaPor, fechaAcuerdo }. fechaVisita/horaVisita guardan la propuesta vigente
// (o la fecha acordada). Las citas tomadas antes de existir el acuerdo (acuerdoVisita vacío) cuentan como acordadas.

export const ACUERDO = Object.freeze({
  PENDIENTE_CLIENTE: 'pendiente_cliente',           // el especialista propuso: le toca al cliente
  PENDIENTE_ESPECIALISTA: 'pendiente_especialista', // el cliente propuso: le toca al especialista
  ACORDADA: 'acordada',
});
export const ESTADOS_ACUERDO = Object.values(ACUERDO);

/** Zona horaria con la que se decide "hoy" (el servicio opera en México). */
export const ZONA_HORARIA = 'America/Mexico_City';

/** Avance que solo se puede marcar el día de la visita (antes de cotizar). */
export const AVANCE_DE_VISITA = ['en_camino', 'en_sitio', 'cotizando'];

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' de una fecha en la zona horaria de México. */
export function diaLocal(fecha, zona = ZONA_HORARIA) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Estado del acuerdo de la visita. null si la cita no tiene especialista. */
export function estadoAcuerdo(cita) {
  if (!cita?.especialista) return null;
  const e = cita.acuerdoVisita?.estado;
  return ESTADOS_ACUERDO.includes(e) ? e : ACUERDO.ACORDADA; // citas tomadas antes del acuerdo
}

/** ¿Ya es (o ya pasó) el día de la visita, en México? */
export function diaDeVisitaLlegado(cita, ahora = new Date()) {
  if (!cita?.fechaVisita) return false;
  const visita = diaLocal(cita.fechaVisita);
  const hoy = diaLocal(ahora);
  return !!visita && !!hoy && hoy >= visita;
}

/** ¿La visita es hoy (en México)? */
export const visitaEsHoy = (cita, ahora = new Date()) => !!cita?.fechaVisita && diaLocal(cita.fechaVisita) === diaLocal(ahora);

/**
 * Valida una fecha propuesta: 'YYYY-MM-DD' o ISO, de hoy en adelante (en México), con hora 'HH:MM' opcional.
 * Un 'YYYY-MM-DD' se guarda al mediodía de México (18:00 UTC) para que el día no cambie por la zona horaria.
 * @returns {{ok:true, fecha:Date, hora:string|null}|{ok:false, error:string}}
 */
export function validarPropuesta({ fecha, hora } = {}, ahora = new Date()) {
  if (typeof fecha !== 'string' || !fecha.trim()) return { ok: false, error: 'Elige el día de la visita' };
  const f = fecha.trim();
  const d = new Date(DIA_RE.test(f) ? `${f}T18:00:00Z` : f);
  if (Number.isNaN(d.getTime())) return { ok: false, error: 'Fecha de visita inválida' };
  if (diaLocal(d) < diaLocal(ahora)) return { ok: false, error: 'Ese día ya pasó: elige hoy o un día después' };
  if (d.getTime() - ahora.getTime() > 180 * DIA_MS) return { ok: false, error: 'Elige un día dentro de los próximos 6 meses' };
  if (hora !== undefined && hora !== null && hora !== '' && (typeof hora !== 'string' || !HORA_RE.test(hora))) {
    return { ok: false, error: 'Hora de visita inválida (HH:MM)' };
  }
  return { ok: true, fecha: d, hora: hora || null };
}

const textoFecha = (fecha, hora) => `${diaLocal(fecha)}${hora ? ' a las ' + hora : ''}`;
const QUIEN = { cliente: 'El cliente', especialista: 'El especialista' };
const TURNO = { cliente: ACUERDO.PENDIENTE_CLIENTE, especialista: ACUERDO.PENDIENTE_ESPECIALISTA };
const OTRO = { cliente: 'especialista', especialista: 'cliente' };

/** La visita aún se puede (re)acordar: el especialista no ha llegado y no ha cotizado. */
export function visitaNegociable(cita) {
  if (cita?.estado !== 'atendida' || cita.cotizacionAceptada) return false;
  return !['en_sitio', 'cotizando'].includes(cita.subestadoTecnico);
}

/**
 * El cliente o el especialista contesta sobre la visita: acepta la propuesta del otro o propone otra fecha.
 * No guarda: devuelve los campos a cambiar.
 * @param {{cita:object, actor:'cliente'|'especialista', aceptar?:boolean, fecha?:string, hora?:string, ahora?:Date}} p
 * @returns {{ok:true, set:object, comentario:string, avisarA:'cliente'|'especialista', acordada:boolean}
 *          |{ok:false, status:number, error:string}}
 */
export function responderVisita({ cita, actor, aceptar = false, fecha, hora, ahora = new Date() }) {
  if (!QUIEN[actor]) return { ok: false, status: 400, error: 'Actor inválido' };
  if (!cita?.especialista) return { ok: false, status: 409, error: 'La cita aún no tiene especialista' };
  if (!visitaNegociable(cita)) {
    return { ok: false, status: 409, error: 'La visita ya no se puede cambiar: el especialista ya llegó o ya cotizó' };
  }
  const acuerdo = estadoAcuerdo(cita);

  if (aceptar) {
    if (acuerdo !== TURNO[actor]) {
      return {
        ok: false, status: 409,
        error: acuerdo === ACUERDO.ACORDADA ? 'La visita ya está acordada' : `Esperando respuesta del ${OTRO[actor]}`
      };
    }
    if (!cita.fechaVisita) return { ok: false, status: 409, error: 'No hay fecha propuesta: propón una' };
    if (diaLocal(cita.fechaVisita) < diaLocal(ahora)) return { ok: false, status: 409, error: 'Ese día ya pasó: propón otra fecha' };
    return {
      ok: true,
      acordada: true,
      avisarA: OTRO[actor],
      set: {
        acuerdoVisita: { estado: ACUERDO.ACORDADA, propuestaPor: cita.acuerdoVisita?.propuestaPor || OTRO[actor], fechaAcuerdo: ahora }
      },
      comentario: `Visita para cotizar acordada: ${textoFecha(cita.fechaVisita, cita.horaVisita)}`
    };
  }

  const p = validarPropuesta({ fecha, hora }, ahora);
  if (!p.ok) return { ok: false, status: 400, error: p.error };
  return {
    ok: true,
    acordada: false,
    avisarA: OTRO[actor],
    set: {
      fechaVisita: p.fecha,
      horaVisita: p.hora,
      acuerdoVisita: { estado: TURNO[OTRO[actor]], propuestaPor: actor, fechaAcuerdo: null },
      // Si iba en camino y se cambia la fecha, el avance se reinicia
      subestadoTecnico: null,
      fechaSubestadoTecnico: null
    },
    comentario: `${QUIEN[actor]} propone la visita para cotizar: ${textoFecha(p.fecha, p.hora)}`
  };
}

/**
 * Acuerdo con el que queda la cita al tomarla.
 *   aceptarVisita: true → acepta el día que pidió el cliente (debe existir y no haber pasado).
 *   fechaVisita       → propone otra fecha (le toca al cliente).
 *   nada              → la toma y contesta después (le toca al especialista).
 * @returns {{ok:true, set:object, comentario:string|null}|{ok:false, status:number, error:string}}
 */
export function acuerdoAlTomar({ cita, aceptarVisita, fechaVisita, horaVisita, ahora = new Date() }) {
  if (fechaVisita !== undefined && fechaVisita !== null && fechaVisita !== '') {
    const p = validarPropuesta({ fecha: fechaVisita, hora: horaVisita }, ahora);
    if (!p.ok) return { ok: false, status: 400, error: p.error };
    return {
      ok: true,
      set: {
        fechaVisita: p.fecha, horaVisita: p.hora,
        acuerdoVisita: { estado: ACUERDO.PENDIENTE_CLIENTE, propuestaPor: 'especialista', fechaAcuerdo: null }
      },
      comentario: `El especialista propone la visita para cotizar: ${textoFecha(p.fecha, p.hora)}`
    };
  }
  if (aceptarVisita === true) {
    if (!cita?.fechaVisita) return { ok: false, status: 409, error: 'El cliente no eligió día: propón uno' };
    if (diaLocal(cita.fechaVisita) < diaLocal(ahora)) return { ok: false, status: 409, error: 'El día que pidió el cliente ya pasó: propón otro' };
    return {
      ok: true,
      set: { acuerdoVisita: { estado: ACUERDO.ACORDADA, propuestaPor: 'cliente', fechaAcuerdo: ahora } },
      comentario: `Visita para cotizar acordada: ${textoFecha(cita.fechaVisita, cita.horaVisita)}`
    };
  }
  return {
    ok: true,
    set: { acuerdoVisita: { estado: ACUERDO.PENDIENTE_ESPECIALISTA, propuestaPor: 'cliente', fechaAcuerdo: null } },
    comentario: null
  };
}

/**
 * ¿Puede el especialista marcar este avance? Antes de cotizar (cita 'atendida'), en camino / en sitio / cotizando
 * solo con la visita acordada y el día de la visita.
 * @returns {{ok:true}|{ok:false, status:number, error:string}}
 */
export function puedeAvanzarVisita(cita, subestado, ahora = new Date()) {
  if (cita?.estado !== 'atendida' || !AVANCE_DE_VISITA.includes(subestado)) return { ok: true };
  if (estadoAcuerdo(cita) !== ACUERDO.ACORDADA) {
    return { ok: false, status: 409, error: 'Primero acuerden con el cliente el día de la visita' };
  }
  if (!diaDeVisitaLlegado(cita, ahora)) {
    return { ok: false, status: 409, error: `La visita es el ${textoFecha(cita.fechaVisita, cita.horaVisita)}: ese día podrás marcar tu avance` };
  }
  return { ok: true };
}

/** ¿Puede cotizar por primera vez? Con la visita acordada y llegado el día (re-cotizar no se limita). */
export function puedeCotizarVisita(cita, ahora = new Date()) {
  if (cita?.estado !== 'atendida') return { ok: true };
  return puedeAvanzarVisita(cita, 'cotizando', ahora);
}

/** Texto para el cliente sobre la visita (lo usan la web y la app). null si no aplica. */
export function etapaVisitaCliente(cita, ahora = new Date()) {
  if (cita?.modelo !== 'inicial' || cita.estado !== 'atendida') return null;
  const acuerdo = estadoAcuerdo(cita);
  if (acuerdo === ACUERDO.PENDIENTE_CLIENTE) return { clave: 'responder', texto: 'El especialista propone otro día para la visita' };
  if (acuerdo === ACUERDO.PENDIENTE_ESPECIALISTA) return { clave: 'esperando', texto: 'Esperando que el especialista confirme el día' };
  const sub = cita.subestadoTecnico;
  if (sub === 'en_camino') return { clave: 'en_camino', texto: 'El especialista va en camino' };
  if (sub === 'en_sitio') return { clave: 'en_sitio', texto: 'El especialista llegó a tu domicilio' };
  if (sub === 'cotizando') return { clave: 'cotizando', texto: 'El especialista está preparando tu cotización' };
  return { clave: 'acordada', texto: visitaEsHoy(cita, ahora) ? 'Visita acordada para hoy' : 'Visita acordada' };
}
