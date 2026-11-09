import test from 'node:test';
import assert from 'node:assert/strict';
import { citaConCierrePendiente, cotizacionConCitaSinAvanzar, citaSinHistorialDeAsignacion } from '../lib/reparar-flujos.js';
import { listoParaCerrar } from '../lib/cierre.js';

const total = { modalidadPago: 'total', pagoUnico: { verificado: true } };
const citaOk = { estado: 'completada', clienteConfirmo: true, tecnicoMarcoCompletado: true };

test('cierre pendiente: pago total verificado y confirmado pero sin pagado o sin comisión', () => {
  assert.equal(citaConCierrePendiente({ cita: { ...citaOk, pagado: false }, cotizacion: total, comision: null }), true);
  assert.equal(citaConCierrePendiente({ cita: { ...citaOk, pagado: true }, cotizacion: total, comision: null }), true);   // falta la comisión
  assert.equal(citaConCierrePendiente({ cita: { ...citaOk, pagado: true }, cotizacion: total, comision: { _id: 1 } }), false); // ya cerrada
});

test('cierre pendiente: no toca lo que todavía no está listo', () => {
  assert.equal(citaConCierrePendiente({ cita: { ...citaOk, clienteConfirmo: false }, cotizacion: total, comision: null }), false);
  assert.equal(citaConCierrePendiente({ cita: citaOk, cotizacion: { modalidadPago: 'total', pagoUnico: { verificado: false } }, comision: null }), false);
  assert.equal(citaConCierrePendiente({ cita: { ...citaOk, estado: 'en_progreso' }, cotizacion: total, comision: null }), false);
  assert.equal(citaConCierrePendiente({ cita: citaOk, cotizacion: null, comision: null }), false);
});

test('cierre pendiente: con anticipo exige anticipo y saldo verificados', () => {
  const cot = (a, s) => ({ modalidadPago: 'anticipo', anticipo: { verificado: a }, saldo: { verificado: s } });
  assert.equal(listoParaCerrar(citaOk, cot(true, true)), true);
  assert.equal(listoParaCerrar(citaOk, cot(true, false)), false);
  assert.equal(citaConCierrePendiente({ cita: { ...citaOk, pagado: false }, cotizacion: cot(true, true), comision: null }), true);
});

test('cotización enviada con la cita sin avanzar', () => {
  const enviada = { estado: 'enviada' };
  for (const estado of ['solicitada', 'atendida', 'aceptada']) {
    assert.equal(cotizacionConCitaSinAvanzar(enviada, { estado }), true, estado);
  }
  assert.equal(cotizacionConCitaSinAvanzar(enviada, { estado: 'cotizada' }), false);
  assert.equal(cotizacionConCitaSinAvanzar(enviada, { estado: 'aceptada', cotizacionAceptada: 'x' }), false); // ya contratada
  assert.equal(cotizacionConCitaSinAvanzar({ estado: 'pendiente_contratista' }, { estado: 'aceptada' }), false);
  assert.equal(cotizacionConCitaSinAvanzar(enviada, null), false);
});

test('técnico sin rastro de asignación en el historial', () => {
  assert.equal(citaSinHistorialDeAsignacion({ tecnico: 't1', historial: [{ comentario: 'Cita tomada' }] }), true);
  assert.equal(citaSinHistorialDeAsignacion({ tecnico: 't1', historial: [{ comentario: 'Técnico Juan asignado' }] }), false);
  assert.equal(citaSinHistorialDeAsignacion({ tecnico: 't1', historial: [{ comentario: 'Técnico Ana tomó el servicio' }] }), false);
  assert.equal(citaSinHistorialDeAsignacion({ tecnico: null, historial: [] }), false);
});
