// lib/reparar-flujos.js
// Detección (pura) de servicios que quedaron a medias cuando una ruta falló después de guardar. Los usa
// scripts/reparar-flujos.mjs. Origen: imports perdidos en un merge hacían que confirmar-cliente, asignar-tecnico y la
// aprobación de estimaciones respondieran 500 DESPUÉS de haber guardado el cambio principal.
import { listoParaCerrar } from './cierre.js';

/**
 * (1) Cita completada con el pago verificado y todo confirmado, pero sin cerrar (pagado=false) o sin comisión:
 * confirmar-cliente guardó clienteConfirmo y falló antes de cerrar el servicio y crear la comisión.
 */
export function citaConCierrePendiente({ cita, cotizacion, comision }) {
  if (!cita || cita.estado !== 'completada' || !cotizacion) return false;
  if (!listoParaCerrar(cita, cotizacion)) return false;
  return !cita.pagado || !comision;
}

/**
 * (2) Cotización ya visible para el cliente ('enviada') cuya cita no avanzó a 'cotizada': el PATCH enviada guardó
 * la cotización y falló antes de mover la cita.
 */
export function cotizacionConCitaSinAvanzar(cotizacion, cita) {
  return cotizacion?.estado === 'enviada' && !!cita && !cita.cotizacionAceptada &&
    ['solicitada', 'atendida', 'aceptada'].includes(cita.estado);
}

/** (3) Cita con técnico asignado sin rastro de la asignación en el historial (solo se reporta). */
export function citaSinHistorialDeAsignacion(cita) {
  return !!cita?.tecnico && !(cita.historial || []).some(h => /asignad|tom[oó]/i.test(h?.comentario || ''));
}
