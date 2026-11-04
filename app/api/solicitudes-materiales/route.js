// app/api/solicitudes-materiales/route.js
// GET: el ferretero ve las suyas; el contratista las que creó; el técnico las de su perfil; admin todas.
//   ?estado=pendiente|confirmada|surtida|cancelada (admite lista separada por comas)  ?citaId=
// POST (contratista o técnico): { ferreteriaId | ferreteroUserId, citaId, items:[{materialId, cantidad}], notas,
//   modoEntrega?: 'recoger'|'entregar', fechaRequerida? }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import SolicitudMaterial from '@/models/SolicitudMaterial';
import Material from '@/models/Material';
import Ferretero from '@/models/Ferretero';
import Cita from '@/models/Cita';
import Tecnico from '@/models/Tecnico';
import Contratista from '@/models/Contratista';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import {
  POPULATE_SOLICITUD, serializarSolicitud, itemsSinStock, totalDeItems, notificarSolicitudNueva
} from '@/lib/solicitudes-material';

const ESTADOS = ['pendiente', 'confirmada', 'surtida', 'cancelada'];
const MAX_ITEMS = 50;
const bad = (message, status = 400, extra = {}) => NextResponse.json({ error: message, ...extra }, { status });

export async function GET(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['ferretero', 'contratista', 'tecnico', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const filtro = {};

    if (session.role === 'ferretero') filtro.ferretero = session.id;
    else if (session.role === 'contratista') filtro.contratista = session.id;
    else if (session.role === 'tecnico') {
      const tecnico = await Tecnico.findOne({ user: session.id }).select('_id');
      filtro.tecnico = tecnico?._id || null;
    }

    const estado = searchParams.get('estado');
    if (estado) {
      const estados = estado.split(',').map(e => e.trim()).filter(e => ESTADOS.includes(e));
      if (estados.length) filtro.estado = estados.length === 1 ? estados[0] : { $in: estados };
    }
    if (esObjectId(searchParams.get('citaId'))) filtro.cita = searchParams.get('citaId');

    const solicitudes = await SolicitudMaterial.find(filtro)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate(POPULATE_SOLICITUD);

    return NextResponse.json(solicitudes.map(serializarSolicitud));
  } catch (error) {
    console.error('Error en GET /api/solicitudes-materiales:', error);
    return bad('Error interno del servidor', 500);
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['contratista', 'tecnico']);
    if (error) return error;

    const body = await request.json();
    const { ferreteriaId, ferreteroUserId, citaId, items, notas, modoEntrega, fechaRequerida } = body;

    if (!esObjectId(citaId)) return bad('citaId es requerido');
    if (!Array.isArray(items) || items.length === 0) return bad('items es requerido');
    if (items.length > MAX_ITEMS) return bad(`Máximo ${MAX_ITEMS} materiales por solicitud`);
    if (notas !== undefined && typeof notas !== 'string') return bad('notas inválidas');
    if (modoEntrega !== undefined && !['recoger', 'entregar'].includes(modoEntrega)) return bad("modoEntrega debe ser 'recoger' o 'entregar'");
    const fecha = fechaRequerida ? new Date(fechaRequerida) : null;
    if (fechaRequerida && Number.isNaN(fecha.getTime())) return bad('fechaRequerida inválida');

    // Quién solicita: el contratista del token, o el técnico (y su contratista)
    let contratistaId = session.id;
    let tecnicoId = null;
    if (session.role === 'tecnico') {
      const tecnico = await Tecnico.findOne({ user: session.id }).select('_id contratista activo');
      if (!tecnico || !tecnico.activo) return bad('Técnico no encontrado o inactivo', 403);
      contratistaId = String(tecnico.contratista);
      tecnicoId = tecnico._id;
    }
    const contratista = await Contratista.findById(contratistaId).select('nombre email aprobado');
    if (!contratista?.aprobado) return bad('Tu cuenta aún está en revisión', 403);

    // La cita debe ser de ese contratista y seguir vigente
    const cita = await Cita.findById(citaId).populate('servicio', 'nombre');
    if (!cita || String(cita.contratista) !== contratistaId) return bad('Cita no encontrada', 404);
    if (['cancelada', 'completada', 'rechazada'].includes(cita.estado)) {
      return bad(`No se puede pedir material para una cita ${cita.estado}`);
    }

    // Ferretería destino (por doc Ferretero o por id de su usuario), activa y con catálogo activo
    let ferreteria = null;
    if (esObjectId(ferreteriaId)) ferreteria = await Ferretero.findById(ferreteriaId);
    else if (esObjectId(ferreteroUserId)) ferreteria = await Ferretero.findOne({ user: ferreteroUserId });
    else return bad('ferreteriaId o ferreteroUserId es requerido');
    if (!ferreteria || !ferreteria.activo || !ferreteria.catalogoActivo) return bad('Ferretería no disponible', 404);

    // Los materiales deben ser del catálogo activo de ESA ferretería; se guarda un snapshot
    const ids = [];
    for (const it of items) {
      const cantidad = Number(it?.cantidad);
      if (!esObjectId(it?.materialId) || !Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 100000) {
        return bad('Cada item necesita materialId y cantidad válidos');
      }
      ids.push(it.materialId);
    }
    const materiales = await Material.find({ _id: { $in: ids }, ferretero: ferreteria.user, activo: true });
    const porId = Object.fromEntries(materiales.map(m => [String(m._id), m]));
    const itemsSnapshot = [];
    for (const it of items) {
      const m = porId[String(it.materialId)];
      if (!m) return bad('Algún material no pertenece al catálogo activo de esa ferretería');
      itemsSnapshot.push({ material: m._id, nombre: m.nombre, unidad: m.unidad, precio: m.precio, cantidad: Number(it.cantidad) });
    }

    // Stock: no se puede pedir más de lo que hay (solo materiales que controlan stock)
    const sinStock = itemsSinStock(porId, items);
    if (sinStock.length > 0) {
      return bad(`Sin stock suficiente de: ${sinStock.join(', ')}`, 400, { sinStock });
    }

    const solicitud = await SolicitudMaterial.create({
      ferretero: ferreteria.user,
      ferreteria: ferreteria._id,
      cita: cita._id,
      contratista: contratistaId,
      tecnico: tecnicoId || cita.tecnico || null,
      items: itemsSnapshot,
      total: totalDeItems(itemsSnapshot),
      modoEntrega: modoEntrega || 'recoger',
      fechaRequerida: fecha || cita.fechaProgramada || null,
      origen: 'manual',
      notas: notas?.trim() || '',
      historial: [{ estado: 'pendiente', notas: notas?.trim() || '' }]
    });

    notificarSolicitudNueva(solicitud, { solicitante: contratista.nombre, servicio: cita.servicio?.nombre });

    return NextResponse.json({ message: 'Solicitud creada', solicitud }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/solicitudes-materiales:', error);
    return bad('Error interno del servidor', 500);
  }
}
