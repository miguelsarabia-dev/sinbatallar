import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO_COTIZADOR, ESPECIALIDADES_COTIZADOR } from '../lib/cotizador-catalogo.js';
import {
  catalogoEfectivo, armarDesglose, importeConcepto, normalizarAjustes, especialidadSugerida, desgloseParaCliente
} from '../lib/cotizador.js';

const cat = catalogoEfectivo();
const porId = (id) => cat.find(c => c.id === id);

test('catálogo: 106 conceptos únicos en 14 especialidades, todos con unidad', () => {
  assert.equal(CATALOGO_COTIZADOR.length, 106);
  assert.equal(new Set(CATALOGO_COTIZADOR.map(c => c.id)).size, 106);
  assert.equal(ESPECIALIDADES_COTIZADOR.length, 14);
  assert.ok(CATALOGO_COTIZADOR.every(c => c.unidad && c.concepto && c.especialidad));
});

test('tarifas con la prioridad del Excel: estimado central, si no promedio del rango', () => {
  assert.equal(porId('SB-0001').tarifa, 850);   // Instalación de lavabo: referencia 850–850
  assert.equal(porId('SB-0007').tarifa, 155);   // Línea de agua: estimado central
  assert.equal(porId('SB-0096').tarifa, null);  // Carga de refrigerante: sin precio
  assert.equal(porId('SB-0096').disponible, false);
});

test('importe = MAX(cantidad × tarifa × factor, mínimo)', () => {
  assert.equal(importeConcepto({ cantidad: 40, tarifa: 35, factor: 1 }), 1400);
  assert.equal(importeConcepto({ cantidad: 40, tarifa: 35, factor: 1.15 }), 1610);
  assert.equal(importeConcepto({ cantidad: 1, tarifa: 35, minimo: 500 }), 500);
});

test('desglose de varias especialidades suma la mano de obra', () => {
  const pintura = cat.find(c => c.especialidad === 'Pintura interior' && c.concepto === 'Pintura interior dos manos');
  const banqueta = cat.find(c => c.concepto === 'Reparación de banqueta');
  const r = armarDesglose([
    { conceptoId: pintura.id, cantidad: 40, nota: 'Sala y comedor' },
    { conceptoId: banqueta.id, cantidad: 6, factor: 1.15, justificacion: 'Concreto dañado por raíces' },
  ], cat);
  assert.equal(r.ok, true);
  assert.equal(r.conceptos.length, 2);
  assert.equal(r.conceptos[0].importe, 40 * pintura.tarifa);
  assert.equal(r.conceptos[1].importe, Math.round(6 * banqueta.tarifa * 1.15 * 100) / 100);
  assert.equal(r.manoDeObra, r.conceptos[0].importe + r.conceptos[1].importe);
  assert.equal(r.conceptos[0].nota, 'Sala y comedor');
});

test('la tarifa es fija: se ignora cualquier tarifa o importe que mande quien cotiza', () => {
  const r = armarDesglose([{ conceptoId: 'SB-0001', cantidad: 1, tarifa: 1, importe: 999999 }], cat);
  assert.equal(r.conceptos[0].tarifa, 850);
  assert.equal(r.manoDeObra, 850);
});

test('rechaza desgloses inválidos', () => {
  assert.equal(armarDesglose([], cat).ok, false);
  assert.equal(armarDesglose('x', cat).ok, false);
  assert.equal(armarDesglose([{ conceptoId: 'SB-9999', cantidad: 1 }], cat).ok, false);
  assert.equal(armarDesglose([{ conceptoId: 'SB-0096', cantidad: 1 }], cat).ok, false);           // sin tarifa
  assert.equal(armarDesglose([{ conceptoId: 'SB-0001', cantidad: 0 }], cat).ok, false);
  assert.equal(armarDesglose([{ conceptoId: 'SB-0001', cantidad: 1, factor: 2 }], cat).ok, false);  // factor no permitido
  assert.equal(armarDesglose([{ conceptoId: 'SB-0001', cantidad: 1, factor: 1.15 }], cat).ok, false); // sin justificar
  assert.equal(armarDesglose(Array(31).fill({ conceptoId: 'SB-0001', cantidad: 1 }), cat).ok, false);
});

test('ajustes del admin: tarifa autorizada, mínimo y conceptos desactivados', () => {
  const ajustes = normalizarAjustes({ 'SB-0096': { tarifa: '900', minimo: 500 }, 'SB-0001': { activo: false } });
  const c = catalogoEfectivo(ajustes);
  const refri = c.find(x => x.id === 'SB-0096');
  assert.deepEqual([refri.tarifa, refri.minimo, refri.fuente, refri.disponible], [900, 500, 'autorizada', true]);
  assert.equal(c.find(x => x.id === 'SB-0001').disponible, false);
  assert.equal(armarDesglose([{ conceptoId: 'SB-0096', cantidad: 0.5 }], c).manoDeObra, 500); // aplica el mínimo
  assert.throws(() => normalizarAjustes({ 'SB-9999': { tarifa: 1 } }));
  assert.throws(() => normalizarAjustes({ 'SB-0001': { tarifa: -5 } }));
  assert.deepEqual(normalizarAjustes({ 'SB-0001': { tarifa: '' } }), {});
});

test('especialidad sugerida por categoría o nombre del servicio', () => {
  assert.equal(especialidadSugerida({ categoria: 'Fontaneria' }), 'Fontanería');
  assert.equal(especialidadSugerida({ nombre: 'Electricidad residencial' }), 'Electricidad');
  assert.equal(especialidadSugerida({ nombre: 'Jardinería' }), null);
});

test('vista del cliente: por especialidad, sin tarifa ni factor; materiales con subtotal y total con IVA', () => {
  const v = desgloseParaCliente({
    desgloseManoObra: [
      { especialidad: 'Albañilería menor', concepto: 'Reparación de banqueta', cantidad: 6, unidad: 'm²', tarifa: 130, factor: 1, importe: 780 },
      { especialidad: 'Pintura interior', concepto: 'Pintura interior dos manos', cantidad: 40, unidad: 'm²', tarifa: 35, factor: 1, importe: 1400 },
    ],
    materiales: [{ nombre: 'Pintura vinílica 19 L', descripcion: 'Blanco', cantidad: 2, precioPorUnidad: 950, total: 1900 }],
    manoDeObra: 2180, costoMateriales: 1900, subtotal: 4080, porcentajeIva: 16, iva: 652.8, total: 4732.8
  });
  assert.equal(v.desglosada, true);
  assert.equal(v.manoDeObra.grupos.length, 2);
  assert.equal(v.manoDeObra.grupos[0].importe, 780);
  assert.equal('tarifa' in v.manoDeObra.grupos[0].conceptos[0], false);
  assert.equal('factor' in v.manoDeObra.grupos[0].conceptos[0], false);
  assert.deepEqual([v.materiales.lineas[0].subtotal, v.materiales.lineas[0].total], [1900, 2204]);
  assert.equal(v.total, 4732.8);
});

test('documento HTML: desglose del cliente, escapa texto y no expone tarifas internas', async () => {
  const { documentoCotizacionHtml } = await import('../lib/cotizacion-documento.js');
  const html = documentoCotizacionHtml({
    cotizacion: {
      _id: '0123456789abcdef01234567', descripcionTrabajo: 'Banqueta y pintura',
      desgloseManoObra: [{ especialidad: 'Albañilería menor', concepto: 'Reparación de banqueta', cantidad: 6, unidad: 'm²', tarifa: 130, factor: 1.15, importe: 897, justificacion: 'raíces' }],
      materiales: [{ nombre: '<script>x</script>', cantidad: 2, precioPorUnidad: 950, total: 1900 }],
      manoDeObra: 897, costoMateriales: 1900, subtotal: 2797, porcentajeIva: 16, iva: 447.52, total: 3244.52, anticipo: { monto: 1622.26 }
    },
    servicio: 'Albañilería', cliente: { nombre: 'Ana' }, quienCotiza: { nombre: 'Luis', rol: 'Especialista' }
  });
  assert.match(html, /Reparación de banqueta/);
  assert.match(html, /\$897\.00/);
  assert.match(html, /Folio 01234567/);
  assert.match(html, /\$1,622\.26/);
  assert.doesNotMatch(html, /<script>x/);
  assert.doesNotMatch(html, /raíces|1\.15|\$130/);   // justificación, factor y tarifa son internos
});
