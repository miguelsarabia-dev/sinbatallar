// lib/inicial-citas-db.js
// Parte con BD del flujo de citas del MODELO INICIAL (las reglas puras están en lib/inicial-citas.js).
import Cita from '@/models/Cita';
import Area from '@/models/Area';
import Aperturador from '@/models/Aperturador';
import Especialista from '@/models/Especialista';
import ComisionInicial from '@/models/ComisionInicial';
import User from '@/models/User';
import { getConfigInicial } from '@/lib/financiero-inicial-db';
import { distribuirServicioInicial } from '@/lib/financiero-inicial';
import { listoParaCerrar } from '@/lib/cierre';
import { esObjectId } from '@/lib/sanitize';

/** Datos de contacto del especialista con la forma que esperan los correos (`contratista.nombre/email/telefono`). */
export async function contactoEspecialista(especialistaId) {
  const esp = await Especialista.findById(especialistaId).populate({ path: 'user', select: 'nombre email telefono', model: User }).lean();
  return esp?.user ? { _id: esp._id, nombre: esp.user.nombre, email: esp.user.email, telefono: esp.user.telefono } : null;
}

/** Perfil Aperturador a partir de Area.aperturador (las zonas antiguas guardan el id del usuario). */
async function aperturadorPerfilId(valor) {
  if (!valor) return null;
  const v = String(valor);
  if (!esObjectId(v)) return null;
  const perfil = await Aperturador.findOne({ $or: [{ _id: v }, { user: v }] }).select('_id').lean();
  return perfil?._id || null;
}

/** Aperturador (dueño de la zona de la cita) y asociado (del especialista). */
export async function contextoInicial(cita) {
  const zonaId = cita.ubicacion?.zona?._id || cita.ubicacion?.zona;
  const area = zonaId ? await Area.findById(zonaId).select('aperturador').lean() : null;
  const especialista = await Especialista.findById(cita.especialista?._id || cita.especialista).select('asociado').lean();
  return {
    areaId: zonaId || null,
    aperturadorId: await aperturadorPerfilId(area?.aperturador),
    asociadoId: especialista?.asociado || null
  };
}

/** Reparto estimado con la configuración vigente (para mostrarlo antes del cierre). */
export async function repartoEstimadoInicial(cita, cotizacion) {
  if (!cotizacion) return null;
  const [ctx, config] = await Promise.all([contextoInicial(cita), getConfigInicial()]);
  return distribuirServicioInicial({
    manoDeObra: cotizacion.manoDeObra,
    aspirantes: (cita.aspirantes || []).length,
    hasAperturador: !!ctx.aperturadorId,
    hasAsociado: !!ctx.asociadoId,
    config
  });
}

/**
 * Crea la ComisionInicial (idempotente) cuando el pago está verificado y la cita cerrada. Snapshot de la configuración
 * y de los aspirantes que fueron en ese momento.
 */
export async function crearComisionInicialSiCorresponde(cita, cotizacion) {
  if (cita.modelo !== 'inicial' || cita.estado === 'cancelada' || !listoParaCerrar(cita, cotizacion)) return null;
  const existente = await ComisionInicial.findOne({ cita: cita._id });
  if (existente) return existente;

  const [ctx, config] = await Promise.all([contextoInicial(cita), getConfigInicial()]);
  const dist = distribuirServicioInicial({
    manoDeObra: cotizacion.manoDeObra || 0,
    aspirantes: (cita.aspirantes || []).length,
    hasAperturador: !!ctx.aperturadorId,
    hasAsociado: !!ctx.asociadoId,
    config
  });

  try {
    return await ComisionInicial.create({
      cita: cita._id,
      cotizacion: cotizacion._id,
      servicio: cita.servicio?._id || cita.servicio,
      especialista: cita.especialista?._id || cita.especialista,
      aspirantes: (cita.aspirantes || []).map(a => a?._id || a),
      asociado: ctx.asociadoId,
      aperturador: ctx.aperturadorId,
      area: ctx.areaId,
      version: dist.version,
      config,
      manoDeObra: dist.manoDeObra,
      costoMateriales: cotizacion.costoMateriales || 0,
      iva: cotizacion.iva || 0,
      distribucion: {
        operacionSB: dist.operacionSB,
        operacionAsociado: dist.operacionAsociado,
        especialista: dist.especialista,
        aspirantes: dist.aspirantes,
        aperturador: dist.aperturador,
        remanente: dist.remanente
      },
      fechaServicio: new Date()
    });
  } catch (error) {
    if (error?.code === 11000) return ComisionInicial.findOne({ cita: cita._id }); // carrera
    throw error;
  }
}

/** Cita del modelo inicial con sus referencias para las pantallas del especialista y el aspirante. */
export function poblarCitaInicial(query) {
  return query
    .populate('cliente', 'nombre email telefono')
    .populate('servicio', 'nombre descripcion categoria')
    .populate({ path: 'ubicacion.zona', select: 'nombre', model: Area })
    .populate({ path: 'aspirantes', select: 'user', populate: { path: 'user', select: 'nombre telefono', model: User } })
    .populate({ path: 'especialista', select: 'user', populate: { path: 'user', select: 'nombre telefono', model: User } })
    .populate('cotizacionAceptada')
    .populate({ path: 'cotizaciones', select: 'estado total manoDeObra costoMateriales iva descripcionTrabajo materiales fechaInicioPropuesta horaInicioPropuesta createdAt' });
}

export { Cita };
