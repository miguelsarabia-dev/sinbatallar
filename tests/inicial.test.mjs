// Modelo inicial: roles, permisos de /api/inicial, cuentas de especialistas/aspirantes y ascenso a contratista.
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluarPolitica } from '../lib/policy.js';
import { normalizarRol, esAsociado, modeloDeRol, asociadoIdDe, ROLES_USUARIO } from '../lib/roles.js';
import {
  validarAltaCuenta, relacionConEspecialista, camposEspecialistaPara, relacionConAspirante, camposAspirantePara,
  especialidadesFueraDe, planAscenso, sueldoValido, MAX_ASPIRANTES_POR_SERVICIO
} from '../lib/inicial-cuentas.js';
import { normalizarModelos, MODELOS_DEFAULT } from '../lib/modelos-negocio.js';
import { normalizarDistribucion } from '../lib/financial-config.js';
import { planificarReparacion } from '../lib/reparar-perfiles.js';

const ev = (m, p, rol) => evaluarPolitica(m, p, new URLSearchParams(), rol);

// ── Asociado (antes incorporador) ──
test('incorporador es el nombre anterior de asociado', () => {
  assert.equal(normalizarRol('incorporador'), 'asociado');
  assert.equal(normalizarRol('asociado'), 'asociado');
  assert.equal(normalizarRol('user'), 'cliente');
  assert.equal(normalizarRol('contratista'), 'contratista');
  assert.ok(esAsociado('incorporador') && esAsociado('asociado') && !esAsociado('aperturador'));
  assert.ok(ROLES_USUARIO.includes('incorporador'), 'las cuentas sin migrar siguen siendo válidas');
  assert.ok(ROLES_USUARIO.includes('especialista') && ROLES_USUARIO.includes('aspirante'));
});

test('un token con el rol anterior pasa las reglas del asociado', () => {
  for (const rol of ['incorporador', 'asociado']) {
    assert.equal(ev('GET', '/api/incorporaciones', rol), 'allow');
    assert.equal(ev('POST', '/api/contratistas/reclamar', rol), 'allow');
    assert.equal(ev('GET', '/api/asociados', rol), 'allow');
    assert.equal(ev('GET', '/api/incorporadores', rol), 'allow', 'ruta anterior que usa la app móvil instalada');
    assert.equal(ev('POST', '/api/inicial/especialistas', rol), 'allow');
  }
  assert.equal(ev('POST', '/api/asociados', 'asociado'), 'forbidden');
  assert.equal(ev('POST', '/api/incorporadores', 'asociado'), 'forbidden');
});

test('la app móvil instalada manda incorporadorId: se acepta como asociadoId', () => {
  assert.equal(asociadoIdDe({ incorporadorId: 'a' }), 'a');
  assert.equal(asociadoIdDe({ asociadoId: 'b', incorporadorId: 'a' }), 'b');
  assert.equal(asociadoIdDe(new URLSearchParams('incorporadorId=c')), 'c');
  assert.equal(asociadoIdDe(new URLSearchParams('')), undefined);
});

test('configuración financiera guardada con la clave anterior INCORPORATOR', () => {
  assert.equal(normalizarDistribucion({ INCORPORATOR: 2 }).ASOCIADO, 2);
  assert.equal(normalizarDistribucion({ ASOCIADO: 1, INCORPORATOR: 2 }).ASOCIADO, 1);
});

test('reparar perfiles reconoce asociados con el rol anterior', () => {
  const plan = planificarReparacion({
    usuarios: [{ _id: 'u1', role: 'incorporador' }, { _id: 'u2', role: 'asociado' }],
    perfilesAperturador: [], perfilesAsociado: [{ _id: 'p2', user: 'u2' }], areas: []
  });
  assert.deepEqual(plan.crearAsociado, ['u1']);
});

// ── Modelos y permisos ──
test('cada rol operativo pertenece a un modelo', () => {
  assert.equal(modeloDeRol('especialista'), 'inicial');
  assert.equal(modeloDeRol('aspirante'), 'inicial');
  assert.equal(modeloDeRol('contratista'), 'permanente');
  assert.equal(modeloDeRol('tecnico'), 'permanente');
  assert.equal(modeloDeRol('incorporador'), null);
  assert.equal(modeloDeRol('cliente'), null);
});

test('contratistas y técnicos no entran a las rutas del modelo inicial', () => {
  for (const rol of ['contratista', 'tecnico', 'cliente', 'aperturador', 'ferretero']) {
    assert.equal(ev('GET', '/api/inicial/especialistas', rol), 'forbidden', rol);
    assert.equal(ev('POST', '/api/inicial/especialistas', rol), 'forbidden', rol);
    assert.equal(ev('GET', '/api/inicial/aspirantes', rol), 'forbidden', rol);
    assert.equal(ev('POST', '/api/inicial/aspirantes', rol), 'forbidden', rol);
    assert.equal(ev('GET', '/api/inicial/otra-cosa', rol), 'forbidden', rol);
  }
});

test('quién da de alta a quién en el modelo inicial', () => {
  assert.equal(ev('POST', '/api/inicial/especialistas', 'asociado'), 'allow');
  assert.equal(ev('POST', '/api/inicial/especialistas', 'especialista'), 'forbidden');
  assert.equal(ev('PUT', '/api/inicial/especialistas/1', 'especialista'), 'allow', 'su disponibilidad y datos de pago');
  assert.equal(ev('POST', '/api/inicial/aspirantes', 'especialista'), 'allow');
  assert.equal(ev('POST', '/api/inicial/aspirantes', 'asociado'), 'forbidden');
  assert.equal(ev('POST', '/api/inicial/aspirantes', 'aspirante'), 'forbidden');
  assert.equal(ev('PUT', '/api/inicial/aspirantes/1', 'aspirante'), 'forbidden');
  assert.equal(ev('GET', '/api/inicial/aspirantes/1', 'aspirante'), 'allow');
  assert.equal(ev('POST', '/api/inicial/aspirantes', 'admin'), 'allow');
});

test('ascensos e interruptor de modelos: solo admin', () => {
  for (const rol of ['asociado', 'especialista', 'aspirante', 'contratista']) {
    assert.equal(ev('POST', '/api/admin/ascensos', rol), 'forbidden');
    assert.equal(ev('PUT', '/api/admin/modelos', rol), 'forbidden');
  }
  assert.equal(ev('POST', '/api/admin/ascensos', 'admin'), 'allow');
});

test('el modelo permanente arranca apagado', () => {
  assert.equal(MODELOS_DEFAULT.permanenteActivo, false);
  assert.deepEqual(normalizarModelos(undefined), { permanenteActivo: false });
  assert.deepEqual(normalizarModelos({ permanenteActivo: true }), { permanenteActivo: true });
  assert.deepEqual(normalizarModelos({ permanenteActivo: 'si' }), { permanenteActivo: false });
});

// ── Cuentas ──
test('alta de cuenta: datos obligatorios y contraseña válida', () => {
  const ok = validarAltaCuenta({ nombre: ' Ana ', email: 'ANA@X.MX', telefono: '6141234567', password: 'secreta1' });
  assert.ok(ok.ok);
  assert.deepEqual(ok.datos, { nombre: 'Ana', email: 'ana@x.mx', telefono: '6141234567', password: 'secreta1' });
  assert.equal(validarAltaCuenta({ nombre: 'Ana', email: 'ana@x.mx', telefono: '1' }).ok, false);
  assert.equal(validarAltaCuenta({ nombre: 'Ana', email: 'no-es-email', telefono: '1', password: 'secreta1' }).ok, false);
  assert.equal(validarAltaCuenta({ nombre: 'Ana', email: 'ana@x.mx', telefono: '1', password: '123' }).ok, false);
  assert.equal(validarAltaCuenta({ nombre: { $ne: 1 }, email: 'ana@x.mx', telefono: '1', password: 'secreta1' }).ok, false);
});

test('especialista: cada quien edita solo lo suyo', () => {
  const esp = { user: 'u1', asociado: 'a1' };
  assert.equal(relacionConEspecialista({ role: 'especialista', id: 'u1' }, esp), 'self');
  assert.equal(relacionConEspecialista({ role: 'especialista', id: 'u2' }, esp), null);
  assert.equal(relacionConEspecialista({ role: 'asociado', id: 'x' }, esp, { perfilIdActor: 'a1' }), 'asociado');
  assert.equal(relacionConEspecialista({ role: 'asociado', id: 'x' }, esp, { perfilIdActor: 'a2' }), null, 'asociado ajeno');
  assert.equal(relacionConEspecialista({ role: 'admin', id: 'x' }, esp), 'admin');
  assert.equal(relacionConEspecialista({ role: 'contratista', id: 'u1' }, esp), null);

  assert.ok(!camposEspecialistaPara('self').includes('aprobado'), 'no se aprueba solo');
  assert.ok(!camposEspecialistaPara('self').includes('sueldoSemanal'));
  assert.ok(!camposEspecialistaPara('asociado').includes('sueldoSemanal'), 'el sueldo lo fija el admin');
  assert.ok(camposEspecialistaPara('admin').includes('sueldoSemanal'));
  assert.deepEqual(camposEspecialistaPara(null), []);
});

test('aspirante: solo su especialista o el admin lo editan', () => {
  const asp = { user: 'u9', especialista: 'e1' };
  assert.equal(relacionConAspirante({ role: 'especialista', id: 'x' }, asp, { perfilIdActor: 'e1' }), 'especialista');
  assert.equal(relacionConAspirante({ role: 'especialista', id: 'x' }, asp, { perfilIdActor: 'e2' }), null, 'especialista ajeno');
  assert.equal(relacionConAspirante({ role: 'aspirante', id: 'u9' }, asp), 'self');
  assert.deepEqual(camposAspirantePara('self'), [], 'el aspirante no se edita a sí mismo');
  assert.ok(!camposAspirantePara('especialista').includes('especialista'), 'no se lo pasa a otro especialista');
  assert.ok(camposAspirantePara('admin').includes('especialista'));
});

test('las especialidades del aspirante salen de los servicios de su especialista', () => {
  assert.deepEqual(especialidadesFueraDe(['s1'], ['s1', 's2']), []);
  assert.deepEqual(especialidadesFueraDe(['s1', 's3'], [{ _id: 's1' }]), ['s3']);
});

test('sueldo semanal y máximo de aspirantes por servicio', () => {
  assert.ok(sueldoValido(4500) && sueldoValido(0));
  assert.ok(!sueldoValido(-1) && !sueldoValido('4500') && !sueldoValido(NaN));
  assert.equal(MAX_ASPIRANTES_POR_SERVICIO, 2);
});

// ── Ascenso a contratista ──
const user = { _id: 'u1', nombre: 'Ana', email: 'ana@x.mx', telefono: '6141234567', password: '$2b$hash' };
const especialista = { _id: 'e1', user: 'u1', asociado: 'a1', areasIds: ['z1', 'z2'], servicios: ['s1', 's2'], curp: 'CURP' };

test('ascenso de especialista: misma cuenta, sus zonas, servicios y asociado', () => {
  const fecha = new Date('2026-12-01');
  const r = planAscenso({ rol: 'especialista', perfil: especialista, user, fecha });
  assert.ok(r.ok);
  assert.equal(r.contratista.email, 'ana@x.mx');
  assert.equal(r.contratista.password, '$2b$hash', 'conserva la contraseña');
  assert.deepEqual(r.contratista.areasIds, ['z1', 'z2']);
  assert.equal(r.contratista.areaId, 'z1');
  assert.deepEqual(r.contratista.servicios, ['s1', 's2']);
  assert.equal(r.contratista.asociado, 'a1');
  assert.equal(r.contratista.aprobado, true);
  assert.deepEqual(r.contratista.origen, { rol: 'especialista', perfil: 'e1', user: 'u1', fecha });
});

test('ascenso de aspirante: zonas y asociado de su especialista, servicios que aprendía', () => {
  const aspirante = { _id: 'p1', user: 'u1', especialista: 'e1', especialidades: ['s2'] };
  const r = planAscenso({ rol: 'aspirante', perfil: aspirante, user, especialista });
  assert.ok(r.ok);
  assert.deepEqual(r.contratista.areasIds, ['z1', 'z2']);
  assert.deepEqual(r.contratista.servicios, ['s2']);
  assert.equal(r.contratista.asociado, 'a1');
  assert.equal(r.contratista.origen.rol, 'aspirante');
});

test('ascenso: casos que se rechazan', () => {
  assert.equal(planAscenso({ rol: 'tecnico', perfil: especialista, user }).ok, false);
  assert.equal(planAscenso({ rol: 'especialista', perfil: null, user }).status, 404);
  assert.equal(planAscenso({ rol: 'especialista', perfil: { ...especialista, ascenso: { contratista: 'c1' } }, user }).status, 409);
  assert.equal(planAscenso({ rol: 'especialista', perfil: especialista, user: { ...user, email: undefined } }).ok, false);
  assert.equal(planAscenso({ rol: 'aspirante', perfil: { _id: 'p', especialidades: [] }, user, especialista: null }).ok, false);
});

// ── Migración incorporador -> asociado ──
import { planMigracionAsociado } from '../lib/migrar-asociado.js';

const sinMigrar = {
  perfilesIncorporador: 3, perfilesAsociado: 0, contratistasConCampoAnterior: 10, contratistasConAmbos: 0,
  comisionesConCampoAnterior: 4, configConClaveAnterior: true, usuariosConRolAnterior: 3
};

test('migración en dos partes: datos al publicar la web, roles después de la app móvil', () => {
  const datos = planMigracionAsociado(sinMigrar, ['datos']);
  assert.ok(datos.ok);
  assert.equal(datos.pasos.length, 4);
  assert.ok(datos.pasos.every(p => p.parte === 'datos'), 'la parte datos no toca los roles');
  const roles = planMigracionAsociado(sinMigrar, ['roles']);
  assert.deepEqual(roles.pasos.map(p => p.parte), ['roles']);
  assert.equal(roles.pasos[0].cantidad, 3);
});

test('migración: idempotente y con bloqueos ante datos dudosos', () => {
  const yaMigrada = { perfilesIncorporador: 0, perfilesAsociado: 3, contratistasConCampoAnterior: 0, contratistasConAmbos: 0, comisionesConCampoAnterior: 0, configConClaveAnterior: false, usuariosConRolAnterior: 0 };
  assert.deepEqual(planMigracionAsociado(yaMigrada).pasos, []);
  const ambas = planMigracionAsociado({ ...sinMigrar, perfilesAsociado: 1, perfilesSolapados: 0 });
  assert.ok(ambas.ok, 'asociados nuevos y anteriores sin el mismo usuario: se fusionan');
  assert.match(ambas.pasos[0].accion, /fusionar/);
  assert.equal(planMigracionAsociado({ ...sinMigrar, perfilesAsociado: 1, perfilesSolapados: 1 }).ok, false, 'mismo usuario en ambas');
  assert.equal(planMigracionAsociado({ ...sinMigrar, contratistasConAmbos: 1 }).ok, false);
});
