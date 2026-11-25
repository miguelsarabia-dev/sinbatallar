// POST /api/inicial/citas/[id]/tomar — el especialista toma una cita ABIERTA de sus zonas y servicios.
// Es atómico: la toma el primero que acepta (especialista o, si el permanente está activo, contratista).
// Body opcional: { aspirantes: [id, id] (máximo 2, de los suyos), fechaVisita?, horaVisita? } — se pueden ajustar después.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import Cita from '@/models/Cita';
import Aspirante from '@/models/Aspirante';
import { esObjectId } from '@/lib/sanitize';
import { puedeTomar, validarAspirantes, validarFechaHora } from '@/lib/inicial-citas';
import { especialistaDeLaPeticion } from '@/lib/inicial-rutas';
import { contactoEspecialista, poblarCitaInicial } from '@/lib/inicial-citas-db';
import { enviarNotificacionCambioEstado } from '@/lib/email-service';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, especialista } = await especialistaDeLaPeticion(sesion.session);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const actual = await Cita.findById(id).select('estado contratista especialista servicio ubicacion').lean();
    if (!actual) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });

    const permiso = puedeTomar(actual, especialista);
    if (!permiso.ok) return NextResponse.json({ error: permiso.error }, { status: permiso.status });

    const body = await request.json().catch(() => ({}));
    let aspirantes = [];
    if (body.aspirantes !== undefined) {
      const propios = await Aspirante.find({ especialista: especialista._id }).select('_id activo especialista').lean();
      const r = validarAspirantes(body.aspirantes, propios, especialista._id);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
      aspirantes = r.aspirantes;
    }

    // Opcional: el especialista confirma o ajusta la visita para cotizar al tomarla
    const visita = {};
    if (body.fechaVisita !== undefined) {
      const f = validarFechaHora({ fecha: body.fechaVisita, hora: body.horaVisita }, { etiqueta: 'Fecha de visita' });
      if (!f.ok) return NextResponse.json({ error: f.error }, { status: 400 });
      visita.fechaVisita = f.fecha;
      if (f.hora) visita.horaVisita = f.hora;
    }

    const contacto = await contactoEspecialista(especialista._id);
    // Atómico: solo si sigue abierta
    const cita = await Cita.findOneAndUpdate(
      { _id: id, estado: 'solicitada', contratista: null, especialista: null },
      {
        $set: { especialista: especialista._id, modelo: 'inicial', aspirantes, estado: 'atendida', ...visita },
        $push: { historial: { estado: 'atendida', fecha: new Date(), comentario: `Cita tomada por el especialista ${contacto?.nombre || ''}`.trim() } }
      },
      { new: true }
    );
    if (!cita) return NextResponse.json({ error: 'La cita ya no está disponible: otro la tomó primero' }, { status: 409 });

    const poblada = await poblarCitaInicial(Cita.findById(cita._id));
    enviarNotificacionCambioEstado({
      nuevoEstado: 'atendida', cita: poblada, cliente: poblada.cliente, contratista: contacto, servicio: poblada.servicio
    }).catch(err => console.error('Error enviando email al tomar cita (inicial):', err));

    return NextResponse.json({ message: 'Cita tomada: coordina la visita para cotizar', cita: poblada });
  } catch (error) {
    console.error('Error en POST /inicial/citas/[id]/tomar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
