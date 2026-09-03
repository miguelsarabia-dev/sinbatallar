// app/api/cotizaciones/[id]/verificar-pago/route.js
// El contratista verifica manualmente el comprobante de transferencia que el
// cliente le envió por WhatsApp (anticipo o saldo). Cuando el SALDO queda
// verificado, el ciclo de pago está completo con certeza y se cierra el
// servicio (cita -> completada, pagado: true).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import Comision from '@/models/Comision';
import Contratista from '@/models/Contratista';
import Area from '@/models/Area';
import { enviarEmailsCitaCompletada } from '@/lib/email-service';

const TIPOS_VALIDOS = ['anticipo', 'saldo'];

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { contratistaId, tipo, verificado = true } = body;

    if (!contratistaId) {
      return NextResponse.json({ error: 'contratistaId es requerido' }, { status: 400 });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json(
        { error: `tipo no válido. Debe ser: ${TIPOS_VALIDOS.join(' | ')}` },
        { status: 400 }
      );
    }

    const cotizacion = await Cotizacion.findById(id).populate('cita');
    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // Solo el contratista dueño puede verificar el pago.
    if (cotizacion.contratista.toString() !== contratistaId) {
      return NextResponse.json(
        { error: 'No tienes permiso para verificar el pago de esta cotización' },
        { status: 403 }
      );
    }

    const parte = cotizacion[tipo];

    // No se puede verificar algo que el cliente aún no declaró.
    if (verificado && !parte.declarado) {
      return NextResponse.json(
        { error: `El cliente aún no ha declarado el pago de ${tipo}` },
        { status: 400 }
      );
    }

    parte.verificado = !!verificado;
    parte.fechaVerificacion = verificado ? new Date() : null;
    await cotizacion.save();

    // ── Cierre del ciclo: saldo verificado -> servicio completado ─────────
    let citaCerrada = false;

    if (tipo === 'saldo' && verificado && cotizacion.cita) {
      const cita = await Cita.findById(cotizacion.cita._id || cotizacion.cita);
      if (cita && cita.estado !== 'completada' && cita.estado !== 'cancelada') {
        cita.estado = 'completada';
        cita.pagado = true;
        cita.metodoPago = 'transferencia';
        const now = new Date();
        cita.horaFin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        cita.historial.push({
          estado: 'completada',
          comentario: 'Saldo verificado por el contratista. Pago completo confirmado.',
          fecha: new Date()
        });
        await cita.save({ validateModifiedOnly: true });
        citaCerrada = true;

        await crearComisionSiNoExiste(cita, cotizacion);

        // Emails de servicio completado (no bloqueante)
        const citaPoblada = await Cita.findById(cita._id)
          .populate('cliente', 'nombre email telefono')
          .populate('contratista', 'nombre email telefono')
          .populate('servicio', 'nombre descripcion');
        enviarEmailsCitaCompletada({
          cita: citaPoblada,
          cliente: citaPoblada.cliente,
          contratista: citaPoblada.contratista,
          servicio: citaPoblada.servicio,
          cotizacion
        }).catch(err => console.error('Error enviando emails cita completada:', err));
      } else if (cita?.estado === 'completada' && !cita.pagado) {
        // La cita ya estaba cerrada por otro flujo; garantizar el flag de pago.
        cita.pagado = true;
        await cita.save({ validateModifiedOnly: true });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pago de ${tipo} ${verificado ? 'verificado' : 'marcado como no verificado'}.`,
      cotizacion,
      citaCerrada
    });
  } catch (error) {
    console.error('Error al verificar pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Crea la Comisión para la cita si aún no existe (idempotente).
 * Reproduce la distribución usada por completar/finalizar.
 */
async function crearComisionSiNoExiste(cita, cotizacion) {
  const comisionExistente = await Comision.findOne({ cita: cita._id });
  if (comisionExistente) return;

  const costoMateriales = cotizacion.costoMateriales || cotizacion.materiales?.reduce((total, mat) => {
    return total + (Number(mat.total) || (Number(mat.cantidad) * Number(mat.precio)) || 0);
  }, 0) || 0;

  const contratista = await Contratista.findById(cotizacion.contratista);

  let area = null;
  if (cita.ubicacion?.zona) {
    area = await Area.findById(cita.ubicacion.zona);
  }

  const distribucion = {
    plataforma: { porcentaje: 15 },
    contratista: { id: cotizacion.contratista, porcentaje: 85 }
  };
  if (area?.aperturador) {
    distribucion.aperturador = { id: area.aperturador, porcentaje: 2 };
  }
  if (contratista?.incorporador) {
    distribucion.incorporador = { id: contratista.incorporador, porcentaje: 3 };
  }

  try {
    const comision = new Comision({
      cita: cita._id,
      cotizacion: cotizacion._id,
      totalServicio: cotizacion.total,
      subtotal: cotizacion.subtotal || (cotizacion.manoDeObra + costoMateriales),
      iva: cotizacion.iva || Math.round(((cotizacion.manoDeObra + costoMateriales) * 16) / 100),
      costoMateriales,
      manoDeObra: cotizacion.manoDeObra || 0,
      distribucion,
      estadoPago: 'disponible'
    });
    await comision.save();
  } catch (error) {
    console.error('Error creando comision en verificar-pago:', error);
  }
}
