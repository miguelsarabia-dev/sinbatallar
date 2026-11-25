// lib/periodos.js
// Semanas y meses del cierre del modelo inicial (puro). Fechas como texto 'YYYY-MM-DD' / 'YYYY-MM' en UTC, para que
// el mismo día no cambie de semana según la zona horaria del servidor.

const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;
const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

const aTexto = (d) => d.toISOString().slice(0, 10);

/** ¿Es un día válido 'YYYY-MM-DD'? */
export function esDia(texto) {
  if (typeof texto !== 'string' || !RE_DIA.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && aTexto(d) === texto;
}

export const esMes = (texto) => typeof texto === 'string' && RE_MES.test(texto);

/** Lunes de la semana de una fecha (Date o 'YYYY-MM-DD'), como 'YYYY-MM-DD'. */
export function lunesDe(fecha) {
  const d = typeof fecha === 'string' ? new Date(`${fecha}T00:00:00Z`) : new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const dia = d.getUTCDay(); // 0 domingo … 6 sábado
  d.setUTCDate(d.getUTCDate() - ((dia + 6) % 7));
  return aTexto(d);
}

export const esLunes = (texto) => esDia(texto) && lunesDe(texto) === texto;

/** Mes 'YYYY-MM' al que pertenece una semana (el de su lunes). */
export const mesDeSemana = (lunes) => lunes.slice(0, 7);

/** Rango [inicio, fin) en UTC de un mes 'YYYY-MM'. */
export function rangoMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return { inicio: new Date(Date.UTC(a, m - 1, 1)), fin: new Date(Date.UTC(a, m, 1)) };
}

/** Lunes que caen dentro de un mes 'YYYY-MM' (semanas del mes para sueldos). */
export function lunesDelMes(mes) {
  const { inicio, fin } = rangoMes(mes);
  const d = new Date(inicio);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7)); // primer lunes
  const lista = [];
  while (d < fin) { lista.push(aTexto(d)); d.setUTCDate(d.getUTCDate() + 7); }
  return lista;
}
