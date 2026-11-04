import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStock, itemsSinStock, totalDeItems, stockTrasConfirmar, stockTrasReponer } from '../lib/stock.js';

test('parseStock: entero >= 0 se controla, vacío/null = sin control, ausente = no cambia', () => {
  assert.deepEqual(parseStock(undefined), { ok: true, definido: false, valor: undefined });
  assert.deepEqual(parseStock(5), { ok: true, definido: true, valor: 5 });
  assert.deepEqual(parseStock('12'), { ok: true, definido: true, valor: 12 });
  assert.deepEqual(parseStock(0), { ok: true, definido: true, valor: 0 });
  assert.deepEqual(parseStock(null), { ok: true, definido: true, valor: null });
  assert.deepEqual(parseStock(''), { ok: true, definido: true, valor: null });
});

test('parseStock rechaza negativos, decimales, texto y objetos', () => {
  for (const malo of [-1, 2.5, 'abc', '1.5', '-3', {}, [], true, NaN, Infinity]) {
    assert.equal(parseStock(malo).ok, false, String(malo));
  }
});

test('flujo de stock: 5 -> pedir 3 -> confirmar deja 2 -> cancelar la confirmada repone a 5', () => {
  let stock = 5;
  const materiales = { m1: { nombre: 'Tubo', stock } };
  assert.deepEqual(itemsSinStock(materiales, [{ materialId: 'm1', cantidad: 3 }]), []);

  const confirmada = stockTrasConfirmar(stock, 3);
  assert.deepEqual(confirmada, { ok: true, stock: 2 });
  stock = confirmada.stock;

  // pedir más de lo que queda => sin stock
  assert.deepEqual(itemsSinStock({ m1: { nombre: 'Tubo', stock } }, [{ materialId: 'm1', cantidad: 3 }]), ['Tubo']);
  assert.equal(stockTrasConfirmar(stock, 3).ok, false);

  assert.equal(stockTrasReponer(stock, 3), 5);
});

test('materiales sin control de stock (null) no se validan ni se descuentan', () => {
  assert.deepEqual(itemsSinStock({ m1: { nombre: 'Clavo', stock: null } }, [{ materialId: 'm1', cantidad: 999 }]), []);
  assert.deepEqual(stockTrasConfirmar(null, 10), { ok: true, stock: null });
  assert.equal(stockTrasReponer(null, 10), null);
});

test('totalDeItems redondea a centavos', () => {
  assert.equal(totalDeItems([{ precio: 10.5, cantidad: 3 }, { precio: 0.1, cantidad: 3 }]), 31.8);
});
