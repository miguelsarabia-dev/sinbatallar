import test from 'node:test';
import assert from 'node:assert/strict';
import { zonasDeBody, zonasDe, MAX_ZONAS } from '../lib/zonas-puras.js';
import { permisoCambioZona, datosIncorporacion } from '../lib/datos-incorporacion.js';
import { errorCuentaEmpresa, cuentaDesdeEnv } from '../lib/cuenta-empresa-datos.js';

test('zonasDeBody acepta lista, areaId heredado o nada', () => {
  assert.deepEqual(zonasDeBody({ areasIds: ['a', 'b'] }), ['a', 'b']);
  assert.deepEqual(zonasDeBody({ areaId: 'a' }), ['a']);
  assert.deepEqual(zonasDeBody({ areaId: null }), []);
  assert.equal(zonasDeBody({ nombre: 'x' }), undefined);
  assert.equal(MAX_ZONAS, 5);
});

test('zonasDe lee areasIds y cae a areaId en cuentas antiguas', () => {
  assert.deepEqual(zonasDe({ areasIds: ['a', 'b'], areaId: 'a' }), ['a', 'b']);
  assert.deepEqual(zonasDe({ areaId: 'z' }), ['z']);
  assert.deepEqual(zonasDe({}), []);
});

test('solo admin/incorporador cambian zonas; el contratista recibe 403', () => {
  assert.equal(permisoCambioZona('incorporador', ['a']).ok, true);
  assert.equal(permisoCambioZona('admin', []).ok, true);
  assert.equal(permisoCambioZona('self', ['a']).status, 403);
  assert.equal(permisoCambioZona('self', undefined).ok, true);
});

test('la zona requerida se cumple con areasIds y una lista vacía cuenta como faltante', () => {
  const base = { nombre: 'n', email: 'e', telefono: 't', curp: 'c', direccion: 'd', especialidad: 'x' };
  assert.ok(datosIncorporacion({ ...base, areasIds: ['a'] }).presentes.includes('zona'));
  assert.ok(datosIncorporacion({ ...base, areasIds: [] }).faltantes.includes('zona'));
  assert.ok(datosIncorporacion({ ...base, areaId: 'a' }).presentes.includes('zona'));
});

test('cuenta de la empresa: CLABE de 18 dígitos y datos obligatorios', () => {
  const ok = { banco: 'BBVA', numeroCuenta: '123', clabe: '012345678901234567', nombreTitular: 'Sin Batallar' };
  assert.equal(errorCuentaEmpresa(ok), null);
  assert.ok(errorCuentaEmpresa({ ...ok, clabe: '123' }));
  assert.ok(errorCuentaEmpresa({ ...ok, banco: ' ' }));
  assert.ok(errorCuentaEmpresa({ ...ok, numeroCuenta: 'abc' }));
  assert.equal(cuentaDesdeEnv({ EMPRESA_CLABE: '1' }).clabe, '1');
});

import { pendienteDeLiquidar } from '../lib/liquidacion.js';
test('pendiente de liquidar: técnico terminó y el cliente no ha declarado el saldo / confirmado', () => {
  const cita = { estado: 'completada', tecnicoMarcoCompletado: true, pagado: false, clienteConfirmo: false };
  assert.equal(pendienteDeLiquidar(cita, { modalidadPago: 'anticipo', saldo: {} }), true);
  assert.equal(pendienteDeLiquidar(cita, { modalidadPago: 'anticipo', saldo: { declarado: true } }), false);
  assert.equal(pendienteDeLiquidar(cita, { modalidadPago: 'total', pagoUnico: { verificado: true } }), true);
  assert.equal(pendienteDeLiquidar({ ...cita, clienteConfirmo: true }, { modalidadPago: 'total' }), false);
  assert.equal(pendienteDeLiquidar({ ...cita, pagado: true }, { modalidadPago: 'anticipo', saldo: {} }), false);
  assert.equal(pendienteDeLiquidar({ ...cita, tecnicoMarcoCompletado: false }, { modalidadPago: 'anticipo', saldo: {} }), false);
  assert.equal(pendienteDeLiquidar(cita, null), false);
});

import { permisoCambioServicios, DATOS_REQUERIDOS } from '../lib/datos-incorporacion.js';
import { CAMPOS_PROPIOS, CAMPOS_INCORPORADOR, CAMPOS_ADMIN } from '../lib/campos-contratista.js';
test('los servicios los asigna el incorporador/admin, no el contratista', () => {
  assert.equal(permisoCambioServicios('self', ['x']).status, 403);
  assert.equal(permisoCambioServicios('self', undefined).ok, true);
  assert.equal(permisoCambioServicios('incorporador', ['x']).ok, true);
  assert.ok(!CAMPOS_PROPIOS.includes('servicios') && !CAMPOS_PROPIOS.includes('especialidad'));
  assert.ok(CAMPOS_INCORPORADOR.includes('servicios') && CAMPOS_ADMIN.includes('servicios'));
  assert.ok(DATOS_REQUERIDOS.includes('servicios'));
});

import { ferreteriaPublica, materialPublico } from '../lib/ferreterias-publico.js';
test('ferretería pública: sin correo, ids de usuario ni campos internos', () => {
  const f = ferreteriaPublica(
    { _id: 'f1', nombreNegocio: 'Ferre', telefono: '555', direccion: 'Calle', horario: '9-6', ubicacion: { type: 'Point', coordinates: [1, 2] }, pendienteAprobacion: false, createdAt: 'x', __v: 0 },
    { _id: 'u1', nombre: 'Dueño', email: 'a@b.c', telefono: '555', fotoUrl: 'z' }
  );
  const txt = JSON.stringify(f);
  assert.ok(!/a@b\.c|u1|fotoUrl|pendienteAprobacion|createdAt/.test(txt), txt);
  assert.equal(f.nombreNegocio, 'Ferre');
  const m = materialPublico({ _id: 'm1', nombre: 'Tubo', categoria: 'c', unidad: 'pieza', precio: 10, ferretero: 'u1', imagenPublicId: 'p', stock: undefined });
  assert.ok(!('ferretero' in m) && !('imagenPublicId' in m));
  assert.equal(m.stock, null);
});
