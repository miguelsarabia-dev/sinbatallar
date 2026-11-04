import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluarPolitica } from '../lib/policy.js';

const q = (s = '') => new URLSearchParams(s);
const ev = (m, p, rol, query = '') => evaluarPolitica(m, p, q(query), rol);

test('rutas públicas no piden token', () => {
  assert.equal(ev('POST', '/api/auth/login', null), 'public');
  assert.equal(ev('POST', '/api/users', null), 'public');
  assert.equal(ev('GET', '/api/servicios', null), 'public');
  assert.equal(ev('GET', '/api/areas', null, 'activo=true'), 'public');
});

test('el resto exige token (allow sin rol => el middleware responde 401)', () => {
  assert.equal(ev('GET', '/api/areas', null), 'allow');
  assert.equal(ev('GET', '/api/citas', null), 'allow');
  assert.equal(ev('GET', '/api/servicios-por-zona', null), 'allow');
});

test('admin solo para /api/admin y suspender', () => {
  assert.equal(ev('GET', '/api/admin/reportes', 'cliente'), 'forbidden');
  assert.equal(ev('GET', '/api/admin/reportes', 'admin'), 'allow');
  assert.equal(ev('PUT', '/api/users/abc/suspender', 'contratista'), 'forbidden');
  assert.equal(ev('PUT', '/api/users/abc/suspender', 'admin'), 'allow');
});

test('reglas por rol', () => {
  assert.equal(ev('POST', '/api/citas', 'contratista'), 'forbidden');
  assert.equal(ev('POST', '/api/citas', 'cliente'), 'allow');
  assert.equal(ev('POST', '/api/citas/123/tomar', 'cliente'), 'forbidden');
  assert.equal(ev('POST', '/api/citas/123/tomar', 'contratista'), 'allow');
  assert.equal(ev('PATCH', '/api/citas/123/subestado', 'contratista'), 'forbidden');
  assert.equal(ev('PATCH', '/api/citas/123/subestado', 'tecnico'), 'allow');
  assert.equal(ev('GET', '/api/citas/disponibles', 'cliente'), 'forbidden');
  assert.equal(ev('PATCH', '/api/solicitudes-materiales/9', 'contratista'), 'forbidden');
  assert.equal(ev('PATCH', '/api/solicitudes-materiales/9', 'ferretero'), 'allow');
  assert.equal(ev('GET', '/api/incorporaciones', 'cliente'), 'forbidden');
  assert.equal(ev('GET', '/api/areas/demanda', 'aperturador'), 'allow');
  assert.equal(ev('GET', '/api/areas/demanda', 'cliente'), 'forbidden');
});
