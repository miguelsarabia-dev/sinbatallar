// app/api/citas/[id]/tomar-tecnico/route.js
// POST (técnico por token): toma un servicio directo. Atómico: si otro lo tomó antes -> 409 'Ya fue tomado'.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Tecnico from '@/models/Tecnico';
import Contratista from '@/models/Contratista';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { coincideEspecialidad } from '@/lib/especialidades';
import { enviarPush } from '@/lib/push';
import { enviarEmailTecnicoTomoCita } from '@/lib/email-service';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['tecnico']);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });

    const tecnico = await Tecnico.findOne({ user: session.id }).populate('user', 'nombre');
    if (!tecnico || !tecnico.activo) return NextResponse.json({ error: 'Técnico inactivo' }, { status: 403 });
    if (tecnico.disponible === false) return NextResponse.json({ error: 'Marca tu disponibilidad para tomar servicios' }, { status: 403 });

    // Validaciones previas (la asignación real es atómica abajo)
    const previa = await Cita.findOne({ _id: id, contratista: tecnico.contratista }).populate('servicio', 'nombre categoria');
    if (!previa) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    if (!coincideEspecialidad(tecnico.especialidades, previa.servicio)) {
      return NextResponse.json({ error: 'Este servicio no coincide con tus especialidades' }, { status: 403 });
    }

    const cita = await Cita.findOneAndUpdate(
      { _id: id, estado: 'aceptada', tecnico: null, contratista: tecnico.contratista },
      {
        $set: { tecnico: tecnico._id },
        $push: { historial: { estado: 'aceptada', fecha: new Date(), comentario: `Técnico ${tecnico.user?.nombre || ''} tomó el servicio`.trim(), usuario: session.id } }
      },
      { new: true }
    ).populate('servicio', 'nombre descripcion categoria').populate('cliente', 'nombre telefono');

    if (!cita) return NextResponse.json({ error: 'Ya fue tomado' }, { status: 409 });

    // Aviso al contratista (email + push, no bloqueante)
    Contratista.findById(tecnico.contratista).select('email nombre').lean().then(contratista => Promise.all([
      enviarEmailTecnicoTomoCita({
        contratista, tecnico: tecnico.user?.nombre, servicio: cita.servicio?.nombre,
        fecha: cita.fechaProgramada ? new Date(cita.fechaProgramada).toLocaleString('es-MX') : null
      }),
      enviarPush([tecnico.contratista], {
        titulo: 'Un técnico tomó un servicio',
        cuerpo: `${tecnico.user?.nombre || 'Tu técnico'} tomó ${cita.servicio?.nombre || 'un servicio'}`,
        data: { tipo: 'tecnico_tomo_cita', citaId: String(cita._id) }
      })
    ])).catch(err => console.error('Error avisando que el técnico tomó la cita:', err));

    return NextResponse.json({ success: true, message: 'Servicio tomado', cita });
  } catch (error) {
    console.error('Error en POST /api/citas/[id]/tomar-tecnico:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
