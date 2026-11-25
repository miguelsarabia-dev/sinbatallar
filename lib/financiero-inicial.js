// lib/financiero-inicial.js
// MODELO FINANCIERO INICIAL (puro, sin BD). Fuente: Sin_Batallar_OFICIAL_01_Modelo_Inicial_2026.xlsx,
// versión maestra SB-FIN-INI-2026-11-09. NO mezclar con lib/financial-config.js (modelo permanente).
//
// Todo se calcula sobre la MANO DE OBRA (MO). Materiales, margen de ferretería e IVA quedan fuera del reparto.
//
// Por servicio:
//   operación Sin Batallar 15% · operación asociado 10% · especialista 12% · aspirantes 12% (partes iguales entre los
//   que fueron; si no fue ninguno, ese 12% pasa al remanente) · aperturador 3% · remanente = lo que sobra (48%).
//   Lo que no se asigna (sin aspirantes, sin aperturador, sin asociado) también pasa al remanente.
//
// Cierre mensual (el remanente real sale aquí, no por servicio):
//   resultado = MO del mes − especialistas − aspirantes − aperturadores − costos de operación − sueldos base
//   donde a cada aperturador se le paga lo MAYOR entre su comisión del mes y su garantía (nunca ambas).
//   Si el resultado es positivo: 50% asociado(s), 50% Sin Batallar.

export const VERSION_FINANCIERO_INICIAL = 'SB-FIN-INI-2026-11-09';

/** Parámetros por defecto (PARAMETROS!B13:B22 del Excel). Porcentajes en 0–100. */
export const FINANCIERO_INICIAL = Object.freeze({
  OPERACION_SB: 15,          // costos operativos central (Sin Batallar)
  OPERACION_ASOCIADO: 10,    // costos operativos del asociado (fase formativa)
  ESPECIALISTA: 12,          // comisión del especialista (instructor), adicional a su sueldo base
  ASPIRANTES: 12,            // comisión de los aspirantes que fueron, en partes iguales
  APERTURADOR: 3,            // comisión del aperturador (se compara contra su garantía mensual)
  PARTICIPACION_ASOCIADO: 50, // % del remanente positivo del mes para el asociado; el resto, Sin Batallar
  GARANTIA_APERTURADOR: 20000, // MXN al mes
  SUELDO_SEMANAL: 4500,       // MXN, sueldo base de cada especialista
  SEMANAS_POR_MES: 52 / 12    // 4.333…
});

const PORCENTAJES = ['OPERACION_SB', 'OPERACION_ASOCIADO', 'ESPECIALISTA', 'ASPIRANTES', 'APERTURADOR'];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
/** Redondeo a centavos. */
export const centavos = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Valida/normaliza la configuración (override del admin sobre los defaults). Lanza Error si es inconsistente.
 */
export function normalizarConfigInicial(valor = {}) {
  const out = { ...FINANCIERO_INICIAL };
  for (const k of Object.keys(FINANCIERO_INICIAL)) {
    if (valor?.[k] === undefined) continue;
    const v = num(valor[k]);
    if (Number.isNaN(v) || v < 0) throw new Error(`${k} debe ser un número mayor o igual a 0`);
    out[k] = v;
  }
  for (const k of [...PORCENTAJES, 'PARTICIPACION_ASOCIADO']) {
    if (out[k] > 100) throw new Error(`${k} no puede exceder 100`);
  }
  const suma = PORCENTAJES.reduce((s, k) => s + out[k], 0);
  if (suma > 100) throw new Error(`La suma de porcentajes por servicio (${suma}) no puede exceder 100`);
  if (out.SEMANAS_POR_MES === 0 || out.SEMANAS_POR_MES > 5) throw new Error('SEMANAS_POR_MES debe estar entre 0 y 5');
  return out;
}

/**
 * Reparto de UN servicio del modelo inicial.
 * @param {object} p
 * @param {number} p.manoDeObra base del reparto (sin materiales ni IVA)
 * @param {number} [p.aspirantes] cuántos aspirantes fueron (0–2)
 * @param {boolean} [p.hasAperturador] la zona tiene aperturador
 * @param {boolean} [p.hasAsociado] el especialista tiene asociado
 * @param {object} [p.config] configuración normalizada
 * @returns montos en pesos (a centavos). La suma de todos los montos es exactamente la MO.
 */
export function distribuirServicioInicial({
  manoDeObra = 0,
  aspirantes = 0,
  hasAperturador = true,
  hasAsociado = true,
  config = FINANCIERO_INICIAL
} = {}) {
  const mo = centavos(Math.max(0, Number(manoDeObra) || 0));
  const n = Math.max(0, Math.min(2, Math.floor(Number(aspirantes) || 0)));
  const parte = (pct) => centavos((mo * pct) / 100);

  const operacionSB = parte(config.OPERACION_SB);
  const operacionAsociado = hasAsociado ? parte(config.OPERACION_ASOCIADO) : 0;
  const especialista = parte(config.ESPECIALISTA);
  const aperturador = hasAperturador ? parte(config.APERTURADOR) : 0;

  // Aspirantes: partes iguales a centavos; los centavos que no se pueden repartir parejo van al remanente
  const bolsaAspirantes = n > 0 ? parte(config.ASPIRANTES) : 0;
  const porAspirante = n > 0 ? Math.floor((bolsaAspirantes * 100) / n) / 100 : 0;
  const aspirantesTotal = centavos(porAspirante * n);

  const remanente = centavos(mo - operacionSB - operacionAsociado - especialista - aperturador - aspirantesTotal);

  return {
    version: VERSION_FINANCIERO_INICIAL,
    manoDeObra: mo,
    operacionSB: { porcentaje: config.OPERACION_SB, monto: operacionSB },
    operacionAsociado: { porcentaje: hasAsociado ? config.OPERACION_ASOCIADO : 0, monto: operacionAsociado },
    especialista: { porcentaje: config.ESPECIALISTA, monto: especialista },
    aspirantes: {
      porcentaje: n > 0 ? config.ASPIRANTES : 0,
      cantidad: n,
      porAspirante: { porcentaje: n > 0 ? config.ASPIRANTES / n : 0, monto: porAspirante },
      monto: aspirantesTotal
    },
    aperturador: { porcentaje: hasAperturador ? config.APERTURADOR : 0, monto: aperturador },
    // Lo que queda del servicio: se reparte en el cierre mensual, después de sueldos y garantías
    remanente: { monto: remanente }
  };
}

/** Sueldo base de un mes por especialista (Excel: semanal × 52/12). */
export function sueldoMensual(sueldoSemanal = FINANCIERO_INICIAL.SUELDO_SEMANAL, config = FINANCIERO_INICIAL) {
  return centavos(sueldoSemanal * config.SEMANAS_POR_MES);
}

/** Lo que se le paga a un aperturador en el mes: lo MAYOR entre su comisión y su garantía (no se suman). */
export function pagoAperturador(comision = 0, garantia = FINANCIERO_INICIAL.GARANTIA_APERTURADOR) {
  const c = centavos(comision);
  const g = centavos(garantia);
  return { comision: c, garantia: g, pago: Math.max(c, g), complementoGarantia: centavos(Math.max(0, g - c)) };
}

/**
 * Cierre mensual del modelo inicial.
 * @param {object} p
 * @param {Array} p.servicios repartos del mes (salida de distribuirServicioInicial, o su snapshot guardado) con
 *   `asociadoId` y `aperturadorId` opcionales
 * @param {number} p.sueldos total de sueldos base del mes (registrados o proyectados)
 * @param {Array<{id:string, garantia?:number}>} [p.aperturadores] aperturadores con garantía este mes; los que solo
 *   aparecen en servicios cobran su comisión (garantía 0)
 * @param {object} [p.config]
 */
export function cierreMensualInicial({ servicios = [], sueldos = 0, aperturadores = [], config = FINANCIERO_INICIAL } = {}) {
  const suma = (f) => centavos(servicios.reduce((s, x) => s + (Number(f(x)) || 0), 0));

  const ventaMO = suma(s => s.manoDeObra);
  const especialistas = suma(s => s.especialista?.monto);
  const aspirantes = suma(s => s.aspirantes?.monto);
  const operacionSB = suma(s => s.operacionSB?.monto);
  const operacionAsociado = suma(s => s.operacionAsociado?.monto);

  // Aperturadores: comisión acumulada vs garantía, por aperturador
  const comisionPor = new Map();
  for (const s of servicios) {
    if (!s.aperturadorId || !s.aperturador?.monto) continue;
    const k = String(s.aperturadorId);
    comisionPor.set(k, (comisionPor.get(k) || 0) + s.aperturador.monto);
  }
  const garantiaPor = new Map(aperturadores.map(a => [String(a.id), a.garantia ?? config.GARANTIA_APERTURADOR]));
  const ids = new Set([...comisionPor.keys(), ...garantiaPor.keys()]);
  const pagosAperturadores = [...ids].map(id => ({ id, ...pagoAperturador(comisionPor.get(id) || 0, garantiaPor.get(id) || 0) }));
  // Comisión de aperturador de servicios sin aperturador identificado (no debería pasar): se paga tal cual
  const sinId = suma(s => (s.aperturadorId ? 0 : s.aperturador?.monto));
  const aperturadoresTotal = centavos(pagosAperturadores.reduce((s, a) => s + a.pago, 0) + sinId);

  const costosOperacion = centavos(operacionSB + operacionAsociado);
  const sueldosBase = centavos(sueldos);
  const resultado = centavos(ventaMO - especialistas - aspirantes - aperturadoresTotal - costosOperacion - sueldosBase);
  const repartible = Math.max(0, resultado);
  const asociado = centavos((repartible * config.PARTICIPACION_ASOCIADO) / 100);
  const sinBatallar = centavos(repartible - asociado);

  // Parte del asociado: entre los asociados, en proporción a la MO de los servicios de sus especialistas
  const moPorAsociado = new Map();
  for (const s of servicios) {
    if (!s.asociadoId) continue;
    const k = String(s.asociadoId);
    moPorAsociado.set(k, (moPorAsociado.get(k) || 0) + (Number(s.manoDeObra) || 0));
  }
  const moConAsociado = [...moPorAsociado.values()].reduce((a, b) => a + b, 0);
  const porAsociado = moConAsociado > 0
    ? [...moPorAsociado.entries()].map(([id, mo]) => ({ id, manoDeObra: centavos(mo), monto: centavos((asociado * mo) / moConAsociado) }))
    : [];

  return {
    version: VERSION_FINANCIERO_INICIAL,
    servicios: servicios.length,
    ventaMO,
    especialistas,
    aspirantes,
    personal: centavos(especialistas + aspirantes), // "Contratista / personal" del Excel
    aperturadores: aperturadoresTotal,
    pagosAperturadores,
    costosOperacion,
    operacionSB,
    operacionAsociado,
    sueldosBase,
    resultado,                 // puede ser negativo: entonces no hay reparto
    asociado,
    sinBatallar,
    porAsociado
  };
}

/**
 * Escenario mensual con un precio de MO promedio (hoja ESCENARIOS del Excel). Se asume que van aspirantes a todos
 * los servicios y que hay asociado y aperturador, como en el Excel.
 * @param {object} p
 * @param {number} p.servicios servicios en el mes
 * @param {number} p.moPromedio MO promedio por servicio
 * @param {number} [p.especialistas] número de especialistas con sueldo base (Excel: 4)
 * @param {number} [p.aperturadores] aperturadores con garantía (Excel: 1)
 */
export function escenarioInicial({ servicios, moPromedio, especialistas = 4, aperturadores = 1, config = FINANCIERO_INICIAL }) {
  const ventaMO = moPromedio * servicios;
  const personal = ventaMO * (config.ESPECIALISTA + config.ASPIRANTES) / 100;
  const comisionAperturador = ventaMO * config.APERTURADOR / 100;
  const aperturador = Math.max(comisionAperturador, config.GARANTIA_APERTURADOR * aperturadores);
  const costosOperacion = ventaMO * (config.OPERACION_SB + config.OPERACION_ASOCIADO) / 100;
  const sueldosBase = especialistas * config.SUELDO_SEMANAL * config.SEMANAS_POR_MES;
  const resultado = ventaMO - personal - aperturador - costosOperacion - sueldosBase;
  const asociado = Math.max(0, resultado) * config.PARTICIPACION_ASOCIADO / 100;
  return {
    servicios, ventaMO, personal, aperturador, costosOperacion, sueldosBase, resultado,
    asociado, sinBatallar: Math.max(0, resultado) - asociado
  };
}
