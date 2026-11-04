import test from 'node:test';
import assert from 'node:assert/strict';
import { coincideEspecialidad, normalizar } from '../lib/especialidades.js';
import { esObjectId, idSeguro, escaparRegex, pick } from '../lib/sanitize.js';

test('especialidades: sin acentos ni mayúsculas, y sin especialidades = todas', () => {
  assert.equal(normalizar('  Plomería '), 'plomeria');
  assert.equal(coincideEspecialidad(['PLOMERIA'], { nombre: 'Reparación de fuga', categoria: 'Plomería' }), true);
  assert.equal(coincideEspecialidad(['electricidad'], { nombre: 'Fuga', categoria: 'Plomería' }), false);
  assert.equal(coincideEspecialidad([], { nombre: 'Cualquiera' }), true);
});

test('sanitize: ids, regex y pick', () => {
  assert.equal(esObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(esObjectId({ $ne: null }), false);
  assert.equal(idSeguro('nope'), null);
  assert.equal(escaparRegex('a.b*(c)'), 'a\\.b\\*\\(c\\)');
  assert.deepEqual(pick({ a: 1, role: 'admin', b: 2 }, ['a', 'b']), { a: 1, b: 2 });
});
