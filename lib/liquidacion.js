// lib/liquidacion.js
// "Forzar a liquidar": cuando el técnico termina, el cliente debe liquidar lo que falta (saldo del 50%, o confirmar
// el trabajo si ya pagó el total). Mientras tenga un servicio terminado sin liquidar no puede pedir otro.

/** Pura. ¿Falta que el cliente liquide? (cotización = la aceptada de la cita) */
export function pendienteDeLiquidar(cita, cotizacion) {
  if (!cita || !cotizacion) return false;
  if (cita.estado !== 'completada' || !cita.tecnicoMarcoCompletado || cita.pagado) return false;
  if (cotizacion.modalidadPago === 'total') return !cita.clienteConfirmo; // ya pagó: solo falta confirmar
  return !cotizacion.saldo?.declarado && !cotizacion.saldo?.verificado; // anticipo: falta declarar el saldo
}
