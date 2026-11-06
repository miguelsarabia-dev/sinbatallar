// lib/cierre.js
// Condición de cierre de un servicio (pura, sin base de datos; importable también desde scripts y pruebas).

/** El pago completo está verificado y (en pago total) el cliente confirmó el trabajo. */
export function listoParaCerrar(cita, cotizacion) {
  if (!cotizacion) return false;
  if (cotizacion.modalidadPago === 'total') {
    return !!cotizacion.pagoUnico?.verificado && !!cita.clienteConfirmo && !!cita.tecnicoMarcoCompletado;
  }
  return !!cotizacion.anticipo?.verificado && !!cotizacion.saldo?.verificado;
}
