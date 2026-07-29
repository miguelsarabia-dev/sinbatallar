// app/api/cotizaciones/[id]/decision/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import { enviarEmailsCitaAceptada } from '@/lib/email-service';

// PUT - Aceptar o rechazar una cotización (cliente)
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const data = await request.json();

    const { decision, clienteId, fechaProgramada, comentario } = data;

    const cotizacion = await Cotizacion.findById(id);
    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // Verificar autorización a través de la cita
    const cita = await Cita.findById(cotizacion.cita);
    if (!cita || cita.cliente.toString() !== clienteId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (cotizacion.estado !== 'enviada') {
      return NextResponse.json({ error: 'Cotización no disponible para decisión' }, { status: 400 });
    }

    if (decision === 'rechazada') {
      cotizacion.estado = 'rechazada';
      await cotizacion.save();

      return NextResponse.json({ message: 'Cotización rechazada', cotizacion });

    } else if (decision === 'aceptada') {
      // Actualizar cotización
      cotizacion.estado = 'aceptada';
      await cotizacion.save();

      // Rechazar las demás cotizaciones de la cita para evitar múltiples aceptadas huérfanas
      await Cotizacion.updateMany(
        {
          cita: cotizacion.cita,
          _id: { $ne: cotizacion._id },
          estado: { $in: ['pendiente', 'enviada'] }
        },
        { estado: 'rechazada' }
      );

      // Actualizar cita
      cita.cotizacionAceptada = cotizacion._id;
      cita.estado = 'aceptada';
      // Garantizar que la cotización aceptada esté en el array de la cita (auto-sanación
      // de citas cuyo array quedó desincronizado).
      if (!cita.cotizaciones.some(c => c.toString() === cotizacion._id.toString())) {
        cita.cotizaciones.push(cotizacion._id);
      }
      if (fechaProgramada) {
        cita.fechaProgramada = new Date(fechaProgramada);
      }

      await cita.save();

      // Populate y enviar emails
      await cita.populate('cliente', 'nombre email telefono');
      await cita.populate('contratista', 'nombre email telefono');
      await cita.populate('servicio', 'nombre descripcion categoria');

      enviarEmailsCitaAceptada({
        cita,
        cliente: cita.cliente,
        contratista: cita.contratista,
        servicio: cita.servicio,
        cotizacion
      }).catch(err => console.error('Error enviando emails:', err));

      return NextResponse.json({ message: 'Cotización aceptada', cotizacion, cita });

    } else {
      return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error al procesar decisión:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Decisión simple (aceptar/rechazar)
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const requestData = await request.json();
    const { decision, clienteId } = requestData;

    if (!['aceptar', 'rechazar'].includes(decision)) {
      return NextResponse.json({ error: 'Decisión inválida' }, { status: 400 });
    }

    const cotizacion = await Cotizacion.findById(id)
      .populate('contratista', 'nombre email telefono')
      .populate('cita');

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // Verificar cliente a través de la cita
    const cita = await Cita.findById(cotizacion.cita);
    if (!cita || cita.cliente.toString() !== clienteId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (cotizacion.estado !== 'enviada') {
      return NextResponse.json({ error: 'Cotización ya procesada' }, { status: 400 });
    }

    if (decision === 'aceptar') {
      cotizacion.estado = 'aceptada';
      await cotizacion.save();

      // Rechazar otras cotizaciones de la misma cita
      await Cotizacion.updateMany(
        {
          cita: cotizacion.cita,
          _id: { $ne: cotizacion._id },
          estado: { $in: ['pendiente', 'enviada'] }
        },
        { estado: 'rechazada' }
      );

      // Actualizar cita
      cita.estado = 'aceptada';
      cita.cotizacionAceptada = cotizacion._id;
      if (!cita.cotizaciones.some(c => c.toString() === cotizacion._id.toString())) {
        cita.cotizaciones.push(cotizacion._id);
      }

      await cita.save();

      // Populate y enviar emails
      await cita.populate('cliente', 'nombre email telefono');
      await cita.populate('contratista', 'nombre email telefono');
      await cita.populate('servicio', 'nombre descripcion categoria');

      enviarEmailsCitaAceptada({
        cita,
        cliente: cita.cliente,
        contratista: cita.contratista,
        servicio: cita.servicio,
        cotizacion
      }).catch(err => console.error('Error enviando emails:', err));

      return NextResponse.json({
        message: 'Cotización aceptada',
        cotizacion,
        cita,
        redirectTo: '/main/citas'
      });

    } else {
      cotizacion.estado = 'rechazada';
      await cotizacion.save();

      return NextResponse.json({ message: 'Cotización rechazada', cotizacion });
    }

  } catch (error) {
    console.error('Error procesando decisión:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
