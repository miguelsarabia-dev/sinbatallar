import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES_ALTA_ADMIN, validarAltaAdmin } from '../lib/admin-cuentas.js';
import { ROLES_USUARIO } from '../lib/roles.js';

const base = { nombre: 'Ana', email: 'Ana@Test.com', telefono: '6141234567', password: 'Clave-segura-1' };
const ID = '0123456789abcdef01234567';

test('el admin puede crear todos los roles vigentes más contratista', () => {
  const roles = ROLES_ALTA_ADMIN.map(r => r.rol).sort();
  const esperados = [...ROLES_USUARIO.filter(r => r !== 'incorporador'), 'contratista'].sort();
  assert.deepEqual(roles, esperados);
});

test('valida datos básicos y normaliza el email', () => {
  const r = validarAltaAdmin({ ...base, rol: 'cliente' });
  assert.equal(r.ok, true);
  assert.equal(r.datos.email, 'ana@test.com');
  assert.equal(r.relacion, null);
  assert.equal(validarAltaAdmin({ ...base, rol: 'superusuario' }).ok, false);
  assert.equal(validarAltaAdmin({ ...base, rol: 'cliente', telefono: '123' }).ok, false);
  assert.equal(validarAltaAdmin({ ...base, rol: 'cliente', password: '1' }).ok, false);
});

test('técnico y aspirante exigen su contratista/especialista; contratista y especialista lo tienen opcional', () => {
  assert.equal(validarAltaAdmin({ ...base, rol: 'tecnico' }).ok, false);
  assert.deepEqual(validarAltaAdmin({ ...base, rol: 'tecnico', contratistaId: ID }).relacion, { campo: 'contratistaId', id: ID });
  assert.equal(validarAltaAdmin({ ...base, rol: 'aspirante' }).ok, false);
  assert.equal(validarAltaAdmin({ ...base, rol: 'aspirante', especialistaId: { $ne: null } }).ok, false);
  assert.equal(validarAltaAdmin({ ...base, rol: 'especialista' }).relacion, null);
  assert.deepEqual(validarAltaAdmin({ ...base, rol: 'contratista', asociadoId: ID }).relacion, { campo: 'asociadoId', id: ID });
  assert.equal(validarAltaAdmin({ ...base, rol: 'contratista', asociadoId: 'x' }).ok, false);
});

test('ferretería: nombre del negocio o, si falta, el nombre de la persona', () => {
  assert.equal(validarAltaAdmin({ ...base, rol: 'ferretero', nombreNegocio: ' El Tornillo ' }).nombreNegocio, 'El Tornillo');
  assert.equal(validarAltaAdmin({ ...base, rol: 'ferretero' }).nombreNegocio, 'Ana');
});
