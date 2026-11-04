import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSICIONES } from '../lib/transiciones.js';
import Cita from '../models/Cita.js';
import Cotizacion from '../models/Cotizacion.js';

const estadosCita = Cita.schema.path('estado').enumValues;
const estadosCotizacion = Cotizacion.schema.path('estado').enumValues;

// Regresión R-1: la tabla permitía solicitada -> rechazada pero el enum no tenía 'rechazada' (400 al rechazar)
test('todo estado de la tabla de transiciones existe en el enum de la cita (claves y destinos)', () => {
  const usados = new Set([...Object.keys(TRANSICIONES), ...Object.values(TRANSICIONES).flat()]);
  assert.deepEqual([...usados].filter(e => !estadosCita.includes(e)), []);
});

test('todo estado del enum de la cita tiene fila en la tabla (aunque sea terminal)', () => {
  assert.deepEqual(estadosCita.filter(e => !(e in TRANSICIONES)), []);
});

test('rechazar: solicitada -> rechazada y es terminal (no se reabre)', () => {
  assert.ok(TRANSICIONES.solicitada.includes('rechazada'));
  assert.deepEqual(TRANSICIONES.rechazada, []);
  assert.deepEqual(TRANSICIONES.completada, []);
  assert.deepEqual(TRANSICIONES.cancelada, []);
});

test('flujo normal: aceptada -> cotizada -> verificando_pago -> en_progreso -> completada', () => {
  const camino = ['aceptada', 'cotizada', 'verificando_pago', 'en_progreso', 'completada'];
  for (let i = 0; i < camino.length - 1; i++) {
    assert.ok(TRANSICIONES[camino[i]].includes(camino[i + 1]), `${camino[i]} -> ${camino[i + 1]}`);
  }
});

test('la cita guarda el motivo del rechazo', () => {
  assert.ok(Cita.schema.path('motivoRechazo'));
});

// Regresión R-2: el handler no aceptaba 'rechazada_contratista' aunque el modelo la define
test('el modelo de cotización define los estados del flujo de revisión', () => {
  for (const e of ['pendiente_contratista', 'rechazada_contratista', 'enviada', 'aceptada', 'rechazada']) {
    assert.ok(estadosCotizacion.includes(e), e);
  }
  assert.ok(Cotizacion.schema.path('motivoRechazo'));
});
