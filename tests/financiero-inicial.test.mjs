// Modelo financiero inicial: debe coincidir con Sin_Batallar_OFICIAL_01_Modelo_Inicial_2026.xlsx (hoja PRUEBAS_CODIGO).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCIERO_INICIAL, VERSION_FINANCIERO_INICIAL, normalizarConfigInicial, distribuirServicioInicial,
  sueldoMensual, pagoAperturador, cierreMensualInicial, escenarioInicial
} from '../lib/financiero-inicial.js';
import { factorInflacion, moReferencia, moPromedioPonderada, ESPECIALIDADES_REFERENCIA, especialidadPorNombre } from '../lib/precios-referencia.js';

const cerca = (a, b, tol = 0.01, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} esperado ${b}, salió ${a}`);
const sumaMontos = (d) => d.operacionSB.monto + d.operacionAsociado.monto + d.especialista.monto + d.aspirantes.monto + d.aperturador.monto + d.remanente.monto;

test('versión maestra registrada', () => {
  assert.equal(VERSION_FINANCIERO_INICIAL, 'SB-FIN-INI-2026-11-09');
});

// ── PRUEBAS_CODIGO fila 2: servicio de $1,000 de MO ──
test('servicio de $1,000 MO con 2 aspirantes', () => {
  const d = distribuirServicioInicial({ manoDeObra: 1000, aspirantes: 2 });
  assert.equal(d.operacionSB.monto, 150);
  assert.equal(d.operacionAsociado.monto, 100);
  assert.equal(d.especialista.monto, 120);
  assert.equal(d.aspirantes.monto, 120);
  assert.equal(d.aspirantes.porAspirante.monto, 60);
  assert.equal(d.aspirantes.porAspirante.porcentaje, 6);
  assert.equal(d.aperturador.monto, 30);
  assert.equal(d.remanente.monto, 480);
  assert.equal(sumaMontos(d), 1000);
});

test('un aspirante se lleva el 12% completo; sin aspirantes el 12% pasa al remanente', () => {
  const uno = distribuirServicioInicial({ manoDeObra: 1000, aspirantes: 1 });
  assert.equal(uno.aspirantes.porAspirante.monto, 120);
  assert.equal(uno.remanente.monto, 480);
  const ninguno = distribuirServicioInicial({ manoDeObra: 1000, aspirantes: 0 });
  assert.equal(ninguno.aspirantes.monto, 0);
  assert.equal(ninguno.remanente.monto, 600);
  assert.equal(distribuirServicioInicial({ manoDeObra: 1000, aspirantes: 5 }).aspirantes.cantidad, 2, 'máximo 2');
});

test('sin aperturador ni asociado, esas partes pasan al remanente (no se regalan)', () => {
  const d = distribuirServicioInicial({ manoDeObra: 1000, aspirantes: 2, hasAperturador: false, hasAsociado: false });
  assert.equal(d.aperturador.monto, 0);
  assert.equal(d.operacionAsociado.monto, 0);
  assert.equal(d.remanente.monto, 610);
  assert.equal(sumaMontos(d), 1000);
});

test('centavos: la suma siempre cuadra con la MO', () => {
  for (const mo of [0, 0.01, 1, 333.33, 999.99, 1234.57, 4163.67]) {
    for (const n of [0, 1, 2]) {
      const d = distribuirServicioInicial({ manoDeObra: mo, aspirantes: n });
      cerca(sumaMontos(d), d.manoDeObra, 0.001, `mo=${mo} n=${n}`);
      assert.ok(d.remanente.monto >= 0);
    }
  }
});

test('nunca aplica el 80/20 del permanente', () => {
  const d = distribuirServicioInicial({ manoDeObra: 1000, aspirantes: 2 });
  assert.notEqual(d.especialista.monto, 800);
  assert.equal(d.contratista, undefined);
});

// ── Parámetros ──
test('configuración: defaults del Excel y validación', () => {
  const c = normalizarConfigInicial();
  assert.equal(c.OPERACION_SB + c.OPERACION_ASOCIADO + c.ESPECIALISTA + c.ASPIRANTES + c.APERTURADOR, 52);
  assert.equal(c.GARANTIA_APERTURADOR, 20000);
  assert.equal(c.SUELDO_SEMANAL, 4500);
  assert.equal(normalizarConfigInicial({ ESPECIALISTA: 14 }).ESPECIALISTA, 14);
  assert.throws(() => normalizarConfigInicial({ ESPECIALISTA: 70 }), /suma/);
  assert.throws(() => normalizarConfigInicial({ APERTURADOR: -1 }));
  assert.throws(() => normalizarConfigInicial({ APERTURADOR: '3' }));
});

test('editar porcentajes recalcula sin datos fijos en el código', () => {
  const config = normalizarConfigInicial({ ESPECIALISTA: 10, ASPIRANTES: 14 });
  const d = distribuirServicioInicial({ manoDeObra: 1000, aspirantes: 2, config });
  assert.equal(d.especialista.monto, 100);
  assert.equal(d.aspirantes.porAspirante.monto, 70);
});

// ── Aperturador y sueldos ──
test('aperturador: el mayor entre comisión y garantía, nunca ambos', () => {
  assert.deepEqual(pagoAperturador(108053.38, 20000), { comision: 108053.38, garantia: 20000, pago: 108053.38, complementoGarantia: 0 });
  assert.deepEqual(pagoAperturador(5000, 20000), { comision: 5000, garantia: 20000, pago: 20000, complementoGarantia: 15000 });
  assert.equal(pagoAperturador(20000, 20000).pago, 20000);
});

test('sueldo base mensual: 4,500 × 52/12', () => {
  assert.equal(sueldoMensual(4500), 19500);
  assert.equal(sueldoMensual(4500) * 4, 78000, 'bases formación del Excel');
});

// ── Precios de referencia (ESPECIALIDADES_14 y TABLERO) ──
test('factor de inflación y MO de referencia', () => {
  cerca(factorInflacion(), 1.2089642787808192, 1e-12);
  const pintura = moReferencia(especialidadPorNombre('pintura EXTERIOR'));
  cerca(pintura.ticketAjustado, 6939.454960201902, 1e-6);
  cerca(pintura.moEstimada, 4163.672976121141, 1e-6);
  assert.equal(pintura.estado, 'Estimación histórica únicamente');
  const conWeb = moReferencia({ ticket2018: 5740, precioWeb: 5000 });
  cerca(conWeb.mo, 4163.672976121141 * 0.5 + 2500, 1e-6);
  assert.equal(conWeb.estado, 'Ponderado estudio/web');
  assert.equal(ESPECIALIDADES_REFERENCIA.length, 14);
});

test('MO promedio ponderada = TABLERO!B3', () => {
  cerca(moPromedioPonderada(), 3601.7792094937054, 1e-6);
});

// ── ESCENARIOS (filas 2 a 4) ──
const ESPERADO = {
  850: { ventaMO: 3061512.3280696496, personal: 734762.9587367158, aperturador: 91845.36984208948, costosOperacion: 765378.0820174124, sueldosBase: 78000, resultado: 1391525.917473432, asociado: 695762.958736716, sinBatallar: 695762.958736716 },
  1000: { ventaMO: 3601779.2094937055, personal: 864427.0102784893, aperturador: 108053.37628481117, costosOperacion: 900444.8023734264, sueldosBase: 78000, resultado: 1650854.0205569786, asociado: 825427.0102784893, sinBatallar: 825427.0102784893 },
  1150: { ventaMO: 4142046.090917761, personal: 994091.0618202626, aperturador: 124261.38272753282, costosOperacion: 1035511.5227294402, sueldosBase: 78000, resultado: 1910182.1236405252, asociado: 955091.0618202626, sinBatallar: 955091.0618202626 }
};

for (const [servicios, esperado] of Object.entries(ESPERADO)) {
  test(`escenario ${servicios} servicios/mes coincide con ESCENARIOS`, () => {
    const e = escenarioInicial({ servicios: Number(servicios), moPromedio: moPromedioPonderada() });
    for (const [k, v] of Object.entries(esperado)) cerca(e[k], v, 1e-4, k);
  });
}

test('escenario con pocos servicios: aplica la garantía del aperturador', () => {
  const e = escenarioInicial({ servicios: 100, moPromedio: 3601.78 });
  assert.equal(e.aperturador, 20000);
});

// ── Cierre mensual con servicios reales ──
test('cierre mensual con servicios individuales = escenario normal (mezcla de 14 especialidades)', () => {
  // 1000 servicios repartidos según la frecuencia normalizada: no se pierden ni se duplican ingresos
  const total = ESPECIALIDADES_REFERENCIA.reduce((s, e) => s + e.frecuencia, 0);
  const servicios = ESPECIALIDADES_REFERENCIA.map(e => {
    const mo = moReferencia(e).mo * (e.frecuencia / total) * 1000; // MO agregada de la especialidad
    return { ...distribuirServicioInicial({ manoDeObra: mo, aspirantes: 2 }), aperturadorId: 'ap1', asociadoId: 'as1' };
  });
  const c = cierreMensualInicial({ servicios, sueldos: 78000, aperturadores: [{ id: 'ap1' }] });
  const e = ESPERADO[1000];
  cerca(c.ventaMO, e.ventaMO, 0.1, 'ventaMO');
  cerca(c.personal, e.personal, 0.1, 'personal');
  cerca(c.aperturadores, e.aperturador, 0.1, 'aperturador');
  cerca(c.costosOperacion, e.costosOperacion, 0.1, 'costos');
  cerca(c.resultado, e.resultado, 0.5, 'resultado');
  cerca(c.asociado, e.asociado, 0.5, 'asociado');
  cerca(c.asociado + c.sinBatallar, Math.max(0, c.resultado), 0.001);
  assert.equal(c.porAsociado.length, 1);
  cerca(c.porAsociado[0].monto, c.asociado, 0.001);
});

test('cierre: la garantía se paga a cada aperturador que no llegó con su comisión', () => {
  const s = (ap) => ({ ...distribuirServicioInicial({ manoDeObra: 10000, aspirantes: 1 }), aperturadorId: ap, asociadoId: 'as1' });
  const c = cierreMensualInicial({ servicios: [s('ap1'), s('ap2')], sueldos: 0, aperturadores: [{ id: 'ap1' }, { id: 'ap2', garantia: 0 }] });
  const ap1 = c.pagosAperturadores.find(a => a.id === 'ap1');
  const ap2 = c.pagosAperturadores.find(a => a.id === 'ap2');
  assert.equal(ap1.pago, 20000, 'comisión 300 < garantía');
  assert.equal(ap1.complementoGarantia, 19700);
  assert.equal(ap2.pago, 300, 'sin garantía cobra su comisión');
  assert.equal(c.aperturadores, 20300);
});

test('cierre con resultado negativo: no hay reparto', () => {
  const servicios = [{ ...distribuirServicioInicial({ manoDeObra: 1000, aspirantes: 2 }), aperturadorId: 'ap1', asociadoId: 'as1' }];
  const c = cierreMensualInicial({ servicios, sueldos: 78000, aperturadores: [{ id: 'ap1' }] });
  assert.ok(c.resultado < 0);
  assert.equal(c.asociado, 0);
  assert.equal(c.sinBatallar, 0);
});

test('cierre con varios asociados: su mitad se reparte según la MO de sus especialistas', () => {
  const s = (mo, as) => ({ ...distribuirServicioInicial({ manoDeObra: mo, aspirantes: 2 }), asociadoId: as });
  const c = cierreMensualInicial({ servicios: [s(30000, 'a'), s(10000, 'b')], sueldos: 0 });
  const a = c.porAsociado.find(x => x.id === 'a').monto;
  const b = c.porAsociado.find(x => x.id === 'b').monto;
  cerca(a, c.asociado * 0.75, 0.01);
  cerca(b, c.asociado * 0.25, 0.01);
});

// ── Semanas y meses del cierre ──
import { lunesDe, esLunes, lunesDelMes, rangoMes, esMes, mesDeSemana } from '../lib/periodos.js';
import { evaluarPolitica } from '../lib/policy.js';

test('semanas: el lunes define a qué mes pertenece el sueldo', () => {
  assert.equal(lunesDe('2026-11-23'), '2026-11-23'); // lunes
  assert.equal(lunesDe('2026-11-29'), '2026-11-23'); // domingo
  assert.equal(lunesDe(new Date('2026-12-02T15:00:00Z')), '2026-11-30');
  assert.ok(esLunes('2026-11-30') && !esLunes('2026-12-01') && !esLunes('2026-02-30'));
  assert.deepEqual(lunesDelMes('2026-11'), ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
  assert.equal(lunesDelMes('2026-02').length, 4);
  assert.equal(mesDeSemana('2026-11-30'), '2026-11');
  assert.ok(esMes('2026-11') && !esMes('2026-13') && !esMes('2026-1'));
  assert.deepEqual(rangoMes('2026-12'), { inicio: new Date('2026-12-01T00:00:00Z'), fin: new Date('2027-01-01T00:00:00Z') });
});

test('permisos del dinero del modelo inicial', () => {
  const ev = (m, p, r) => evaluarPolitica(m, p, new URLSearchParams(), r);
  assert.equal(ev('GET', '/api/inicial/sueldos', 'especialista'), 'allow', 've sus sueldos');
  assert.equal(ev('POST', '/api/inicial/sueldos', 'especialista'), 'forbidden');
  assert.equal(ev('PATCH', '/api/inicial/sueldos/1', 'especialista'), 'forbidden');
  assert.equal(ev('GET', '/api/inicial/cierre', 'asociado'), 'forbidden');
  assert.equal(ev('GET', '/api/inicial/cierre', 'admin'), 'allow');
  assert.equal(ev('PUT', '/api/admin/configuracion-financiera-inicial', 'especialista'), 'forbidden');
  assert.equal(ev('GET', '/api/inicial/sueldos', 'contratista'), 'forbidden');
});
