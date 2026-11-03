// lib/citas-estado.js
// Cambios de estado de una cita con autorización por rol, reglas de cierre y cancelación con
// reembolso. Lo usan PATCH/PUT /citas/:id y PUT /citas.
import Tecnico from '@/models/Tecnico';
import Comision from '@/models/Comision';
import { resolverCotizacionAceptada, montoVerificado } from '@/lib/comisiones';

export const TRANSICIONES = {
  'solicitada':        ['aceptada', 'rechazada', 'cancelada'],
  'pendiente':         ['aceptada', 'rechazada', 'cancelada'],
  'aceptada':          ['en_revision', 'en_progreso', 'cancelada'],
  'en_revision':       ['cotizada', 'en_progreso', 'cancelada'],
  'cotizada':          ['verificando_pago', 'en_progreso', 'cancelada'],
  'verificando_pago':  ['en_progreso', 'cancelada'],
  'atendida':          ['cotizada', 'cancelada'],
  'en_progreso':       ['completada', 'cancelada'],
  'completada':        [],
  'cancelada':         [],
  'rechazada':         []
};

// Desde aquí el cliente ya no puede cancelar por su cuenta (debe pedirlo al contratista/admin).
const ESTADOS_SIN_CANCELACION_CLIENTE = ['verificando_pago', 'en_progreso', 'completada'];

const err = (status, message) => ({ error: { status, message } });

/** Resuelve quién es el actor y si tiene relación con la cita. */
export async function resolverActor(session, cita) {
  const actor = { role: session.role, userId: session.id, tecnicoId: null };
  if (session.role === 'tecnico') {
    const tecnico = await Tecnico.findOne({ user: session.id }).select('_id');
    actor.tecnicoId = tecnico ? String(tecnico._id) : null;
  }
  if (!cita) return actor;

  const idCita = (v) => String(v?._id || v || '');
  switch (session.role) {
    case 'admin': actor.autorizado = true; break;
    case 'cliente': actor.autorizado = idCita(cita.cliente) === session.id; break;
    case 'contratista': actor.autorizado = idCita(cita.contratista) === session.id; break;
    case 'tecnico': actor.autorizado = !!actor.tecnicoId && idCita(cita.tecnico) === actor.tecnicoId; break;
    default: actor.autorizado = false;
  }
  return actor;
}

/**
 * Aplica un cambio de estado. Muta y guarda `cita`.
 * @returns {{error:{status:number,message:string}}|{cita:object, cambio:boolean, canceladoPor?:string, cotizacion?:object}}
 */
export async function cambiarEstadoCita({ cita, estado, comentario, session }) {
  const actor = await resolverActor(session, cita);
  if (!actor.autorizado) return err(403, 'No tienes permiso sobre esta cita');
  if (!estado) return { cita, cambio: false };

  const permitidos = TRANSICIONES[cita.estado] || [];
  if (!permitidos.includes(estado)) {
    return err(400, `No se puede cambiar de ${cita.estado} a ${estado}`);
  }

  // Permisos por rol
  if (actor.role === 'cliente') {
    if (estado !== 'cancelada') return err(403, 'El cliente solo puede cancelar su cita');
    if (ESTADOS_SIN_CANCELACION_CLIENTE.includes(cita.estado)) {
      return err(403, 'Ya no puedes cancelar desde la app; solicítalo al contratista o al administrador');
    }
  }
  if (actor.role === 'tecnico' && !['en_progreso', 'completada'].includes(estado)) {
    return err(403, 'El técnico solo puede iniciar o completar el servicio');
  }
  if (estado === 'completada' && actor.role === 'contratista' && cita.tecnico && !cita.tecnicoMarcoCompletado) {
    return err(403, 'El técnico asignado aún no marca el trabajo como completado');
  }

  const ahora = new Date();
  let cotizacion = null;
  let canceladoPor;

  if (estado === 'cancelada') {
    cotizacion = await resolverCotizacionAceptada(cita);
    const monto = montoVerificado(cotizacion);
    const motivo = (comentario || '').trim();
    if (monto > 0) {
      if (!motivo) return err(400, 'Se requiere un motivo para cancelar una cita con pago verificado');
      cita.reembolso = { estado: 'pendiente', monto, motivo, canceladoPor: actor.role, fecha: ahora };
    }
    if (motivo) cita.motivoCancelacion = motivo;
    canceladoPor = actor.role === 'cliente' ? 'el cliente' : actor.role === 'admin' ? 'el administrador' : 'el contratista';
    await Comision.updateOne({ cita: cita._id }, { estadoPago: 'cancelada' });
  }

  if (estado === 'completada') {
    // Quien ejecuta el trabajo (técnico, o el contratista si no hay técnico) lo marca como terminado.
    if (actor.role === 'tecnico' || actor.role === 'contratista' || !cita.tecnico) {
      cita.tecnicoMarcoCompletado = true;
      cita.fechaTecnicoCompletado = ahora;
    }
    cita.horaFin = cita.horaFin || `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
  }

  const anterior = cita.estado;
  cita.estado = estado;
  cita.historial.push({
    estado,
    fecha: ahora,
    comentario: comentario || `Estado cambiado de ${anterior} a ${estado}`
  });

  // Guardado defensivo: no bloquear la transición por datos legados inconsistentes en otros campos.
  await cita.save({ validateModifiedOnly: true });
  return { cita, cambio: true, canceladoPor, cotizacion };
}
