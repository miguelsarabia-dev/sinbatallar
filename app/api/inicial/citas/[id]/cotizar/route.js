// POST /api/inicial/citas/[id]/cotizar — el especialista cotiza EN SITIO (la visita no se cobra).
// La cotización llega directo al cliente (sin revisión intermedia). Si ya había una enviada sin respuesta, la nueva
// la reemplaza. Pago: 50% de anticipo y 50% de saldo (o el total, si el cliente lo elige al aceptar).
// Body: { descripcionTrabajo?, manoDeObra, materiales?: [{ nombre, cantidad, precioPorUnidad, descripcion? }],
//         fechaInicio?, horaInicio? }  <- día acordado para EMPEZAR el trabajo; el cliente lo acepta con el precio
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import { armarCotizacion, ESTADOS_COTIZABLES } from '@/lib/inicial-citas';
import { citaDelEspecialista } from '@/lib/inicial-rutas';
import { puedeCotizarVisita } from '@/lib/inicial-visita';
import { marcarCotizada } from '@/lib/citas-estado';
import { contactoEspecialista, poblarCitaInicial } from '@/lib/inicial-citas-db';
import { enviarNotificacionCambioEstado } from '@/lib/email-service';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const sesion = await requireSession(request, ['especialista']);
    if (sesion.error) return sesion.error;
    const { error, cita, especialista } = await citaDelEspecialista(sesion.session, params);
    if (error) return error;
    if (!ESTADOS_COTIZABLES.includes(cita.estado) || cita.cotizacionAceptada) {
      return NextResponse.json({ error: 'Esta cita ya no se puede cotizar' }, { status: 409 });
    }
    // La primera cotización se hace en la visita: acordada y ese día
    const visita = puedeCotizarVisita(cita);
    if (!visita.ok) return NextResponse.json({ error: visita.error }, { status: visita.status });

    const body = await request.json().catch(() => ({}));
    const r = armarCotizacion(body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

    // La nueva reemplaza a la que el cliente aún no contestaba
    await Cotizacion.updateMany(
      { cita: cita._id, estado: { $in: ['pendiente', 'enviada'] } },
      { $set: { estado: 'rechazada', motivoRechazo: 'Reemplazada por una nueva cotización del especialista' } }
    );

    const mitad = Math.round((r.cotizacion.total / 2) * 100) / 100;
    const cotizacion = await Cotizacion.create({
      ...r.cotizacion,
      cita: cita._id,
      especialista: especialista._id,
      estado: 'enviada',
      anticipo: { monto: mitad },
      saldo: { monto: Math.round((r.cotizacion.total - mitad) * 100) / 100 }
    });

    cita.cotizaciones.push(cotizacion._id);
    if (!marcarCotizada(cita)) {
      cita.historial.push({ estado: cita.estado, fecha: new Date(), comentario: 'Nueva cotización enviada al cliente' });
    }
    cita.subestadoTecnico = null;
    await cita.save({ validateModifiedOnly: true });

    const poblada = await poblarCitaInicial(Cita.findById(cita._id));
    enviarNotificacionCambioEstado({
      nuevoEstado: 'cotizada', cita: poblada, cliente: poblada.cliente, contratista: await contactoEspecialista(especialista._id),
      servicio: poblada.servicio, cotizacion
    }).catch(err => console.error('Error enviando email de cotización (inicial):', err));

    return NextResponse.json({ message: 'Cotización enviada al cliente', cotizacion }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /inicial/citas/[id]/cotizar:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
