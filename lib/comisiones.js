// lib/comisiones.js
// Lógica de servidor para reparto, comisión, ganancia estimada y cierre de servicio.
// El cálculo puro vive en lib/financial-config.js (calcularDistribucion); aquí solo se
// resuelven los datos (config en BD, aperturador/incorporador/técnico) y se persiste.
import Cita from '@/models/Cita';
import Cotizacion from '@/models/Cotizacion';
import Comision from '@/models/Comision';
import Contratista from '@/models/Contratista';
import Tecnico from '@/models/Tecnico';
import Area from '@/models/Area';
import Configuracion from '@/models/Configuracion';
import { FINANCIAL_CONFIG, calcularDistribucion, normalizarDistribucion } from '@/lib/financial-config';
import { enviarEmailsCitaCompletada } from '@/lib/email-service';
import { listoParaCerrar } from '@/lib/cierre';

/** Config vigente: defaults + override del admin (si es válido). */
export async function getFinancialConfig() {
  try {
    const doc = await Configuracion.findOne({ clave: 'financiera' }).lean();
    // Solo se respeta un override del admin con el esquema vigente (trae TECHNICIAN); uno anterior se ignora
    if (doc?.valor && doc.valor.TECHNICIAN !== undefined && doc.valor.PLATFORM !== undefined) return normalizarDistribucion({ ...FINANCIAL_CONFIG.DISTRIBUTION, ...doc.valor });
  } catch (error) {
    console.error('Error leyendo configuración financiera, usando defaults:', error);
  }
  return { ...FINANCIAL_CONFIG.DISTRIBUTION };
}

/** Cotización aceptada de la cita (tolerante a datos huérfanos). */
export async function resolverCotizacionAceptada(cita) {
  const ref = cita.cotizacionAceptada?._id || cita.cotizacionAceptada;
  if (ref) {
    const c = await Cotizacion.findById(ref);
    if (c) return c;
  }
  return Cotizacion.findOne({ cita: cita._id, estado: 'aceptada' }).sort({ createdAt: -1 });
}

/** Monto realmente verificado (para reembolsos). */
export function montoVerificado(cotizacion) {
  if (!cotizacion) return 0;
  const parte = (p, fallback) => (p?.verificado ? (Number(p.monto) || fallback) : 0);
  if (cotizacion.modalidadPago === 'total') {
    return parte(cotizacion.pagoUnico, cotizacion.total || 0);
  }
  return parte(cotizacion.anticipo, (cotizacion.total || 0) / 2) + parte(cotizacion.saldo, (cotizacion.total || 0) / 2);
}

export const hayPagoVerificado = (cotizacion) => montoVerificado(cotizacion) > 0;

export { listoParaCerrar };

/** Aperturador (por zona), incorporador (por contratista) y técnico asignado. */
export async function contextoReparto(cita, cotizacion, cache = {}) {
  const zonaId = cita.ubicacion?.zona?._id || cita.ubicacion?.zona;
  let area = null;
  if (zonaId) {
    const k = String(zonaId);
    cache.areas = cache.areas || {};
    if (!(k in cache.areas)) cache.areas[k] = await Area.findById(zonaId).select('aperturador').lean();
    area = cache.areas[k];
  }

  const contratistaId = String(cotizacion.contratista?._id || cotizacion.contratista);
  cache.contratistas = cache.contratistas || {};
  if (!(contratistaId in cache.contratistas)) {
    cache.contratistas[contratistaId] = await Contratista.findById(contratistaId).select('incorporador').lean();
  }
  const contratista = cache.contratistas[contratistaId];

  let tecnico = null;
  const tecnicoRef = cita.tecnico?._id || cita.tecnico;
  if (tecnicoRef) {
    // El % del técnico es fijo (config.TECHNICIAN): solo hace falta saber que existe
    tecnico = cita.tecnico?._id ? cita.tecnico : await Tecnico.findById(tecnicoRef).select('_id').lean();
  }

  return {
    aperturadorId: area?.aperturador || null,
    incorporadorId: contratista?.incorporador || null,
    tecnicoId: tecnico ? (tecnico._id || tecnicoRef) : null
  };
}

function datosBase(cotizacion) {
  const costoMateriales = cotizacion.costoMateriales || cotizacion.materiales?.reduce((t, m) => t + (Number(m.total) || 0), 0) || 0;
  const manoDeObra = cotizacion.manoDeObra || 0;
  const subtotal = cotizacion.subtotal || (manoDeObra + costoMateriales);
  const iva = cotizacion.iva ?? Math.round(subtotal * (FINANCIAL_CONFIG.TAX.VAT_RATE));
  return { costoMateriales, manoDeObra, subtotal, iva, total: cotizacion.total || (subtotal + iva) };
}

/** Forma única de `cita.ganancia`, a partir de una distribución ya calculada. */
function armarGanancia({ base, dist, liberacion, estimada }) {
  return {
    total: base.total,
    base: base.subtotal,
    iva: base.iva,
    manoDeObra: base.manoDeObra,
    materiales: base.costoMateriales,
    comisionPlataforma: dist.plataforma.monto,
    sinAsignar: dist.sinAsignar?.monto || 0,
    comisionAperturador: dist.aperturador?.monto || 0,
    comisionIncorporador: dist.incorporador?.monto || 0,
    gananciaContratista: dist.contratista.montoTotal,
    gananciaTecnico: dist.tecnico.monto,
    porcentajeTecnico: dist.tecnico.porcentaje,
    liberacionTecnico: liberacion || { estado: 'pendiente', fecha: null },
    estimada: !!estimada
  };
}

/** Ganancia de una cita: real si ya hay comisión; si no, estimada con la config vigente. */
export async function gananciaDeCita(cita, { comision, cotizacion, config, cache } = {}) {
  if (comision && comision.estadoPago !== 'cancelada') {
    const d = comision.distribucion;
    return armarGanancia({
      base: { total: comision.totalServicio, subtotal: comision.subtotal, iva: comision.iva, manoDeObra: comision.manoDeObra, costoMateriales: comision.costoMateriales },
      dist: {
        plataforma: d.plataforma, aperturador: d.aperturador, incorporador: d.incorporador, sinAsignar: d.sinAsignar,
        tecnico: { porcentaje: d.tecnico?.porcentaje || 0, monto: d.tecnico?.monto || 0 },
        contratista: d.contratista
      },
      liberacion: { estado: comision.liberacionTecnico?.estado || 'pendiente', fecha: comision.liberacionTecnico?.fecha || null },
      estimada: false
    });
  }
  if (!cotizacion) return null;
  const base = datosBase(cotizacion);
  const ctx = await contextoReparto(cita, cotizacion, cache);
  const cfg = config || (await getFinancialConfig());
  const dist = calcularDistribucion({
    manoDeObra: base.manoDeObra,
    costoMateriales: base.costoMateriales,
    hasOpener: !!ctx.aperturadorId,
    hasIncorporator: !!ctx.incorporadorId,
    porcentajeTecnico: ctx.tecnicoId ? cfg.TECHNICIAN : 0,
    config: cfg
  });
  return armarGanancia({ base, dist, estimada: true });
}

/**
 * Crea la Comisión (idempotente) solo si el pago está verificado y la cita está cerrada.
 * Hace snapshot del reparto con la config y el % de técnico vigentes en este momento.
 */
export async function crearComisionSiCorresponde(cita, cotizacion) {
  if (cita.estado === 'cancelada' || !listoParaCerrar(cita, cotizacion)) return null;

  const existente = await Comision.findOne({ cita: cita._id });
  if (existente) return existente;

  const base = datosBase(cotizacion);
  const ctx = await contextoReparto(cita, cotizacion);
  const config = await getFinancialConfig();
  const dist = calcularDistribucion({
    manoDeObra: base.manoDeObra,
    costoMateriales: base.costoMateriales,
    hasOpener: !!ctx.aperturadorId,
    hasIncorporator: !!ctx.incorporadorId,
    porcentajeTecnico: ctx.tecnicoId ? config.TECHNICIAN : 0,
    config
  });

  const distribucion = {
    plataforma: dist.plataforma,
    sinAsignar: dist.sinAsignar,
    contratista: { id: cotizacion.contratista, ...dist.contratista }
  };
  if (ctx.aperturadorId) distribucion.aperturador = { id: ctx.aperturadorId, ...dist.aperturador };
  if (ctx.incorporadorId) distribucion.incorporador = { id: ctx.incorporadorId, ...dist.incorporador };
  if (ctx.tecnicoId) distribucion.tecnico = { id: ctx.tecnicoId, ...dist.tecnico };

  try {
    return await Comision.create({
      cita: cita._id,
      cotizacion: cotizacion._id,
      totalServicio: base.total,
      subtotal: base.subtotal,
      iva: base.iva,
      costoMateriales: base.costoMateriales,
      manoDeObra: base.manoDeObra,
      distribucion,
      estadoPago: 'disponible'
    });
  } catch (error) {
    if (error?.code === 11000) return Comision.findOne({ cita: cita._id }); // carrera: ya existe
    throw error;
  }
}

/**
 * Cierra el servicio (cita completada + pagado) y crea la comisión cuando el pago ya está
 * verificado: saldo verificado (anticipo+saldo) o pagoUnico verificado + cliente confirmó.
 * Idempotente. `notificar:false` no envía el email de servicio completado (lo usan los scripts de reparación).
 * @returns {{cerrada:boolean, comision:object|null}}
 */
export async function cerrarServicioSiCorresponde(citaId, { notificar = true } = {}) {
  const cita = await Cita.findById(citaId);
  if (!cita || cita.estado === 'cancelada') return { cerrada: false, comision: null };

  const cotizacion = await resolverCotizacionAceptada(cita);
  if (!listoParaCerrar(cita, cotizacion)) return { cerrada: false, comision: null };

  const yaCerrada = cita.pagado && cita.estado === 'completada';
  if (!yaCerrada) {
    cita.estado = 'completada';
    cita.pagado = true;
    cita.metodoPago = 'transferencia';
    if (!cita.horaFin) {
      const now = new Date();
      cita.horaFin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
    cita.historial.push({
      estado: 'completada',
      comentario: cotizacion.modalidadPago === 'total'
        ? 'Pago total verificado y trabajo confirmado por el cliente. Servicio cerrado.'
        : 'Saldo verificado por el contratista. Pago completo confirmado.',
      fecha: new Date()
    });
    await cita.save({ validateModifiedOnly: true });
  }

  const comision = await crearComisionSiCorresponde(cita, cotizacion);

  if (!yaCerrada && notificar) {
    const citaPoblada = await Cita.findById(cita._id)
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono')
      .populate('servicio', 'nombre descripcion');
    enviarEmailsCitaCompletada({
      cita: citaPoblada,
      cliente: citaPoblada.cliente,
      contratista: citaPoblada.contratista,
      servicio: citaPoblada.servicio,
      cotizacion
    }).catch(err => console.error('Error enviando emails cita completada:', err));
  }

  return { cerrada: true, comision };
}
