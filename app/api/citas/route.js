// app/api/citas/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Contratista from '@/models/Contratista';
import Servicio from '@/models/Servicio';
import User from '@/models/User';
import { enviarNotificacionCambioEstado } from '@/lib/email-service';
import { uploadMultipleImages } from '@/lib/cloudinary';

// GET - Obtener citas
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');
    const contratistaId = searchParams.get('contratistaId');
    const estado = searchParams.get('estado');
    const fecha = searchParams.get('fecha');
    const activa = searchParams.get('activa');

    let filter = {};

    if (clienteId) {
      filter.cliente = clienteId;
    }

    if (contratistaId) {
      filter.contratista = contratistaId;
    }

    if (estado) {
      const estados = estado.split(',').map(e => e.trim());
      if (estados.length === 1) {
        filter.estado = estados[0];
      } else {
        filter.estado = { $in: estados };
      }
    }

    if (activa === 'true') {
      filter.estado = { $nin: ['completada', 'cancelada'] };
    }

    if (fecha) {
      const fechaInicio = new Date(fecha);
      const fechaFin = new Date(fecha);
      fechaFin.setDate(fechaFin.getDate() + 1);

      filter.fechaProgramada = {
        $gte: fechaInicio,
        $lt: fechaFin
      };
    }

    const citas = await Cita.find(filter)
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono promedioCalificacion informacionPago')
      .populate('servicio', 'nombre descripcion categoria')
      .populate({
        path: 'cotizaciones',
        match: clienteId ? { estado: { $nin: ['pendiente'] } } : {},
        populate: {
          path: 'contratista',
          select: 'nombre email telefono informacionPago'
        }
      })
      .populate({
        path: 'cotizacionAceptada',
        populate: {
          path: 'contratista',
          select: 'nombre email telefono informacionPago'
        }
      })
      .sort({ createdAt: -1, fechaProgramada: 1 });

    return NextResponse.json(citas);

  } catch (error) {
    console.error('Error al obtener citas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva cita
export async function POST(request) {
  try {
    await connectDB();

    const formData = await request.formData();
    const clienteId = formData.get('clienteId');
    const servicioId = formData.get('servicioId');
    const descripcionProblema = formData.get('descripcionProblema');
    const ubicacion = JSON.parse(formData.get('ubicacion') || '{}');
    const fechaProgramada = formData.get('fechaProgramada');

    // Procesar imágenes - Subir a Cloudinary
    const imagenesProblema = [];
    const imageFiles = formData.getAll('imagenesProblema');

    if (imageFiles && imageFiles.length > 0) {
      const imagenesValidas = imageFiles.filter(file => file && file.size > 0);

      if (imagenesValidas.length > 0) {
        try {
          const uploadResults = await uploadMultipleImages(imagenesValidas, {
            folder: 'sinbatallar/citas/problemas',
            quality: 'auto:good',
            transformation: {
              width: 1200,
              height: 1200,
              crop: 'limit'
            }
          });

          imagenesProblema.push(...uploadResults.map(r => r.url));
        } catch (error) {
          console.error('Error subiendo imágenes:', error);
        }
      }
    }

    // Crear la cita
    const nuevaCita = new Cita({
      cliente: clienteId,
      servicio: servicioId,
      descripcionProblema,
      imagenesProblema,
      ubicacion,
      fechaProgramada: fechaProgramada ? new Date(fechaProgramada) : null,
      estado: 'solicitada'
    });

    await nuevaCita.save();

    // Notificar la creación (asignación a contratista ocurrirá después)
    const servicio = await Servicio.findById(servicioId);
    const cliente = await User.findById(clienteId);

    enviarNotificacionCambioEstado({
      nuevoEstado: 'solicitada',
      cita: nuevaCita,
      cliente,
      contratista: null,
      servicio
    }).catch(err => console.error('Error enviando email:', err));

    return NextResponse.json({
      message: 'Cita creada exitosamente. Esperando asignación de contratista.',
      citaId: nuevaCita._id,
      estado: nuevaCita.estado
    });

  } catch (error) {
    console.error('Error al crear cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar estado de cita
export async function PUT(request) {
  try {
    await connectDB();

    const data = await request.json();
    const { citaId, estado, nuevoEstado, comentario, userId, userRole } = data;

    const estadoFinal = estado || nuevoEstado;

    const cita = await Cita.findById(citaId);
    if (!cita) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos según el rol
    if (userRole) {
      if (userRole === 'cliente' && cita.cliente.toString() !== userId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      if (userRole === 'contratista' && cita.contratista?.toString() !== userId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    // Actualizar estado
    const estadoAnterior = cita.estado;
    cita.estado = estadoFinal;

    if (estadoFinal === 'cancelada' && comentario) {
      cita.motivoCancelacion = comentario;
    }

    await cita.save();

    await cita.populate('cliente', 'nombre email telefono');
    await cita.populate('contratista', 'nombre email telefono');
    await cita.populate('servicio', 'nombre descripcion categoria');
    await cita.populate('cotizaciones');
    await cita.populate('cotizacionAceptada');

    // Enviar notificaciones
    if (estadoAnterior !== estadoFinal) {
      let canceladoPor = null;
      if (estadoFinal === 'cancelada') {
        if (userRole === 'cliente') canceladoPor = 'el cliente';
        else if (userRole === 'contratista') canceladoPor = 'el contratista';
      }

      enviarNotificacionCambioEstado({
        nuevoEstado: estadoFinal,
        cita,
        cliente: cita.cliente,
        contratista: cita.contratista,
        servicio: cita.servicio,
        cotizacion: cita.cotizacionAceptada,
        canceladoPor
      }).catch(err => console.error('Error enviando emails:', err));
    }

    return NextResponse.json({
      message: 'Estado de cita actualizado exitosamente',
      cita
    });

  } catch (error) {
    console.error('Error al actualizar cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
