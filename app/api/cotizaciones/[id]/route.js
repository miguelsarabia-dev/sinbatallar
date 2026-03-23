// app/api/cotizaciones/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import Comision from '@/models/Comision';
import Contratista from '@/models/Contratista';
import { enviarEmailsCitaAceptada, enviarEmailsCitaCancelada } from '@/lib/email-service';

// GET - Obtener una cotización específica
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const cotizacion = await Cotizacion.findById(id)
      .populate('contratista', 'nombre email telefono promedioCalificacion')
      .populate({
        path: 'cita',
        populate: [
          { path: 'cliente', select: 'nombre email telefono' },
          { path: 'servicio', select: 'nombre descripcion categoria' }
        ]
      });

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(cotizacion);

  } catch (error) {
    console.error('Error al obtener cotización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una cotización
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const cotizacion = await Cotizacion.findById(id);

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    // Si la cotización está vinculada a una cita, actualizarla
    if (cotizacion.cita) {
      const cita = await Cita.findById(cotizacion.cita);
      if (cita) {
        cita.cotizaciones = cita.cotizaciones.filter(
          c => c.toString() !== id.toString()
        );

        if (cita.cotizacionAceptada?.toString() === id.toString()) {
          cita.cotizacionAceptada = null;
          cita.estado = cita.cotizaciones.length > 0 ? 'cotizada' : 'solicitada';
        }

        await cita.save();
      }
    }

    await Cotizacion.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Cotización eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una cotización
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const data = await request.json();

    const { contratistaId } = data;

    if (!contratistaId) {
      return NextResponse.json(
        { error: 'Se requiere contratistaId' },
        { status: 400 }
      );
    }

    const cotizacion = await Cotizacion.findById(id);

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    if (contratistaId && cotizacion.contratista.toString() !== contratistaId) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar esta cotización' },
        { status: 403 }
      );
    }

    // Solo permitir editar en estado pendiente
    if (cotizacion.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `No se puede editar cotización en estado: ${cotizacion.estado}` },
        { status: 400 }
      );
    }

    // Actualizar campos permitidos
    const camposPermitidos = ['descripcionTrabajo', 'materiales', 'manoDeObra', 'imagenesCotizacion'];

    camposPermitidos.forEach(campo => {
      if (data[campo] !== undefined) {
        cotizacion[campo] = data[campo];
      }
    });

    await cotizacion.save();

    await cotizacion.populate('contratista', 'nombre email telefono');
    await cotizacion.populate({
      path: 'cita',
      populate: [
        { path: 'cliente', select: 'nombre email telefono' },
        { path: 'servicio', select: 'nombre descripcion categoria' }
      ]
    });

    return NextResponse.json({
      message: 'Cotización actualizada exitosamente',
      cotizacion
    });

  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estado de cotización (aceptar/rechazar)
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { estado } = body;

    const estadosPermitidos = ['enviada', 'aceptada', 'rechazada'];
    if (!estadosPermitidos.includes(estado)) {
      return NextResponse.json(
        { error: `Estado no válido. Debe ser: ${estadosPermitidos.join(', ')}` },
        { status: 400 }
      );
    }

    const cotizacion = await Cotizacion.findById(id).populate('cita');
    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    cotizacion.estado = estado;

    // Si se acepta la cotización
    if (estado === 'aceptada') {
      const cita = await Cita.findById(cotizacion.cita);

      if (cita) {
        cita.cotizacionAceptada = cotizacion._id;
        // Cambiar estado a verificando_pago para que el contratista apruebe
        cita.estado = 'verificando_pago';
        await cita.save();

        // Calcular costo total de materiales
        const costoMateriales = cotizacion.materiales?.reduce((total, mat) => {
          return total + (Number(mat.total) || (Number(mat.cantidad) * Number(mat.precio)) || 0);
        }, 0) || 0;



        // Enviar emails
        await cita.populate('cliente', 'nombre email telefono');
        await cita.populate('contratista', 'nombre email telefono');
        await cita.populate('servicio', 'nombre descripcion');

        enviarEmailsCitaAceptada({
          cita,
          cliente: cita.cliente,
          contratista: cita.contratista,
          servicio: cita.servicio,
          cotizacion
        }).catch(err => console.error('Error enviando emails:', err));
      }
    }

    // Si se rechaza
    if (estado === 'rechazada') {
      const cita = await Cita.findById(cotizacion.cita);

      if (cita && cita.cotizaciones.length === 1) {
        cita.estado = 'cancelada';
        cita.motivoCancelacion = 'Cotización rechazada por el cliente';
        await cita.save();

        await cita.populate('cliente', 'nombre email telefono');
        await cita.populate('contratista', 'nombre email telefono');
        await cita.populate('servicio', 'nombre descripcion');

        enviarEmailsCitaCancelada({
          cita,
          cliente: cita.cliente,
          contratista: cita.contratista,
          servicio: cita.servicio,
          canceladoPor: 'el cliente'
        }).catch(err => console.error('Error enviando emails:', err));
      }
    }

    await cotizacion.save();

    return NextResponse.json({
      message: `Cotización ${estado} exitosamente`,
      cotizacion
    });

  } catch (error) {
    console.error('Error al actualizar estado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
