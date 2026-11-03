// app/api/solicitudes-materiales/[id]/route.js
// GET: dueño (ferretero, contratista o técnico de la solicitud) o admin.
// PATCH { estado, notas }: solo el ferretero dueño. pendiente -> confirmada|cancelada, confirmada -> surtida|cancelada.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import SolicitudMaterial from '@/models/SolicitudMaterial';
import Tecnico from '@/models/Tecnico';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { enviarEmailEstadoSolicitudMaterial } from '@/lib/email-service';

const TRANSICIONES = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['surtida', 'cancelada'],
  surtida: [],
  cancelada: []
};
const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['ferretero', 'contratista', 'tecnico', 'admin']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return bad('Solicitud no encontrada', 404);

    const solicitud = await SolicitudMaterial.findById(id)
      .populate('ferreteria', 'nombreNegocio direccion telefono')
      .populate({ path: 'cita', select: 'servicio ubicacion estado', populate: { path: 'servicio', select: 'nombre' } })
      .populate('contratista', 'nombre telefono');
    if (!solicitud) return bad('Solicitud no encontrada', 404);

    let permitido = session.role === 'admin';
    if (session.role === 'ferretero') permitido = String(solicitud.ferretero) === session.id;
    if (session.role === 'contratista') permitido = String(solicitud.contratista?._id || solicitud.contratista) === session.id;
    if (session.role === 'tecnico') {
      const tecnico = await Tecnico.findOne({ user: session.id }).select('_id');
      permitido = !!tecnico && String(solicitud.tecnico) === String(tecnico._id);
    }
    if (!permitido) return bad('Solicitud no encontrada', 404);

    return NextResponse.json(solicitud);
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
    const { estado, notas } = await request.json();

    if (notas !== undefined && typeof notas !== 'string') return bad('notas inválidas');
    if (!Object.keys(TRANSICIONES).includes(estado)) {
      return bad(`estado debe ser: ${Object.keys(TRANSICIONES).join(' | ')}`);
    }

    const solicitud = await SolicitudMaterial.findById(id);
    if (!solicitud || String(solicitud.ferretero) !== session.id) return bad('Solicitud no encontrada', 404);

    if (!TRANSICIONES[solicitud.estado].includes(estado)) {
      return bad(`No se puede cambiar de ${solicitud.estado} a ${estado}`);
    }

    solicitud.estado = estado;
    if (notas !== undefined) solicitud.notasFerretero = notas.trim();
    solicitud.historial.push({ estado, notas: notas?.trim() || '' });
    await solicitud.save();

    // Aviso al contratista (no bloqueante)
    solicitud.populate([{ path: 'contratista', select: 'nombre email' }, { path: 'ferreteria', select: 'nombreNegocio' }])
      .then(s => enviarEmailEstadoSolicitudMaterial({
        contratista: s.contratista, ferreteria: s.ferreteria?.nombreNegocio, estado, notas
      }))
      .catch(err => console.error('Error notificando cambio de solicitud de material:', err));

    return NextResponse.json({ message: `Solicitud ${estado}`, solicitud });
  } catch (error) {
    console.error('Error en PATCH /api/solicitudes-materiales/[id]:', error);
    return bad('Error interno del servidor', 500);
  }
}
