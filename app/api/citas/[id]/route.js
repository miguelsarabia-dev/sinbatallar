import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Cotizacion from '@/models/Cotizacion';
import Comision from '@/models/Comision';
import { enviarNotificacionCambioEstado } from '@/lib/email-service';

// GET - Obtener una cita especifica por ID
export async function GET(request, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de cita requerido' },
        { status: 400 }
      );
    }

    const cita = await Cita.findById(id)
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono calificacion')
      .populate('servicio', 'nombre descripcion categoria precio')
      .populate('cotizacion');

    if (!cita) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(cita);

  } catch (error) {
    console.error('Error al obtener cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estado de cita (método simplificado)
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const data = await request.json();
    const { estado, comentario } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de cita requerido' },
        { status: 400 }
      );
    }

    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Validar transiciones de estado permitidas
    const transicionesPermitidas = {
      'solicitada':        ['aceptada', 'rechazada', 'cancelada'],
      'pendiente':         ['aceptada', 'rechazada', 'cancelada'],
      'aceptada':          ['en_revision', 'en_progreso', 'cancelada'],
      'en_revision':       ['cotizada', 'en_progreso', 'cancelada'],
      'cotizada':          ['verificando_pago', 'en_progreso', 'cancelada'],
      'verificando_pago':  ['en_progreso', 'cancelada'],
      'atendida':          ['cotizada', 'cancelada'],
      'en_progreso':       ['completada', 'cancelada'],
      'completada':        [],
      'cancelada':         [],
      'rechazada':         []
    };

    const estadosPermitidos = transicionesPermitidas[cita.estado] || [];

    if (estado && !estadosPermitidos.includes(estado)) {
      return NextResponse.json(
        { error: `No se puede cambiar de ${cita.estado} a ${estado}` },
        { status: 400 }
      );
    }

    // Actualizar estado
    if (estado) {
      const estadoAnterior = cita.estado;
      cita.estado = estado;

      // Agregar al historial
      cita.historial.push({
        estado: estado,
        fecha: new Date(),
        comentario: comentario || `Estado cambiado de ${estadoAnterior} a ${estado}`
      });

      // Guardado defensivo: validamos solo los campos modificados para no
      // bloquear la transición por datos legados inconsistentes en otros campos.
      await cita.save({ validateModifiedOnly: true });

      // Populamos los datos para la respuesta y emails.
      // El modelo usa cotizaciones[] y cotizacionAceptada (no existe 'cotizacion').
      await cita.populate('cliente', 'nombre email telefono');
      await cita.populate('contratista', 'nombre email telefono calificacion');
      await cita.populate('servicio', 'nombre descripcion categoria precio');
      await cita.populate('cotizacionAceptada');

      // Resolver la cotización aceptada de forma robusta: si la cita no la tiene
      // referenciada (datos huérfanos), buscarla en la colección por citaId + estado.
      const cotizacion = await resolverCotizacionAceptada(cita);

      // Enviar notificaciones de email (no bloqueante)
      enviarNotificacionCambioEstado({
        nuevoEstado: estado,
        cita,
        cliente: cita.cliente,
        contratista: cita.contratista,
        servicio: cita.servicio,
        cotizacion
      }).catch(err => console.error('Error enviando emails cambio estado PATCH:', err));

      return NextResponse.json(cita);
    }

    // Populamos los datos para la respuesta
    await cita.populate('cliente', 'nombre email telefono');
    await cita.populate('contratista', 'nombre email telefono calificacion');
    await cita.populate('servicio', 'nombre descripcion categoria precio');
    await cita.populate('cotizacionAceptada');

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
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Resuelve la cotización aceptada de una cita de forma tolerante a datos huérfanos.
 * Prioriza cita.cotizacionAceptada; si es null, busca en la colección Cotizacion
 * por citaId + estado 'aceptada' (caso de citas cuyo array quedó desincronizado).
 * @returns {Promise<object|null>}
 */
async function resolverCotizacionAceptada(cita) {
  if (cita.cotizacionAceptada) {
    // Ya viene poblada por el populate previo, o es un ObjectId: normalizar a doc.
    return cita.cotizacionAceptada._id
      ? cita.cotizacionAceptada
      : await Cotizacion.findById(cita.cotizacionAceptada);
  }
  return Cotizacion.findOne({ cita: cita._id, estado: 'aceptada' }).sort({ createdAt: -1 });
}

// PUT - Actualizar una cita específica (SIMPLIFICADO PARA DEMO)
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const data = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID de cita requerido' },
        { status: 400 }
      );
    }

    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // SIMPLIFICADO PARA DEMO: Permitir todas las transiciones de estado
    //console.log('DEMO MODE: Actualizando cita', id, 'con datos:', data);

    // Actualizar campos permitidos
    const updateData = {};

    if (data.estado && data.estado !== cita.estado) {
      const estadoAnterior = cita.estado;
      updateData.estado = data.estado;

      const entradaHistorial = {
        estado: data.estado,
        fecha: new Date(),
        comentario: data.comentario || `Estado cambiado de ${estadoAnterior} a ${data.estado} (DEMO)`
      };

      updateData.$push = {
        historial: entradaHistorial
      };
    }

    // Agregar fotos antes del trabajo (cuando se inicia el servicio)
    // OPTIMIZADO: Ya vienen como URLs de Cloudinary desde el frontend
    if (data.fotosAntes && Array.isArray(data.fotosAntes) && data.fotosAntes.length > 0) {
      updateData.fotosAntes = data.fotosAntes;
    }

    // Agregar fotos después del trabajo (cuando se completa el servicio)
    // OPTIMIZADO: Ya vienen como URLs de Cloudinary desde el frontend
    if (data.fotosDespues && Array.isArray(data.fotosDespues) && data.fotosDespues.length > 0) {
      updateData.fotosDespues = data.fotosDespues;
    }

    // Asignar técnico si se proporciona (ELIMINADO)

    const citaActualizada = await Cita.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono calificacion')
      .populate('servicio', 'nombre descripcion categoria precio')
      .populate('cotizaciones') // CORREGIDO: plural
      .populate('cotizacionAceptada'); // AGREGADO: cotizacion aceptada

    // Enviar notificaciones de email si cambio el estado (no bloqueante)
    if (data.estado && data.estado !== cita.estado) {

      enviarNotificacionCambioEstado({
        nuevoEstado: data.estado,
        cita: citaActualizada,
        cliente: citaActualizada.cliente,
        contratista: citaActualizada.contratista,
        servicio: citaActualizada.servicio,
        cotizacion: citaActualizada.cotizacionAceptada
      }).catch(err => console.error('Error enviando emails cambio estado PUT:', err));
    }

    return NextResponse.json(citaActualizada);

  } catch (error) {
    console.error('Error al actualizar cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una cita
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: 'ID de cita requerido' }, { status: 400 });
    }

    // Buscar la cita
    const cita = await Cita.findById(id);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // Eliminar la cita
    await Cita.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Cita eliminada exitosamente' });

  } catch (error) {
    console.error('Error al eliminar cita:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
