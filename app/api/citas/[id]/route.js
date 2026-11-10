import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import { enviarNotificacionCambioEstado } from '@/lib/email-service';
import { requireSession } from '@/lib/session';
import { cambiarEstadoCita, resolverActor } from '@/lib/citas-estado';
import { resolverCotizacionAceptada } from '@/lib/comisiones';
import { esObjectId } from '@/lib/sanitize';

// GET - Obtener una cita especifica por ID
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request);
    if (error) return error;

    const { id } = await params;

    if (!id || !esObjectId(id)) {
      return NextResponse.json({ error: 'ID de cita requerido' }, { status: 400 });
    }

    const cita = await Cita.findById(id)
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono calificacion')
      .populate('servicio', 'nombre descripcion categoria precio')
      .populate('cotizaciones')
      .populate('cotizacionAceptada');

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // Solo el cliente, su contratista, su técnico o admin. 404 para no confirmar que existe.
    const actor = await resolverActor(session, cita);
    if (!actor.autorizado) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    return NextResponse.json(cita);

  } catch (error) {
    console.error('Error al obtener cita:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Cambio de estado y/o fotos de una cita, con autorización por token y rol.
 * Reglas de cierre y cancelación (reembolso) en lib/citas-estado.js.
 */
async function actualizarCita(request, params) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request);
    if (error) return error;

    const { id } = await params;
    const data = await request.json();
    const { estado, comentario } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID de cita requerido' }, { status: 400 });
    }

    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const resultado = await cambiarEstadoCita({ cita, estado, comentario, session });
    if (resultado.error) {
      return NextResponse.json({ error: resultado.error.message }, { status: resultado.error.status });
    }

    // Fotos (URLs de Cloudinary ya subidas desde el frontend)
    const actor = await resolverActor(session, cita);
    if (['contratista', 'tecnico', 'admin'].includes(actor.role)) {
      let fotosCambiaron = false;
      if (Array.isArray(data.fotosAntes) && data.fotosAntes.length > 0) { cita.fotosAntes = data.fotosAntes; fotosCambiaron = true; }
      if (Array.isArray(data.fotosDespues) && data.fotosDespues.length > 0) { cita.fotosDespues = data.fotosDespues; fotosCambiaron = true; }
      if (fotosCambiaron) await cita.save({ validateModifiedOnly: true });
    }

    await cita.populate('cliente', 'nombre email telefono');
    await cita.populate('contratista', 'nombre email telefono calificacion');
    await cita.populate('servicio', 'nombre descripcion categoria precio');
    await cita.populate('cotizaciones');
    await cita.populate('cotizacionAceptada');

    if (resultado.cambio) {
      const cotizacion = cita.cotizacionAceptada || await resolverCotizacionAceptada(cita);
      enviarNotificacionCambioEstado({
        nuevoEstado: estado,
        cita,
        cliente: cita.cliente,
        contratista: cita.contratista,
        servicio: cita.servicio,
        cotizacion,
        canceladoPor: resultado.canceladoPor
      }).catch(err => console.error('Error enviando emails cambio estado:', err));
    }

    return NextResponse.json(cita);

  } catch (error) {
    console.error('Error al actualizar cita:', error);
    // Datos inconsistentes (validación de Mongoose) → 400 con detalle, no 500 opaco.
    if (error?.name === 'ValidationError' || error?.name === 'CastError') {
      return NextResponse.json(
        { error: 'Datos de la cita inconsistentes', detalle: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH y PUT comparten reglas (antes PUT permitía todas las transiciones "para demo").
export async function PATCH(request, { params }) {
  return actualizarCita(request, params);
}

export async function PUT(request, { params }) {
  return actualizarCita(request, params);
}

// DELETE - Eliminar una cita (solo admin)
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID de cita requerido' }, { status: 400 });
    }

    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    await Cita.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Cita eliminada exitosamente' });

  } catch (error) {
    console.error('Error al eliminar cita:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
