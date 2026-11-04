import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularDistribucion, normalizarDistribucion, FINANCIAL_CONFIG } from '../lib/financial-config.js';

const suma = (d) => d.plataforma.monto + d.aperturador.monto + d.incorporador.monto + d.tecnico.monto + d.contratista.montoManoDeObra;

test('sin intermediarios: 80% contratista, 20% plataforma, materiales al contratista', () => {
  const d = calcularDistribucion({ manoDeObra: 1000, costoMateriales: 500 });
  assert.equal(d.plataforma.monto, 200);
  assert.equal(d.contratista.montoManoDeObra, 800);
  assert.equal(d.contratista.montoMateriales, 500);
  assert.equal(d.contratista.montoTotal, 1300);
});

test('aperturador e incorporador se restan a la plataforma, no al contratista', () => {
  const d = calcularDistribucion({ manoDeObra: 1000, hasOpener: true, hasIncorporator: true });
  assert.equal(d.aperturador.monto, 20);
  assert.equal(d.incorporador.monto, 30);
  assert.equal(d.plataforma.monto, 150);
  assert.equal(d.contratista.montoManoDeObra, 800);
});

test('el técnico se lleva su % de la parte del contratista', () => {
  const d = calcularDistribucion({ manoDeObra: 1000, costoMateriales: 500, porcentajeTecnico: 30 });
  assert.equal(d.tecnico.monto, 240);
  assert.equal(d.contratista.montoManoDeObra, 560);
  assert.equal(d.contratista.montoTotal, 1060);
});

test('el reparto de la mano de obra siempre suma exacto (sin descuadres por redondeo)', () => {
  for (const mo of [1, 7, 99, 333, 1234.5, 10001]) {
    for (const pctTec of [0, 33, 50, 100]) {
      const d = calcularDistribucion({ manoDeObra: mo, hasOpener: true, hasIncorporator: true, porcentajeTecnico: pctTec });
      assert.equal(suma(d), mo, `mo=${mo} tec=${pctTec}`);
    }
  }
});

test('porcentaje del técnico fuera de rango se acota a 0-100', () => {
  assert.equal(calcularDistribucion({ manoDeObra: 100, porcentajeTecnico: 500 }).tecnico.porcentaje, 100);
  assert.equal(calcularDistribucion({ manoDeObra: 100, porcentajeTecnico: -5 }).tecnico.porcentaje, 0);
});

test('configuración: contratista + plataforma deben sumar 100 y los intermediarios caber en la plataforma', () => {
  assert.deepEqual(normalizarDistribucion({}), FINANCIAL_CONFIG.DISTRIBUTION);
  assert.throws(() => normalizarDistribucion({ PLATFORM_BASE: 30, CONTRACTOR: 80 }));
  assert.throws(() => normalizarDistribucion({ OPENER: 15, INCORPORATOR: 10 }));
});
