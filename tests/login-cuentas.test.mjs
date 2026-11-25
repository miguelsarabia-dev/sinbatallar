import test from 'node:test';
import assert from 'node:assert/strict';
import { detectarCuenta, resolverCuentaLogin } from '../lib/login-cuentas.js';
import { evaluarPolitica } from '../lib/policy.js';

const ev = (m, p, rol) => evaluarPolitica(m, p, new URLSearchParams(), rol);

test('detecta la cuenta solo cuando no viene userType (la app instalada lo sigue mandando)', () => {
  assert.equal(detectarCuenta(undefined), true);
  assert.equal(detectarCuenta(''), true);
  assert.equal(detectarCuenta('auto'), true);
  assert.equal(detectarCuenta('contratista'), false);
  assert.equal(detectarCuenta('usuario'), false);
});

test('se queda con la cuenta cuya contraseña coincide', () => {
  assert.equal(resolverCuentaLogin({ usuarioValida: false, contratistaValida: false }), null);
  assert.deepEqual(resolverCuentaLogin({ usuarioValida: true, contratistaValida: false }), { cuenta: 'usuario' });
  assert.deepEqual(resolverCuentaLogin({ usuarioValida: false, contratistaValida: true }), { cuenta: 'contratista' });
});

test('con dos cuentas y la misma contraseña: ascendido entra como contratista; si no, elige', () => {
  assert.deepEqual(resolverCuentaLogin({ usuarioValida: true, contratistaValida: true, usuarioAscendido: true }), { cuenta: 'contratista' });
  assert.deepEqual(resolverCuentaLogin({ usuarioValida: true, contratistaValida: true }), { elegir: ['usuario', 'contratista'] });
  assert.deepEqual(resolverCuentaLogin({ usuarioValida: true, contratistaValida: true, elegida: 'usuario' }), { cuenta: 'usuario' });
  assert.deepEqual(resolverCuentaLogin({ usuarioValida: true, contratistaValida: true, elegida: 'admin' }), { elegir: ['usuario', 'contratista'] });
  // elegir no sirve para entrar a una cuenta cuya contraseña no coincide
  assert.deepEqual(resolverCuentaLogin({ usuarioValida: true, contratistaValida: false, elegida: 'contratista' }), { cuenta: 'usuario' });
});

test('solo los clientes se registran solos', () => {
  assert.equal(ev('POST', '/api/users', null), 'public');
  for (const ruta of ['/api/contratistas', '/api/contratistas/solicitud', '/api/ferreteros', '/api/ferreteros/solicitud']) {
    assert.notEqual(ev('POST', ruta, null), 'public', ruta);
    assert.equal(ev('POST', ruta, 'cliente'), 'forbidden', ruta);
    assert.equal(ev('POST', ruta, 'admin'), 'allow', ruta);
  }
  assert.equal(ev('POST', '/api/contratistas', 'asociado'), 'allow');
  assert.equal(ev('POST', '/api/ferreteros', 'asociado'), 'forbidden');
});
