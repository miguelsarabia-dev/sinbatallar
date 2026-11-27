import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACUERDO, diaLocal, estadoAcuerdo, diaDeVisitaLlegado, validarPropuesta, responderVisita, acuerdoAlTomar,
  puedeAvanzarVisita, puedeCotizarVisita, etapaVisitaCliente, visitaNegociable
} from '../lib/inicial-visita.js';

// "Hoy" = 27 nov 2026, 10:00 en México (16:00 UTC)
const AHORA = new Date('2026-11-27T16:00:00Z');
const HOY = '2026-11-27';
const MANANA = '2026-11-28';
const dia = (d) => new Date(`${d}T18:00:00Z`);

const cita = (extra = {}) => ({
  estado: 'atendida', modelo: 'inicial', especialista: 'e1', cotizacionAceptada: null,
  fechaVisita: dia(MANANA), horaVisita: '10:00', subestadoTecnico: null, ...extra
});

test('diaLocal usa la hora de México (no UTC)', () => {
  // 27 nov 23:30 en México = 28 nov 05:30 UTC
  assert.equal(diaLocal(new Date('2026-11-28T05:30:00Z')), '2026-11-27');
  assert.equal(diaLocal(dia(MANANA)), MANANA);
});

test('estadoAcuerdo: sin especialista es null; sin acuerdo guardado cuenta como acordada', () => {
  assert.equal(estadoAcuerdo({ especialista: null }), null);
  assert.equal(estadoAcuerdo(cita()), ACUERDO.ACORDADA);
  assert.equal(estadoAcuerdo(cita({ acuerdoVisita: { estado: 'pendiente_cliente' } })), ACUERDO.PENDIENTE_CLIENTE);
});

test('validarPropuesta: hoy sí, ayer no, hora HH:MM', () => {
  assert.equal(validarPropuesta({ fecha: HOY }, AHORA).ok, true);
  assert.equal(diaLocal(validarPropuesta({ fecha: MANANA }, AHORA).fecha), MANANA);
  assert.equal(validarPropuesta({ fecha: '2026-11-26' }, AHORA).ok, false);
  assert.equal(validarPropuesta({ fecha: MANANA, hora: '25:00' }, AHORA).ok, false);
  assert.equal(validarPropuesta({ fecha: MANANA, hora: '09:30' }, AHORA).hora, '09:30');
  assert.equal(validarPropuesta({}, AHORA).ok, false);
});

test('al tomar: acepta el día del cliente → acordada', () => {
  const r = acuerdoAlTomar({ cita: cita(), aceptarVisita: true, ahora: AHORA });
  assert.equal(r.ok, true);
  assert.equal(r.set.acuerdoVisita.estado, ACUERDO.ACORDADA);
});

test('al tomar: propone otra fecha → le toca al cliente', () => {
  const r = acuerdoAlTomar({ cita: cita(), fechaVisita: '2026-12-01', horaVisita: '16:00', ahora: AHORA });
  assert.equal(r.set.acuerdoVisita.estado, ACUERDO.PENDIENTE_CLIENTE);
  assert.equal(diaLocal(r.set.fechaVisita), '2026-12-01');
  assert.equal(r.set.horaVisita, '16:00');
});

test('al tomar sin contestar → le toca al especialista', () => {
  assert.equal(acuerdoAlTomar({ cita: cita(), ahora: AHORA }).set.acuerdoVisita.estado, ACUERDO.PENDIENTE_ESPECIALISTA);
});

test('al tomar: no puede aceptar si el cliente no eligió día o si ya pasó', () => {
  assert.equal(acuerdoAlTomar({ cita: cita({ fechaVisita: null }), aceptarVisita: true, ahora: AHORA }).ok, false);
  assert.equal(acuerdoAlTomar({ cita: cita({ fechaVisita: dia('2026-11-20') }), aceptarVisita: true, ahora: AHORA }).ok, false);
});

test('ida y vuelta: propone el especialista, contrapropone el cliente, acepta el especialista', () => {
  let c = cita({ acuerdoVisita: { estado: ACUERDO.PENDIENTE_CLIENTE, propuestaPor: 'especialista' } });

  // El especialista no puede aceptar su propia propuesta
  assert.equal(responderVisita({ cita: c, actor: 'especialista', aceptar: true, ahora: AHORA }).ok, false);

  // El cliente propone otro día
  let r = responderVisita({ cita: c, actor: 'cliente', fecha: '2026-11-30', hora: '12:00', ahora: AHORA });
  assert.equal(r.ok, true);
  assert.equal(r.avisarA, 'especialista');
  assert.equal(r.set.acuerdoVisita.estado, ACUERDO.PENDIENTE_ESPECIALISTA);
  c = { ...c, ...r.set };

  // Ahora el cliente no puede aceptar (espera al especialista)
  assert.equal(responderVisita({ cita: c, actor: 'cliente', aceptar: true, ahora: AHORA }).ok, false);

  // El especialista acepta
  r = responderVisita({ cita: c, actor: 'especialista', aceptar: true, ahora: AHORA });
  assert.equal(r.ok, true);
  assert.equal(r.acordada, true);
  assert.equal(r.avisarA, 'cliente');
  assert.equal(r.set.acuerdoVisita.estado, ACUERDO.ACORDADA);
});

test('ya acordada: aceptar falla; reprogramar vuelve a dejarla pendiente del otro', () => {
  const c = cita({ acuerdoVisita: { estado: ACUERDO.ACORDADA } });
  assert.equal(responderVisita({ cita: c, actor: 'cliente', aceptar: true, ahora: AHORA }).ok, false);
  const r = responderVisita({ cita: c, actor: 'especialista', fecha: '2026-12-02', ahora: AHORA });
  assert.equal(r.set.acuerdoVisita.estado, ACUERDO.PENDIENTE_CLIENTE);
});

test('no se negocia si ya llegó, ya cotizó o la cita no es atendida', () => {
  assert.equal(visitaNegociable(cita({ subestadoTecnico: 'en_sitio' })), false);
  assert.equal(visitaNegociable(cita({ estado: 'cotizada' })), false);
  assert.equal(visitaNegociable(cita({ subestadoTecnico: 'en_camino' })), true);
  assert.equal(responderVisita({ cita: cita({ subestadoTecnico: 'cotizando' }), actor: 'cliente', fecha: MANANA, ahora: AHORA }).ok, false);
});

test('cambiar la fecha estando en camino reinicia el avance', () => {
  const r = responderVisita({ cita: cita({ subestadoTecnico: 'en_camino' }), actor: 'especialista', fecha: MANANA, ahora: AHORA });
  assert.equal(r.set.subestadoTecnico, null);
});

test('avance: solo con la visita acordada y el día de la visita', () => {
  const pendiente = cita({ fechaVisita: dia(HOY), acuerdoVisita: { estado: ACUERDO.PENDIENTE_CLIENTE } });
  assert.equal(puedeAvanzarVisita(pendiente, 'en_camino', AHORA).ok, false);

  const manana = cita({ acuerdoVisita: { estado: ACUERDO.ACORDADA } });
  assert.equal(puedeAvanzarVisita(manana, 'en_camino', AHORA).ok, false);
  assert.equal(diaDeVisitaLlegado(manana, AHORA), false);

  const hoy = cita({ fechaVisita: dia(HOY), acuerdoVisita: { estado: ACUERDO.ACORDADA } });
  assert.equal(puedeAvanzarVisita(hoy, 'en_camino', AHORA).ok, true);
  assert.equal(puedeCotizarVisita(hoy, AHORA).ok, true);
  assert.equal(puedeCotizarVisita(manana, AHORA).ok, false);

  // Después de cotizar (o durante el trabajo) no aplica esta regla
  assert.equal(puedeAvanzarVisita({ ...manana, estado: 'en_progreso' }, 'en_camino', AHORA).ok, true);
  assert.equal(puedeCotizarVisita({ ...manana, estado: 'cotizada' }, AHORA).ok, true);
});

test('etapa que ve el cliente', () => {
  assert.equal(etapaVisitaCliente(cita({ acuerdoVisita: { estado: 'pendiente_cliente' } }), AHORA).clave, 'responder');
  assert.equal(etapaVisitaCliente(cita({ acuerdoVisita: { estado: 'pendiente_especialista' } }), AHORA).clave, 'esperando');
  assert.equal(etapaVisitaCliente(cita({ subestadoTecnico: 'en_camino' }), AHORA).texto, 'El especialista va en camino');
  assert.equal(etapaVisitaCliente(cita({ fechaVisita: dia(HOY) }), AHORA).texto, 'Visita acordada para hoy');
  assert.equal(etapaVisitaCliente(cita({ estado: 'cotizada' }), AHORA), null);
  assert.equal(etapaVisitaCliente(cita({ modelo: null }), AHORA), null);
});
