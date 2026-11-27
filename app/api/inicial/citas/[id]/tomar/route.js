// POST /api/inicial/citas/[id]/tomar — el especialista toma una cita ABIERTA de sus zonas y servicios.
// Es atómico: la toma el primero que acepta (especialista o, si el permanente está activo, contratista).
// Body opcional: { aspirantes: [id, id] (máximo 2, de los suyos),
//                 aceptarVisita?: true            → acepta el día que pidió el cliente (visita acordada)
//                 fechaVisita?, horaVisita?       → propone otro día (le toca al cliente aceptarlo) }
// Sin aceptarVisita ni fechaVisita, la toma y la visita queda pendiente de su respuesta (lib/inicial-visita.js).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import Cita from '@/models/Cita';
import Aspirante from '@/models/Aspirante';
import { esObjectId } from '@/lib/sanitize';
import { puedeTomar, validarAspirantes } from '@/lib/inicial-citas';
import { acuerdoAlTomar } from '@/lib/inicial-visita';
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
    const actual = await Cita.findById(id).select('estado contratista especialista servicio ubicacion fechaVisita horaVisita').lean();
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

    // La visita para cotizar: acepta el día del cliente, propone otro o contesta después
    const visita = acuerdoAlTomar({ cita: actual, aceptarVisita: body.aceptarVisita, fechaVisita: body.fechaVisita, horaVisita: body.horaVisita });
    if (!visita.ok) return NextResponse.json({ error: visita.error }, { status: visita.status });

    const contacto = await contactoEspecialista(especialista._id);
    // Atómico: solo si sigue abierta
    const cita = await Cita.findOneAndUpdate(
      { _id: id, estado: 'solicitada', contratista: null, especialista: null },
      {
        $set: { especialista: especialista._id, modelo: 'inicial', aspirantes, estado: 'atendida', subestadoTecnico: null, ...visita.set },
        $push: {
          historial: {
            $each: [
              { estado: 'atendida', fecha: new Date(), comentario: `Cita tomada por el especialista ${contacto?.nombre || ''}`.trim() },
              ...(visita.comentario ? [{ estado: 'atendida', fecha: new Date(), comentario: visita.comentario }] : [])
            ]
          }
        }
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
