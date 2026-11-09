import test from 'node:test';
import assert from 'node:assert/strict';
import { errorPasswordAlta, passwordEsDatoPersonal, PASSWORD_MIN } from '../lib/password-alta.js';

test('la contraseña de alta es obligatoria y de al menos 6 caracteres', () => {
  assert.equal(errorPasswordAlta(undefined), 'La contraseña es obligatoria');
  assert.equal(errorPasswordAlta(''), 'La contraseña es obligatoria');
  assert.match(errorPasswordAlta('12345'), new RegExp(String(PASSWORD_MIN)));
  assert.equal(errorPasswordAlta('abc123'), null);
  assert.equal(errorPasswordAlta(123456), 'Contraseña inválida');
});

test('no se aceptan contraseñas que bcrypt truncaría (más de 72 bytes)', () => {
  assert.match(errorPasswordAlta('a'.repeat(73)), /demasiado larga/);
  assert.equal(errorPasswordAlta('a'.repeat(72)), null);
  assert.match(errorPasswordAlta('ñ'.repeat(40)), /demasiado larga/); // 80 bytes
});

test('la contraseña no puede ser el CURP, el teléfono ni el correo', () => {
  const cuenta = { curp: 'AAAA800101HCHRRR09', telefono: '5512345678', email: 'x@y.mx' };
  assert.equal(passwordEsDatoPersonal('AAAA800101HCHRRR09', cuenta), true);
  assert.equal(passwordEsDatoPersonal('aaaa800101hchrrr09', cuenta), true); // sin distinguir mayúsculas
  assert.equal(passwordEsDatoPersonal('5512345678', cuenta), true);
  assert.equal(passwordEsDatoPersonal('x@y.mx', cuenta), true);
  assert.equal(passwordEsDatoPersonal('Otra-clave-1', cuenta), false);
  assert.equal(passwordEsDatoPersonal('cualquiera', {}), false);
});
