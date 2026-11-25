// Flujo de una cita del modelo inicial: bolsa abierta, tomar, aspirantes, cotización en sitio y oferta por zona.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  citaAbierta, puedeTomar, validarAspirantes, armarCotizacion, pagoInicialVerificado, puedeSoltar, esDeEspecialista
} from '../lib/inicial-citas.js';
import { armarOfertaZona, esSolicitudAbierta, SOLICITUD_ABIERTA } from '../lib/oferta-zona.js';
import { evaluarPolitica } from '../lib/policy.js';
import { listoParaCerrar } from '../lib/cierre.js';

const ev = (m, p, r) => evaluarPolitica(m, p, new URLSearchParams(), r);

const especialista = { _id: 'e1', activo: true, aprobado: true, disponible: true, areasIds: ['z1', 'z2'], servicios: ['pintura', 'plomeria'] };
const abierta = { estado: 'solicitada', contratista: null, especialista: null, servicio: 'pintura', ubicacion: { zona: 'z1' } };

test('la cita abierta la puede tomar un especialista de esa zona y servicio', () => {
  assert.ok(citaAbierta(abierta));
  assert.deepEqual(puedeTomar(abierta, especialista), { ok: true });
});

test('no se toma: ya tomada, otra zona, otro servicio, cuenta en revisión o en pausa', () => {
  assert.equal(puedeTomar({ ...abierta, especialista: 'e2' }, especialista).status, 409, 'ya la tomó otro especialista');
  assert.equal(puedeTomar({ ...abierta, contratista: 'c1' }, especialista).status, 409, 'ya la tomó un contratista');
  assert.equal(puedeTomar({ ...abierta, estado: 'cancelada' }, especialista).status, 409);
  assert.equal(puedeTomar({ ...abierta, ubicacion: { zona: 'z9' } }, especialista).status, 403);
  assert.equal(puedeTomar({ ...abierta, servicio: 'herreria' }, especialista).status, 403);
  assert.equal(puedeTomar(abierta, { ...especialista, aprobado: false }).status, 403);
  assert.equal(puedeTomar(abierta, { ...especialista, disponible: false }).status, 409);
  assert.equal(puedeTomar(abierta, { ...especialista, activo: false }).status, 403);
});

test('aspirantes: máximo 2, propios y activos', () => {
  const propios = [
    { _id: 'a1', activo: true, especialista: 'e1' },
    { _id: 'a2', activo: true, especialista: 'e1' },
    { _id: 'a3', activo: true, especialista: 'e1' },
    { _id: 'a4', activo: false, especialista: 'e1' }
  ];
  assert.deepEqual(validarAspirantes(['a1', 'a2'], propios, 'e1'), { ok: true, aspirantes: ['a1', 'a2'] });
  assert.deepEqual(validarAspirantes([], propios, 'e1'), { ok: true, aspirantes: [] }, 'puede ir solo');
  assert.deepEqual(validarAspirantes(['a1', 'a1'], propios, 'e1').aspirantes, ['a1'], 'sin repetidos');
  assert.equal(validarAspirantes(['a1', 'a2', 'a3'], propios, 'e1').ok, false);
  assert.equal(validarAspirantes(['a4'], propios, 'e1').status, 409, 'inactivo');
  assert.equal(validarAspirantes(['otro'], propios, 'e1').status, 403, 'de otro especialista');
  assert.equal(validarAspirantes('a1', propios, 'e1').ok, false);
});

test('cotización en sitio: mano de obra, materiales aparte e IVA encima', () => {
  const r = armarCotizacion({
    descripcionTrabajo: ' Pintar sala ',
    manoDeObra: 3000,
    materiales: [{ nombre: 'Pintura', cantidad: 2, precioPorUnidad: 450 }, { nombre: 'Rodillo', cantidad: 1, precioPorUnidad: 99.5 }]
  });
  assert.ok(r.ok);
  assert.equal(r.cotizacion.descripcionTrabajo, 'Pintar sala');
  assert.equal(r.cotizacion.costoMateriales, 999.5);
  assert.equal(r.cotizacion.subtotal, 3999.5);
  assert.equal(r.cotizacion.iva, 639.92);
  assert.equal(r.cotizacion.total, 4639.42);
  assert.equal(r.cotizacion.materiales[1].total, 99.5);
});

test('cotización: datos inválidos', () => {
  assert.equal(armarCotizacion({ manoDeObra: 0 }).ok, false);
  assert.equal(armarCotizacion({ manoDeObra: '1000' }).ok, true, 'número como texto se acepta');
  assert.equal(armarCotizacion({ manoDeObra: 1000, materiales: [{ nombre: '', cantidad: 1, precioPorUnidad: 1 }] }).ok, false);
  assert.equal(armarCotizacion({ manoDeObra: 1000, materiales: [{ nombre: 'x', cantidad: 0, precioPorUnidad: 1 }] }).ok, false);
  assert.equal(armarCotizacion({ manoDeObra: 1000, materiales: 'x' }).ok, false);
  assert.equal(armarCotizacion({ manoDeObra: 1000, descripcionTrabajo: { $ne: 1 } }).ok, false);
});

test('se empieza a trabajar con el anticipo (o el pago total) verificado', () => {
  assert.equal(pagoInicialVerificado(null), false);
  assert.equal(pagoInicialVerificado({ modalidadPago: 'anticipo', anticipo: { verificado: false } }), false);
  assert.equal(pagoInicialVerificado({ modalidadPago: 'anticipo', anticipo: { verificado: true } }), true);
  assert.equal(pagoInicialVerificado({ modalidadPago: 'total', pagoUnico: { verificado: true } }), true);
  assert.equal(pagoInicialVerificado({ modalidadPago: 'total', anticipo: { verificado: true } }), false);
});

test('el servicio se cierra con el pago completo verificado (mismo criterio que el permanente)', () => {
  const cot = { modalidadPago: 'anticipo', anticipo: { verificado: true }, saldo: { verificado: true } };
  assert.ok(listoParaCerrar({}, cot));
  assert.ok(!listoParaCerrar({}, { ...cot, saldo: { verificado: false } }));
});

test('soltar la cita: solo antes de que el cliente acepte', () => {
  assert.ok(puedeSoltar({ estado: 'atendida' }));
  assert.ok(puedeSoltar({ estado: 'cotizada' }));
  assert.ok(!puedeSoltar({ estado: 'cotizada', cotizacionAceptada: 'q1' }));
  assert.ok(!puedeSoltar({ estado: 'en_progreso' }));
  assert.ok(esDeEspecialista({ especialista: { _id: 'e1' } }, 'e1'));
  assert.ok(!esDeEspecialista({ especialista: null }, 'e1'));
});

// ── Oferta por zona (lo que ve el cliente) ──
const servicio = (k) => ({ _id: k, nombre: k, categoria: 'hogar' });
const especialistas = [{ servicios: [servicio('pintura'), servicio('plomeria')] }, { servicios: [servicio('pintura')] }];
const contratistas = [{ _id: 'c1', nombre: 'Juan', servicios: [servicio('pintura'), servicio('herreria')] }];

test('con el permanente apagado el cliente solo ve servicios de especialistas, como solicitud abierta', () => {
  const oferta = armarOfertaZona({ contratistas, especialistas, permanenteActivo: false });
  assert.deepEqual(oferta.map(o => o.servicio._id).sort(), ['pintura', 'plomeria']);
  const pintura = oferta.find(o => o.servicio._id === 'pintura');
  assert.equal(pintura.especialistas, 2);
  assert.equal(pintura.contratistas[0]._id, SOLICITUD_ABIERTA, 'la app instalada manda contratistas[0]._id');
  assert.equal(pintura.totalContratistas, 0);
  assert.deepEqual(pintura.modelos, ['inicial']);
});

test('con el permanente activo se suman los contratistas; la solicitud abierta va primero', () => {
  const oferta = armarOfertaZona({ contratistas, especialistas, permanenteActivo: true });
  const pintura = oferta.find(o => o.servicio._id === 'pintura');
  assert.deepEqual(pintura.contratistas.map(c => c._id), [SOLICITUD_ABIERTA, 'c1']);
  assert.deepEqual(pintura.modelos, ['inicial', 'permanente']);
  const herreria = oferta.find(o => o.servicio._id === 'herreria');
  assert.deepEqual(herreria.contratistas.map(c => c._id), ['c1'], 'solo contratistas: sin solicitud abierta');
});

test('qué contratistaId significa solicitud abierta', () => {
  for (const v of ['abierta', 'auto', '', null, undefined]) assert.ok(esSolicitudAbierta(v), String(v));
  assert.ok(!esSolicitudAbierta('64b7f0c2a1b2c3d4e5f60718'));
});

// ── Permisos ──
test('solo el especialista opera sus citas del inicial; el aspirante solo consulta', () => {
  for (const accion of ['tomar', 'soltar', 'cotizar', 'iniciar', 'finalizar']) {
    assert.equal(ev('POST', `/api/inicial/citas/1/${accion}`, 'especialista'), 'allow', accion);
    assert.equal(ev('POST', `/api/inicial/citas/1/${accion}`, 'aspirante'), 'forbidden', accion);
    assert.equal(ev('POST', `/api/inicial/citas/1/${accion}`, 'contratista'), 'forbidden', accion);
    assert.equal(ev('POST', `/api/inicial/citas/1/${accion}`, 'cliente'), 'forbidden', accion);
  }
  assert.equal(ev('PUT', '/api/inicial/citas/1/aspirantes', 'especialista'), 'allow');
  assert.equal(ev('PUT', '/api/inicial/citas/1/agendar', 'especialista'), 'allow');
  assert.equal(ev('PATCH', '/api/inicial/citas/1/avance', 'especialista'), 'allow');
  assert.equal(ev('GET', '/api/inicial/citas', 'aspirante'), 'allow');
  assert.equal(ev('GET', '/api/inicial/citas/1/reparto', 'aspirante'), 'allow');
  assert.equal(ev('GET', '/api/inicial/citas', 'contratista'), 'forbidden');
  assert.equal(ev('POST', '/api/citas/1/tomar', 'especialista'), 'forbidden', 'la bolsa del permanente es del contratista');
});

// ── Fechas: visita para cotizar vs inicio del trabajo ──
import { validarFechaHora, aplicarInicioAceptado } from '../lib/inicial-citas.js';

const ahora = new Date('2026-11-24T15:00:00Z');

test('fecha y hora: formato, hora HH:MM y no en el pasado', () => {
  const r = validarFechaHora({ fecha: '2026-11-28', hora: '10:30' }, { ahora });
  assert.ok(r.ok);
  assert.equal(r.hora, '10:30');
  assert.equal(validarFechaHora({ fecha: '2026-11-28' }, { ahora }).hora, null, 'la hora es opcional');
  assert.equal(validarFechaHora({ fecha: '2026-11-01' }, { ahora }).ok, false, 'ya pasó');
  assert.equal(validarFechaHora({ fecha: '2026-11-28', hora: '25:00' }, { ahora }).ok, false);
  assert.equal(validarFechaHora({ fecha: 'mañana' }, { ahora }).ok, false);
  assert.equal(validarFechaHora({}, { ahora }).ok, false);
});

test('la cotización puede traer el día de inicio acordado en sitio', () => {
  const con = armarCotizacion({ manoDeObra: 1000, fechaInicio: '2026-12-01', horaInicio: '09:00' }, { ahora });
  assert.ok(con.ok);
  assert.equal(con.cotizacion.horaInicioPropuesta, '09:00');
  assert.ok(con.cotizacion.fechaInicioPropuesta instanceof Date);
  const sin = armarCotizacion({ manoDeObra: 1000 }, { ahora });
  assert.equal(sin.cotizacion.fechaInicioPropuesta, undefined, 'si aún no lo saben, se agenda después');
  assert.equal(armarCotizacion({ manoDeObra: 1000, fechaInicio: '2020-01-01' }, { ahora }).ok, false);
});

test('al aceptar, el inicio propuesto pasa a la cita y la visita no se toca', () => {
  const visita = new Date('2026-11-26T17:00:00Z');
  const cita = { modelo: 'inicial', estado: 'aceptada', fechaVisita: visita, horaVisita: '11:00', historial: [] };
  const inicio = new Date('2026-12-01T18:00:00Z');
  assert.ok(aplicarInicioAceptado(cita, { fechaInicioPropuesta: inicio, horaInicioPropuesta: '09:00' }));
  assert.equal(cita.fechaProgramada, inicio);
  assert.equal(cita.horaInicio, '09:00');
  assert.equal(cita.fechaVisita, visita, 'la fecha de visita se conserva');
  assert.equal(cita.historial.length, 1);
  assert.ok(!aplicarInicioAceptado({ modelo: 'inicial' }, {}), 'sin propuesta no cambia nada');
  assert.ok(!aplicarInicioAceptado({ modelo: 'permanente' }, { fechaInicioPropuesta: inicio }), 'el permanente no se toca');
});

test('el especialista confirma la visita', () => {
  assert.equal(evaluarPolitica('PUT', '/api/inicial/citas/1/visita', new URLSearchParams(), 'especialista'), 'allow');
  assert.equal(evaluarPolitica('PUT', '/api/inicial/citas/1/visita', new URLSearchParams(), 'aspirante'), 'forbidden');
});
