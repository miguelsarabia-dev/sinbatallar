// lib/cotizador.js
// Cotizador por especialidad (puro, sin BD): desglosa la MANO DE OBRA de una cotización en conceptos del catálogo
// homologado (lib/cotizador-catalogo.js). Lo usan el especialista (modelo inicial) y el contratista / técnico
// (permanente) con el botón "Desglosar".
//
//   importe del concepto = MAX(cantidad × tarifa × factor, mínimo)          (fórmula del Excel de cotizadores)
//   mano de obra         = suma de los importes                              (sin IVA; el reparto sigue igual)
//
// La tarifa es FIJA: la del catálogo, o la que el admin autorizó (Configuracion 'cotizador'). Quien cotiza solo
// captura cantidad, factor de dificultad (con justificación) y medidas. El servidor recalcula todo: nunca confía en
// importes que mande el cliente. Los materiales siguen aparte, a su precio, y se reembolsan 100%.
import { CATALOGO_COTIZADOR, ESPECIALIDADES_COTIZADOR, VERSION_CATALOGO } from './cotizador-catalogo.js';

export { ESPECIALIDADES_COTIZADOR, VERSION_CATALOGO };

/** Factores de dificultad permitidos (1.15 = 15% adicional). Más de 1 exige justificación. */
export const FACTORES_DIFICULTAD = Object.freeze([1, 1.15, 1.3, 1.5]);
export const MAX_CONCEPTOS = 30;
const MAX_CANTIDAD = 100000;
const MAX_TEXTO = 200;

const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;
const texto = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_TEXTO) : '');
const positivo = (v) => (typeof v === 'number' || typeof v === 'string') && Number.isFinite(Number(v)) && Number(v) > 0;

/**
 * Normaliza los ajustes del admin { [id]: { tarifa?, minimo?, activo? } } (lanza Error si algo es inválido).
 * tarifa null/'' borra el ajuste y regresa a la del catálogo.
 */
export function normalizarAjustes(ajustes = {}) {
  if (!ajustes || typeof ajustes !== 'object' || Array.isArray(ajustes)) throw new Error('Ajustes inválidos');
  const ids = new Set(CATALOGO_COTIZADOR.map(c => c.id));
  const salida = {};
  for (const [id, a] of Object.entries(ajustes)) {
    if (!ids.has(id)) throw new Error(`Concepto desconocido: ${id}`);
    if (!a || typeof a !== 'object') continue;
    const r = {};
    if (a.tarifa !== undefined && a.tarifa !== null && a.tarifa !== '') {
      if (!positivo(a.tarifa) || Number(a.tarifa) > 1_000_000) throw new Error(`Tarifa inválida en ${id}`);
      r.tarifa = redondear(a.tarifa);
    }
    if (a.minimo !== undefined && a.minimo !== null && a.minimo !== '') {
      const m = Number(a.minimo);
      if (!Number.isFinite(m) || m < 0 || m > 1_000_000) throw new Error(`Mínimo inválido en ${id}`);
      if (m > 0) r.minimo = redondear(m);
    }
    if (a.activo === false) r.activo = false;
    if (Object.keys(r).length) salida[id] = r;
  }
  return salida;
}

/**
 * Catálogo con los ajustes del admin aplicados. Cada concepto: { id, especialidad, grupo, concepto, unidad,
 * tarifa (null = sin precio), minimo, fuente ('autorizada' si la fijó el admin), disponible }.
 */
export function catalogoEfectivo(ajustes = {}) {
  return CATALOGO_COTIZADOR.map(c => {
    const a = ajustes[c.id] || {};
    const tarifa = a.tarifa ?? c.tarifa;
    return {
      ...c,
      tarifa: tarifa ?? null,
      minimo: a.minimo || 0,
      fuente: a.tarifa ? 'autorizada' : c.fuente,
      disponible: a.activo !== false && !!tarifa
    };
  });
}

/** Importe de un concepto: MAX(cantidad × tarifa × factor, mínimo). */
export const importeConcepto = ({ cantidad, tarifa, factor = 1, minimo = 0 }) =>
  redondear(Math.max(Number(cantidad) * Number(tarifa) * Number(factor), Number(minimo) || 0));

/**
 * Valida y calcula el desglose de mano de obra.
 * @param {Array<{conceptoId, cantidad, factor?, justificacion?, nota?}>} lineas lo que captura quien cotiza
 * @param {Array} catalogo catalogoEfectivo(...)
 * @returns {{ok:true, conceptos:Array, manoDeObra:number}|{ok:false, error:string}}
 */
export function armarDesglose(lineas, catalogo) {
  if (!Array.isArray(lineas)) return { ok: false, error: 'El desglose debe ser una lista' };
  if (!lineas.length) return { ok: false, error: 'Agrega al menos un concepto al desglose' };
  if (lineas.length > MAX_CONCEPTOS) return { ok: false, error: `Máximo ${MAX_CONCEPTOS} conceptos por cotización` };
  const porId = new Map((catalogo || []).map(c => [c.id, c]));

  const conceptos = [];
  for (const l of lineas) {
    const c = porId.get(l?.conceptoId);
    if (!c) return { ok: false, error: 'Uno de los conceptos no existe en el catálogo' };
    if (!c.disponible) return { ok: false, error: `"${c.concepto}" aún no tiene tarifa autorizada` };
    if (!positivo(l.cantidad) || Number(l.cantidad) > MAX_CANTIDAD) return { ok: false, error: `Cantidad inválida en "${c.concepto}"` };
    const factor = l.factor === undefined || l.factor === null || l.factor === '' ? 1 : Number(l.factor);
    if (!FACTORES_DIFICULTAD.includes(factor)) return { ok: false, error: `Factor de dificultad inválido en "${c.concepto}"` };
    const justificacion = texto(l.justificacion);
    if (factor > 1 && !justificacion) return { ok: false, error: `Justifica el factor de dificultad de "${c.concepto}"` };
    const cantidad = redondear(l.cantidad);
    conceptos.push({
      conceptoId: c.id,
      especialidad: c.especialidad,
      concepto: c.concepto,
      unidad: c.unidad,
      cantidad,
      tarifa: c.tarifa,
      factor,
      minimo: c.minimo || 0,
      importe: importeConcepto({ cantidad, tarifa: c.tarifa, factor, minimo: c.minimo }),
      ...(factor > 1 ? { justificacion } : {}),
      ...(texto(l.nota) ? { nota: texto(l.nota) } : {})
    });
  }
  const manoDeObra = redondear(conceptos.reduce((s, c) => s + c.importe, 0));
  if (!(manoDeObra > 0)) return { ok: false, error: 'La mano de obra del desglose debe ser mayor a 0' };
  return { ok: true, conceptos, manoDeObra };
}

const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Especialidad del catálogo que corresponde a un servicio (por categoría o nombre); null si no hay coincidencia. */
export function especialidadSugerida(servicio) {
  const textos = [servicio?.categoria, servicio?.nombre].map(sinAcentos).filter(Boolean);
  for (const e of ESPECIALIDADES_COTIZADOR) {
    const n = sinAcentos(e);
    if (textos.some(t => t === n)) return e;
  }
  for (const e of ESPECIALIDADES_COTIZADOR) {
    const raiz = sinAcentos(e).split(/[:\s/]/)[0]; // 'fontaneria', 'pintura', 'aires', 'colocacion'…
    if (raiz.length > 4 && textos.some(t => t.includes(raiz))) return e;
  }
  return null;
}

/**
 * Lo que ve el CLIENTE (y el PDF): cada trabajo con su cantidad e importe, agrupado por especialidad (sin tarifa,
 * factor ni mínimo, que son internos), y los materiales a su precio con subtotal y total con IVA.
 */
export function desgloseParaCliente(cotizacion) {
  const tasa = (Number(cotizacion?.porcentajeIva ?? 16) || 0) / 100;
  const grupos = [];
  for (const c of cotizacion?.desgloseManoObra || []) {
    let g = grupos.find(x => x.especialidad === c.especialidad);
    if (!g) grupos.push(g = { especialidad: c.especialidad, conceptos: [], importe: 0 });
    g.conceptos.push({ concepto: c.concepto, cantidad: c.cantidad, unidad: c.unidad, importe: c.importe, ...(c.nota ? { nota: c.nota } : {}) });
    g.importe = redondear(g.importe + c.importe);
  }
  const materiales = (cotizacion?.materiales || []).map(m => {
    const subtotal = redondear(m.total ?? Number(m.cantidad) * Number(m.precioPorUnidad));
    return { nombre: m.nombre, descripcion: m.descripcion || '', cantidad: m.cantidad, precioPorUnidad: m.precioPorUnidad, subtotal, total: redondear(subtotal * (1 + tasa)) };
  });
  return {
    desglosada: grupos.length > 0,
    manoDeObra: { grupos, total: redondear(cotizacion?.manoDeObra) },
    materiales: { lineas: materiales, total: redondear(cotizacion?.costoMateriales ?? materiales.reduce((s, m) => s + m.subtotal, 0)) },
    subtotal: redondear(cotizacion?.subtotal),
    porcentajeIva: tasa * 100,
    iva: redondear(cotizacion?.iva),
    total: redondear(cotizacion?.total)
  };
}
