// app/api/solicitudes-materiales/[id]/route.js
// GET: dueño (ferretero, contratista, técnico de la solicitud) o admin.
// PATCH { estado, notas, motivoCancelacion }: solo el ferretero dueño.
//   pendiente -> confirmada|cancelada, confirmada -> surtida|cancelada.
//   'confirmada' descuenta el stock (atómico, 409 si no alcanza); cancelar una confirmada lo repone;
//   cancelar exige motivoCancelacion.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import SolicitudMaterial from '@/models/SolicitudMaterial';
import Tecnico from '@/models/Tecnico';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import {
  TRANSICIONES, POPULATE_SOLICITUD, serializarSolicitud, descontarStock, reponerStock, notificarCambioSolicitud
} from '@/lib/solicitudes-material';

const bad = (message, status = 400, extra = {}) => NextResponse.json({ error: message, ...extra }, { status });

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['ferretero', 'contratista', 'tecnico', 'admin']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return bad('Solicitud no encontrada', 404);

    const solicitud = await SolicitudMaterial.findById(id).populate(POPULATE_SOLICITUD);
    if (!solicitud) return bad('Solicitud no encontrada', 404);

    let permitido = session.role === 'admin';
    if (session.role === 'ferretero') permitido = String(solicitud.ferretero) === session.id;
    if (session.role === 'contratista') permitido = String(solicitud.contratista?._id || solicitud.contratista) === session.id;
    if (session.role === 'tecnico') {
      const tecnico = await Tecnico.findOne({ user: session.id }).select('_id');
      permitido = !!tecnico && String(solicitud.tecnico?._id || solicitud.tecnico) === String(tecnico._id);
    }
    if (!permitido) return bad('Solicitud no encontrada', 404);

    return NextResponse.json(serializarSolicitud(solicitud));
  } catch (error) {
    console.error('Error en GET /api/solicitudes-materiales/[id]:', error);
    return bad('Error interno del servidor', 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['ferretero']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return bad('Solicitud no encontrada', 404);
    const { estado, notas, motivoCancelacion } = await request.json();

    if (notas !== undefined && typeof notas !== 'string') return bad('notas inválidas');
    if (motivoCancelacion !== undefined && typeof motivoCancelacion !== 'string') return bad('motivoCancelacion inválido');
    if (!Object.keys(TRANSICIONES).includes(estado)) {
      return bad(`estado debe ser: ${Object.keys(TRANSICIONES).join(' | ')}`);
    }
    if (estado === 'cancelada' && !motivoCancelacion?.trim()) {
      return bad('motivoCancelacion es obligatorio para cancelar');
    }

    const actual = await SolicitudMaterial.findOne({ _id: id, ferretero: session.id }).select('estado');
    if (!actual) return bad('Solicitud no encontrada', 404);
    if (!TRANSICIONES[actual.estado].includes(estado)) {
      return bad(`No se puede cambiar de ${actual.estado} a ${estado}`);
    }

    // Reclamo atómico del cambio de estado: dos PATCH simultáneos no descuentan el stock dos veces
    const reclamada = await SolicitudMaterial.findOneAndUpdate(
      { _id: id, ferretero: session.id, estado: actual.estado },
      { $set: { estado } },
      { new: false }
    );
    if (!reclamada) return bad('La solicitud cambió de estado; vuelve a intentarlo', 409);

    const solicitud = await SolicitudMaterial.findById(id);

    if (estado === 'confirmada') {
      const r = await descontarStock(solicitud);
      if (r.error) {
        await SolicitudMaterial.updateOne({ _id: id }, { $set: { estado: actual.estado } });
        return bad(r.error, 409);
      }
    } else if (estado === 'cancelada' && actual.estado === 'confirmada') {
      await reponerStock(solicitud);
    }

    if (notas !== undefined) solicitud.notasFerretero = notas.trim();
    if (estado === 'cancelada') solicitud.motivoCancelacion = motivoCancelacion.trim();
    solicitud.historial.push({ estado, notas: (estado === 'cancelada' ? motivoCancelacion : notas)?.trim() || '' });
    await solicitud.save();

    notificarCambioSolicitud(solicitud, estado, motivoCancelacion);

    await solicitud.populate(POPULATE_SOLICITUD);
    return NextResponse.json({ message: `Solicitud ${estado}`, solicitud: serializarSolicitud(solicitud) });
  } catch (error) {
    console.error('Error en PATCH /api/solicitudes-materiales/[id]:', error);
    return bad('Error interno del servidor', 500);
  }
}
