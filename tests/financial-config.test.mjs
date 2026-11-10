import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularDistribucion, normalizarDistribucion, FINANCIAL_CONFIG } from '../lib/financial-config.js';

const suma = (d) => d.plataforma.monto + d.aperturador.monto + d.incorporador.monto + d.tecnico.monto + d.contratista.montoManoDeObra;

test('reparto vigente sin técnico ni intermediarios: contratista conserva 85, plataforma 15, materiales 100%', () => {
  const d = calcularDistribucion({ manoDeObra: 1000, costoMateriales: 500 });
  assert.equal(d.plataforma.monto, 150);
  assert.equal(d.contratista.montoManoDeObra, 850);
  assert.equal(d.contratista.montoMateriales, 500);
  assert.equal(d.contratista.montoTotal, 1350);
});

test('con técnico y aperturador: contratista 80 / técnico 5 / aperturador 3 / Sin Batallar 12 (6 propios + 6 sin asignar)', () => {
  const c = FINANCIAL_CONFIG.DISTRIBUTION;
  const d = calcularDistribucion({ manoDeObra: 1000, costoMateriales: 500, hasOpener: true, hasIncorporator: true, porcentajeTecnico: c.TECHNICIAN });
  assert.equal(d.contratista.montoManoDeObra, 800);
  assert.equal(d.tecnico.monto, 50);
  assert.equal(d.aperturador.monto, 30);
  assert.equal(d.incorporador.monto, 0);
  assert.equal(d.plataforma.monto, 120);
  assert.equal(d.contratista.montoTotal, 1300);
});

test('aperturador e incorporador se restan a la plataforma, no al contratista', () => {
  const config = { ...FINANCIAL_CONFIG.DISTRIBUTION, INCORPORATOR: 3 };
  const d = calcularDistribucion({ manoDeObra: 1000, hasOpener: true, hasIncorporator: true, config });
  assert.equal(d.aperturador.monto, 30);
  assert.equal(d.incorporador.monto, 30);
  assert.equal(d.plataforma.monto, 90);
  assert.equal(d.contratista.montoManoDeObra, 850);
});

test('el reparto de la mano de obra siempre suma exacto (sin descuadres por redondeo)', () => {
  for (const mo of [1, 7, 99, 333, 1234.5, 10001]) {
    for (const pctTec of [0, 5, 100]) {
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
  assert.throws(() => normalizarDistribucion({ PLATFORM_BASE: 30, CONTRACTOR: 85 }));
  assert.throws(() => normalizarDistribucion({ OPENER: 15, INCORPORATOR: 10 }));
  assert.throws(() => normalizarDistribucion({ TECHNICIAN: 90 }));
});
