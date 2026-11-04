// lib/stock.js
// Reglas puras del stock de materiales (sin base de datos, para poder probarlas).
// stock: entero >= 0 = se controla; null = sin control (no se valida ni se descuenta).

/**
 * Interpreta el campo `stock` de un body.
 * @returns {{ok:true, definido:boolean, valor:number|null} | {ok:false, error:string}}
 *   definido=false si el campo no vino (no se toca el valor actual).
 */
export function parseStock(valor) {
  if (valor === undefined) return { ok: true, definido: false, valor: undefined };
  if (valor === null || valor === '') return { ok: true, definido: true, valor: null };
  const n = typeof valor === 'number' ? valor : (typeof valor === 'string' && /^\s*\d+\s*$/.test(valor) ? Number(valor) : NaN);
  if (!Number.isInteger(n) || n < 0) {
    return { ok: false, error: 'stock debe ser un entero mayor o igual a 0 (o vacío para no controlar el stock)' };
  }
  return { ok: true, definido: true, valor: n };
}

/** Nombres de los materiales con stock controlado que no alcanza para la cantidad pedida. */
export function itemsSinStock(materialesPorId, items) {
  const faltan = [];
  for (const it of items) {
    const m = materialesPorId[String(it.materialId || it.material)];
    if (m && typeof m.stock === 'number' && Number(it.cantidad) > m.stock) faltan.push(m.nombre);
  }
  return faltan;
}

export const totalDeItems = (items) =>
  Math.round(items.reduce((t, i) => t + (Number(i.precio) || 0) * (Number(i.cantidad) || 0), 0) * 100) / 100;

/** Stock resultante al confirmar (descuenta) o cancelar una confirmada (repone). null = sin control. */
export function stockTrasConfirmar(stock, cantidad) {
  if (typeof stock !== 'number') return { ok: true, stock: stock ?? null };
  return stock >= cantidad ? { ok: true, stock: stock - cantidad } : { ok: false, stock };
}
export const stockTrasReponer = (stock, cantidad) => (typeof stock === 'number' ? stock + cantidad : stock ?? null);
