import test from 'node:test';
import assert from 'node:assert/strict';
import { planificarReparacion } from '../lib/reparar-perfiles.js';
import { aperturadorCoincide } from '../lib/areas-propiedad.js';
import { validarPoligono } from '../lib/poligono.js';

test('reparación: crea los perfiles que faltan y no duplica los existentes', () => {
  const plan = planificarReparacion({
    usuarios: [
      { _id: 'u1', role: 'aperturador' }, { _id: 'u2', role: 'aperturador' },
      { _id: 'u3', role: 'incorporador' }, { _id: 'u4', role: 'incorporador' }
    ],
    perfilesAperturador: [{ _id: 'p1', user: 'u1' }],
    perfilesIncorporador: [{ _id: 'i4', user: 'u4' }],
    areas: []
  });
  assert.deepEqual(plan.crearAperturador, ['u2']);
  assert.deepEqual(plan.crearIncorporador, ['u3']);
});

test('reparación: es idempotente (con todo creado no hay nada que hacer)', () => {
  const plan = planificarReparacion({
    usuarios: [{ _id: 'u1', role: 'aperturador' }],
    perfilesAperturador: [{ _id: 'p1', user: 'u1' }],
    perfilesIncorporador: [],
    areas: [{ _id: 'a1', aperturador: 'p1' }]
  });
  assert.deepEqual(plan, { crearAperturador: [], crearIncorporador: [], reasignarAreas: [], huerfanas: [] });
});

test('reparación: zonas con id de usuario se reasignan al perfil (existente o por crear); otras se reportan', () => {
  const plan = planificarReparacion({
    usuarios: [{ _id: 'u1', role: 'aperturador' }, { _id: 'u2', role: 'aperturador' }],
    perfilesAperturador: [{ _id: 'p1', user: 'u1' }],
    perfilesIncorporador: [],
    areas: [
      { _id: 'a1', aperturador: 'u1' },   // usuario con perfil -> p1
      { _id: 'a2', aperturador: 'u2' },   // usuario sin perfil -> (se creará)
      { _id: 'a3', aperturador: 'p1' },   // ya es id de perfil: no se toca
      { _id: 'a4', aperturador: 'zzz' }   // desconocido: se reporta
    ]
  });
  assert.deepEqual(plan.reasignarAreas, [
    { areaId: 'a1', deUserId: 'u1', aPerfilId: 'p1' },
    { areaId: 'a2', deUserId: 'u2', aPerfilId: null }
  ]);
  assert.deepEqual(plan.huerfanas, ['a4']);
});

test('puedeEditarArea: reconoce el id del perfil y el id del usuario (zonas antiguas)', () => {
  assert.equal(aperturadorCoincide('perfil1', 'perfil1', 'user1'), true);
  assert.equal(aperturadorCoincide('user1', 'perfil1', 'user1'), true);
  assert.equal(aperturadorCoincide({ _id: 'perfil1' }, 'perfil1', 'user1'), true);
  assert.equal(aperturadorCoincide('otro', 'perfil1', 'user1'), false);
  assert.equal(aperturadorCoincide(null, 'perfil1', 'user1'), false);
  assert.equal(aperturadorCoincide('perfil1', null, undefined), false);
});

const cuadro = [[-99.1, 19.4], [-99.0, 19.4], [-99.0, 19.5], [-99.1, 19.5], [-99.1, 19.4]];

test('polígono válido: 4 puntos distintos con el anillo cerrado (5 coordenadas)', () => {
  assert.equal(validarPoligono({ type: 'Polygon', coordinates: [cuadro] }), null);
});

test('polígono inválido: menos de 4 puntos distintos, abierto, mal tipo o fuera de rango', () => {
  const triangulo = [[-99.1, 19.4], [-99.0, 19.4], [-99.0, 19.5], [-99.1, 19.4]];
  const abierto = cuadro.slice(0, 4);
  const repetidos = [[-99.1, 19.4], [-99.1, 19.4], [-99.0, 19.5], [-99.0, 19.5], [-99.1, 19.4]];
  for (const [nombre, poly] of Object.entries({
    triangulo: { type: 'Polygon', coordinates: [triangulo] },
    abierto: { type: 'Polygon', coordinates: [abierto] },
    repetidos: { type: 'Polygon', coordinates: [repetidos] },
    punto: { type: 'Point', coordinates: [-99, 19] },
    sinCoordenadas: { type: 'Polygon' },
    vacio: { type: 'Polygon', coordinates: [] },
    texto: { type: 'Polygon', coordinates: [[['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['a', 'b']]] },
    fueraDeRango: { type: 'Polygon', coordinates: [[[-99.1, 95], [-99.0, 19.4], [-99.0, 19.5], [-99.1, 19.5], [-99.1, 95]]] },
    nulo: null
  })) {
    assert.notEqual(validarPoligono(poly), null, nombre);
  }
});
