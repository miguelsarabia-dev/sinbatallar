import test from 'node:test';
import assert from 'node:assert/strict';
import { permisoCambioZona, datosIncorporacion, estadoIncorporacion, DATOS_REQUERIDOS } from '../lib/datos-incorporacion.js';
import { CAMPOS_PROPIOS, CAMPOS_INCORPORADOR, CAMPOS_ADMIN } from '../lib/campos-contratista.js';

const completo = { nombre: 'A', email: 'a@a.com', telefono: '5511111111', curp: 'X'.repeat(18), direccion: 'Calle 1', especialidad: 'Plomería' };

test('la zona la asignan solo el admin y el incorporador dueño', () => {
  assert.deepEqual(permisoCambioZona('admin', 'z1'), { ok: true });
  assert.deepEqual(permisoCambioZona('incorporador', 'z1'), { ok: true });
  assert.deepEqual(permisoCambioZona('incorporador', null), { ok: true }); // quitar la zona
  const self = permisoCambioZona('self', 'z1');
  assert.equal(self.ok, false);
  assert.equal(self.status, 403);
  assert.equal(self.error, 'La zona la asigna tu incorporador');
  assert.equal(permisoCambioZona(null, 'z1').ok, false);
});

test('si no manda areaId nadie queda bloqueado (el contratista edita el resto de su perfil)', () => {
  for (const relacion of ['admin', 'incorporador', 'self', null]) assert.deepEqual(permisoCambioZona(relacion, undefined), { ok: true });
});

test('areaId no está entre los campos del propio contratista pero sí en los del incorporador y el admin', () => {
  assert.ok(!CAMPOS_PROPIOS.includes('areaId'));
  assert.ok(CAMPOS_INCORPORADOR.includes('areaId'));
  assert.ok(CAMPOS_ADMIN.includes('areaId'));
  // el incorporador puede mandar zona junto con el resto de sus campos
  for (const c of ['curp', 'direccion', 'telefono', 'especialidad', 'notas', 'aprobado', 'estatus']) assert.ok(CAMPOS_INCORPORADOR.includes(c), c);
});

test('la zona es un dato requerido para aprobar y sale en faltantes', () => {
  assert.ok(DATOS_REQUERIDOS.includes('zona'));
  const sinZona = datosIncorporacion(completo);
  assert.deepEqual(sinZona.faltantes, ['zona']);
  assert.ok(!sinZona.presentes.includes('zona'));
  assert.equal(estadoIncorporacion({ ...completo, aprobado: false }), 'pendiente');
});

test('con areaId la incorporación queda completa (cuenta el areaId que llega en la misma petición)', () => {
  const conZona = datosIncorporacion({ ...completo, areaId: '507f1f77bcf86cd799439011' });
  assert.deepEqual(conZona.faltantes, []);
  assert.ok(conZona.presentes.includes('zona'));
  assert.equal(estadoIncorporacion({ ...completo, areaId: '507f1f77bcf86cd799439011' }), 'en_proceso');
  // fusión actual + petición, como hace aplicarReglasAprobacion
  assert.deepEqual(datosIncorporacion({ ...completo, ...{ areaId: '507f1f77bcf86cd799439011' } }).faltantes, []);
  assert.deepEqual(datosIncorporacion({ ...completo, areaId: '507f1f77bcf86cd799439011', ...{ areaId: null } }).faltantes, ['zona']); // la petición la quita
});

test('un contratista ya aprobado queda completado aunque no tenga zona (no se le exige retroactivamente)', () => {
  assert.equal(estadoIncorporacion({ ...completo, aprobado: true }), 'completada');
});
