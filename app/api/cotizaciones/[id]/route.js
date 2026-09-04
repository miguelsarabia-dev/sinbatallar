// app/api/cotizaciones/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import Comision from '@/models/Comision';
import Contratista from '@/models/Contratista';
import { enviarEmailsCitaAceptada, enviarEmailsCitaCancelada, enviarEmailCitaCotizada } from '@/lib/email-service';

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

// PATCH - Doble propósito:
//  A) Revisión del contratista sobre la estimación de un técnico:
//     - Aprobar/editar → { manoDeObra?, materiales?, descripcion?, estado: 'enviada' }
//     - Rechazar       → { estado: 'rechazada_contratista', motivoRechazo }
//     Recalcula subtotal/iva/total al editar (vía pre-save del modelo).
//  B) Decisión del cliente sobre una cotización 'enviada': { estado: 'aceptada' | 'rechazada' }
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { estado } = body;

    // --- Flujo C: declaración de pago del cliente sin transición de estado ---
    // El saldo final llega como { pagadoCompleto: true, paymentInfo: { tipo: 'saldo', ... } }
    // (sin `estado`). El comprobante va por WhatsApp; aquí solo se registra la
    // declaración, pendiente de verificación por el contratista.
    if (!estado && (body.pagadoCompleto === true || body.paymentInfo?.comprobanteDeclarado)) {
      const cotizacion = await Cotizacion.findById(id);
      if (!cotizacion) {
        return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
      }
      aplicarDeclaracionPago(cotizacion, body.paymentInfo, 'saldo');
      await cotizacion.save();
      return NextResponse.json({
        message: 'Pago de saldo declarado. Pendiente de verificación por el contratista.',
        cotizacion
      });
    }

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

    // --- Flujo A: revisión del contratista (solo desde pendiente_contratista) ---
    const esRevisionContratista = estado === 'enviada' || estado === 'rechazada_contratista';

    if (esRevisionContratista) {
      if (cotizacion.estado !== 'pendiente_contratista') {
        return NextResponse.json(
          { error: `Solo se pueden revisar cotizaciones en 'pendiente_contratista' (actual: ${cotizacion.estado})` },
          { status: 400 }
        );
      }

      if (estado === 'rechazada_contratista') {
        cotizacion.estado = 'rechazada_contratista';
        cotizacion.motivoRechazo = body.motivoRechazo?.trim() || '';
        await cotizacion.save();
        return NextResponse.json({
          message: 'Estimación devuelta al técnico',
          cotizacion
        });
      }

      // estado === 'enviada': el contratista aprueba (opcionalmente editando)
      if (body.manoDeObra !== undefined) cotizacion.manoDeObra = parseFloat(body.manoDeObra) || 0;
      if (body.descripcion !== undefined) cotizacion.descripcionTrabajo = body.descripcion;
      if (Array.isArray(body.materiales)) {
        cotizacion.materiales = body.materiales.map(m => ({
          nombre: m.nombre,
          descripcion: m.descripcion || '',
          cantidad: parseFloat(m.cantidad) || 0,
          precioPorUnidad: parseFloat(m.precio ?? m.precioPorUnidad) || 0,
          total: parseFloat(m.total) || (parseFloat(m.cantidad) || 0) * (parseFloat(m.precio ?? m.precioPorUnidad) || 0),
          materialCatalogoId: m.materialCatalogoId || null
        }));
      }
      cotizacion.estado = 'enviada';
      cotizacion.motivoRechazo = undefined;

      // El pre-save recalcula subtotal, iva y total
      await cotizacion.save();

      // Ahora es visible al cliente: avanzar la cita y notificar
      const cita = await Cita.findById(cotizacion.cita?._id || cotizacion.cita);
      if (cita) {
        if (cita.estado === 'solicitada' || cita.estado === 'atendida') {
          cita.estado = 'cotizada';
          await cita.save();
        }
        await cita.populate('cliente', 'nombre email telefono');
        await cita.populate('servicio', 'nombre descripcion categoria');
        enviarEmailCitaCotizada({
          cita,
          cliente: cita.cliente,
          servicio: cita.servicio,
          cotizacion: { total: cotizacion.total, items: cotizacion.materiales }
        }).catch(err => console.error('Error enviando email cotizacion aprobada por contratista:', err));
      }

      return NextResponse.json({
        message: 'Cotización aprobada y enviada al cliente',
        cotizacion
      });
    }

    // --- Flujo B: decisión del cliente (aceptada / rechazada) ---
    // Solo sobre cotizaciones visibles ('enviada'); nunca sobre estados internos.
    if (cotizacion.estado !== 'enviada') {
      return NextResponse.json(
        { error: `La cotización no está disponible para decisión del cliente (estado: ${cotizacion.estado})` },
        { status: 400 }
      );
    }

    cotizacion.estado = estado;

    // Si se acepta la cotización
    if (estado === 'aceptada') {
      // El cliente acepta y, en el mismo paso, declara el pago del anticipo
      // (comprobante enviado por WhatsApp). Persistir esa declaración.
      if (body.paymentInfo) {
        aplicarDeclaracionPago(cotizacion, body.paymentInfo, 'anticipo');
      }

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

/**
 * Registra en la cotización la declaración de pago del cliente (anticipo o saldo).
 * El comprobante viaja por WhatsApp; aquí solo se marca "declarado", pendiente de
 * verificación manual por el contratista. Rehacer una declaración no altera un
 * `verificado` previo (eso lo maneja el contratista en /verificar-pago).
 * @param {import('mongoose').Document} cotizacion
 * @param {{tipo?: string, monto?: number, comprobanteDeclarado?: boolean, via?: string}} paymentInfo
 * @param {'anticipo'|'saldo'} tipoPorDefecto - usado si paymentInfo.tipo no es válido
 */
function aplicarDeclaracionPago(cotizacion, paymentInfo = {}, tipoPorDefecto) {
  const tipo = ['anticipo', 'saldo'].includes(paymentInfo?.tipo)
    ? paymentInfo.tipo
    : tipoPorDefecto;

  const parte = cotizacion[tipo];
  parte.declarado = true;
  parte.fechaDeclaracion = parte.fechaDeclaracion || new Date();
  if (paymentInfo?.via) parte.via = paymentInfo.via;

  const monto = Number(paymentInfo?.monto);
  if (Number.isFinite(monto) && monto > 0) {
    parte.monto = monto;
  }
}
