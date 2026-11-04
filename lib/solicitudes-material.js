// lib/solicitudes-material.js
// Reglas de las solicitudes de material a ferreterías: stock, solicitudes automáticas al pasar la
// cita a en_progreso, avisos (email + push) y forma de respuesta.
import SolicitudMaterial from '@/models/SolicitudMaterial';
import Material from '@/models/Material';
import Ferretero from '@/models/Ferretero';
import Contratista from '@/models/Contratista';
import Tecnico from '@/models/Tecnico';
import User from '@/models/User';
import { enviarPush } from '@/lib/push';
import { enviarEmailSolicitudMaterial, enviarEmailEstadoSolicitudMaterial } from '@/lib/email-service';

export const TRANSICIONES = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['surtida', 'cancelada'],
  surtida: [],
  cancelada: []
};

export const totalDeItems = (items) =>
  Math.round(items.reduce((t, i) => t + (Number(i.precio) || 0) * (Number(i.cantidad) || 0), 0) * 100) / 100;

/** Nombres de los materiales con stock controlado que no alcanza para la cantidad pedida. */
export function itemsSinStock(materialesPorId, items) {
  const faltan = [];
  for (const it of items) {
    const m = materialesPorId[String(it.materialId || it.material)];
    if (m && typeof m.stock === 'number' && Number(it.cantidad) > m.stock) faltan.push(m.nombre);
  }
  return faltan;
}

/**
 * Descuenta stock de forma atómica ítem por ítem (solo si el material controla stock).
 * Si alguno no alcanza, repone lo ya descontado. Marca item.stockDescontado.
 * @returns {Promise<{ok:true}|{error:string}>}
 */
export async function descontarStock(solicitud) {
  const hechos = [];
  for (const it of solicitud.items) {
    const r = await Material.updateOne(
      { _id: it.material, stock: { $type: 'number', $gte: it.cantidad } },
      { $inc: { stock: -it.cantidad } }
    );
    if (r.modifiedCount === 1) {
      hechos.push(it);
      it.stockDescontado = true;
      continue;
    }
    const m = await Material.findById(it.material).select('stock').lean();
    if (m && typeof m.stock === 'number') {
      await Promise.all(hechos.map(h => Material.updateOne({ _id: h.material }, { $inc: { stock: h.cantidad } })));
      hechos.forEach(h => { h.stockDescontado = false; });
      return { error: `Stock insuficiente de ${it.nombre}` };
    }
    // sin control de stock: no se descuenta
  }
  return { ok: true };
}

/** Repone el stock de los ítems que se habían descontado. */
export async function reponerStock(solicitud) {
  for (const it of solicitud.items) {
    if (it.stockDescontado) {
      await Material.updateOne({ _id: it.material, stock: { $type: 'number' } }, { $inc: { stock: it.cantidad } });
      it.stockDescontado = false;
    }
  }
}

/** Populate estándar para respuestas. */
export const POPULATE_SOLICITUD = [
  { path: 'ferreteria', select: 'nombreNegocio direccion telefono' },
  { path: 'cita', select: 'servicio ubicacion estado fechaProgramada horaInicio', populate: { path: 'servicio', select: 'nombre' } },
  { path: 'contratista', select: 'nombre telefono' },
  { path: 'tecnico', select: 'user', populate: { path: 'user', select: 'nombre telefono' } }
];

/** tecnico -> {_id, nombre, telefono} (aplana el user). */
export function serializarSolicitud(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  if (o.tecnico && typeof o.tecnico === 'object' && o.tecnico.user) {
    o.tecnico = { _id: o.tecnico._id, nombre: o.tecnico.user.nombre, telefono: o.tecnico.user.telefono };
  }
  return o;
}

const ETIQUETA = { confirmada: 'confirmó', surtida: 'surtió', cancelada: 'canceló' };

/** Email + push al contratista y al técnico cuando el ferretero cambia el estado. */
export async function notificarCambioSolicitud(solicitud, estado, motivo) {
  try {
    const [contratista, tecnico, ferreteria] = await Promise.all([
      Contratista.findById(solicitud.contratista).select('nombre email').lean(),
      solicitud.tecnico ? Tecnico.findById(solicitud.tecnico).select('user').lean() : null,
      Ferretero.findById(solicitud.ferreteria).select('nombreNegocio').lean()
    ]);
    const tecnicoUser = tecnico ? await User.findById(tecnico.user).select('email').lean() : null;
    const nombreFerreteria = ferreteria?.nombreNegocio || 'La ferretería';
    const notas = estado === 'cancelada' && motivo ? `Motivo: ${motivo}` : '';

    await Promise.all([
      enviarEmailEstadoSolicitudMaterial({ contratista, ferreteria: nombreFerreteria, estado, notas }),
      tecnicoUser ? enviarEmailEstadoSolicitudMaterial({ contratista: tecnicoUser, ferreteria: nombreFerreteria, estado, notas }) : null,
      enviarPush([solicitud.contratista, tecnico?.user], {
        titulo: `Material ${estado}`,
        cuerpo: `${nombreFerreteria} ${ETIQUETA[estado] || estado} la solicitud de material${notas ? `. ${notas}` : ''}`,
        data: { tipo: `solicitud_material_${estado}`, solicitudId: String(solicitud._id), citaId: String(solicitud.cita) }
      })
    ]);
  } catch (error) {
    console.error('Error notificando cambio de solicitud de material:', error);
  }
}

/** Email + push al ferretero por una solicitud nueva. */
export async function notificarSolicitudNueva(solicitud, { solicitante, servicio }) {
  try {
    const ferretero = await User.findById(solicitud.ferretero).select('email nombre').lean();
    await Promise.all([
      enviarEmailSolicitudMaterial({ ferretero, solicitante, servicio, items: solicitud.items, notas: solicitud.notas }),
      enviarPush([solicitud.ferretero], {
        titulo: 'Nueva solicitud de material',
        cuerpo: `${solicitante || 'Un contratista'} pidió ${solicitud.items.length} material(es)${servicio ? ` para ${servicio}` : ''}`,
        data: { tipo: 'solicitud_material_nueva', solicitudId: String(solicitud._id), citaId: String(solicitud.cita) }
      })
    ]);
  } catch (error) {
    console.error('Error notificando solicitud de material nueva:', error);
  }
}

/**
 * Al verificarse anticipo/total (cita -> en_progreso): crea una solicitud por (cita, ferretería) con los
 * materiales de la cotización que traen materialId y ferreteriaId. Idempotente; nunca lanza.
 */
export async function crearSolicitudesAutomaticas(cita, cotizacion) {
  try {
    const porFerreteria = {};
    for (const m of cotizacion.materiales || []) {
      const materialId = m.materialId || m.materialCatalogoId;
      if (!materialId || !m.ferreteriaId) continue; // ítems sin ids se ignoran
      (porFerreteria[String(m.ferreteriaId)] ||= []).push({ materialId: String(materialId), cantidad: Number(m.cantidad) || 0 });
    }

    const creadas = [];
    for (const [ferreteriaId, lista] of Object.entries(porFerreteria)) {
      if (await SolicitudMaterial.exists({ cita: cita._id, ferreteria: ferreteriaId })) continue;

      const ferreteria = await Ferretero.findById(ferreteriaId);
      if (!ferreteria || !ferreteria.activo || !ferreteria.catalogoActivo) continue;

      const materiales = await Material.find({ _id: { $in: lista.map(i => i.materialId) }, ferretero: ferreteria.user, activo: true });
      const porId = Object.fromEntries(materiales.map(m => [String(m._id), m]));
      const items = lista
        .filter(i => porId[i.materialId] && i.cantidad > 0)
        .map(i => ({ material: i.materialId, nombre: porId[i.materialId].nombre, unidad: porId[i.materialId].unidad, precio: porId[i.materialId].precio, cantidad: i.cantidad }));
      if (items.length === 0) continue;

      const solicitud = await SolicitudMaterial.create({
        ferretero: ferreteria.user,
        ferreteria: ferreteria._id,
        cita: cita._id,
        contratista: cotizacion.contratista,
        tecnico: cita.tecnico || null,
        items,
        total: totalDeItems(items),
        modoEntrega: 'recoger',
        fechaRequerida: cita.fechaProgramada || null,
        origen: 'automatica',
        notas: 'Solicitud generada automáticamente al verificarse el pago',
        historial: [{ estado: 'pendiente', notas: 'Generada automáticamente' }]
      });
      creadas.push(solicitud);
      const contratista = await Contratista.findById(cotizacion.contratista).select('nombre').lean();
      notificarSolicitudNueva(solicitud, { solicitante: contratista?.nombre, servicio: null });
    }
    return creadas;
  } catch (error) {
    console.error('Error creando solicitudes de material automáticas:', error);
    return [];
  }
}
