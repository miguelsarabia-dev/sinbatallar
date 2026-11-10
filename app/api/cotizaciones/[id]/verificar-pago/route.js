// app/api/cotizaciones/[id]/verificar-pago/route.js
// SOLO un admin verifica o rechaza el pago declarado por el cliente (todo el dinero entra a Sin Batallar,
// el contratista no lo recibe, así que no puede confirmarlo): tipo 'anticipo' | 'saldo' | 'total'.
//  - anticipo / total verificados: la cita pasa a en_progreso en la misma operación.
//  - saldo verificado: se cierra el servicio (completada, pagado) y se crea la comisión.
//  - total verificado: el cierre y la comisión ocurren cuando el cliente confirma el trabajo.
//  - verificado:false + motivo: rechaza el comprobante vigente; el cliente puede subir otro.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import Comprobante from '@/models/Comprobante';
import { enviarNotificacionCambioEstado, enviarEmailComprobanteRechazado } from '@/lib/email-service';
import { requireSession } from '@/lib/session';
import { cerrarServicioSiCorresponde } from '@/lib/comisiones';
import { crearSolicitudesAutomaticas } from '@/lib/solicitudes-material';


const TIPOS_VALIDOS = ['anticipo', 'saldo', 'total'];

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;

    const { id } = await params;
    const { tipo, verificado = true, motivo } = await request.json();

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json(
        { error: `tipo no válido. Debe ser: ${TIPOS_VALIDOS.join(' | ')}` },
        { status: 400 }
      );
    }

    const cotizacion = await Cotizacion.findById(id);
    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    const esTotal = cotizacion.modalidadPago === 'total';
    if ((tipo === 'total') !== esTotal) {
      return NextResponse.json(
        { error: esTotal ? "Esta cotización es de pago total: usa tipo 'total'" : "Esta cotización es de anticipo + saldo: usa tipo 'anticipo' o 'saldo'" },
        { status: 400 }
      );
    }

    const parte = tipo === 'total' ? cotizacion.pagoUnico : cotizacion[tipo];
    const cita = await Cita.findById(cotizacion.cita);

    // ── Rechazo / desmarcado ─────────────────────────────────────────────
    if (!verificado) {
      const motivoLimpio = (motivo || '').trim();
      if (!motivoLimpio) {
        return NextResponse.json({ error: 'Se requiere un motivo para rechazar el comprobante' }, { status: 400 });
      }
      if (cita?.pagado) {
        return NextResponse.json({ error: 'El servicio ya está cerrado y pagado' }, { status: 400 });
      }

      parte.verificado = false;
      parte.fechaVerificacion = null;
      parte.declarado = false;
      parte.fechaDeclaracion = null;
      await cotizacion.save();

      await Comprobante.updateMany(
        { cotizacion: cotizacion._id, tipo, estado: 'vigente' },
        { estado: 'rechazado', motivoRechazo: motivoLimpio, verificado: false, revisadoPor: session.id }
      );

      if (cita) {
        const citaPoblada = await Cita.findById(cita._id)
          .populate('cliente', 'nombre email')
          .populate('servicio', 'nombre');
        enviarEmailComprobanteRechazado({
          cliente: citaPoblada.cliente, servicio: citaPoblada.servicio, tipo, motivo: motivoLimpio
        }).catch(err => console.error('Error enviando email de rechazo:', err));
      }

      return NextResponse.json({
        success: true,
        message: `Comprobante de ${tipo} rechazado.`,
        cotizacion,
        citaCerrada: false
      });
    }

    // ── Verificación ─────────────────────────────────────────────────────
    if (!parte.declarado) {
      return NextResponse.json(
        { error: `El cliente aún no ha declarado el pago de ${tipo}` },
        { status: 400 }
      );
    }
    if (tipo === 'saldo' && !cotizacion.anticipo.verificado) {
      return NextResponse.json({ error: 'Primero debe verificarse el anticipo' }, { status: 400 });
    }

    parte.verificado = true;
    parte.fechaVerificacion = new Date();
    await cotizacion.save();

    await Comprobante.updateMany(
      { cotizacion: cotizacion._id, tipo, estado: 'vigente' },
      { verificado: true, fechaVerificacion: new Date(), revisadoPor: session.id }
    );

    // anticipo / total verificados -> la cita pasa a en_progreso en la misma operación
    let citaEnProgreso = false;
    if ((tipo === 'anticipo' || tipo === 'total') && cita?.estado === 'verificando_pago') {
      cita.estado = 'en_progreso';
      cita.historial.push({
        estado: 'en_progreso',
        comentario: tipo === 'total'
          ? 'Pago total verificado por Sin Batallar. Servicio en progreso.'
          : 'Anticipo verificado por Sin Batallar. Servicio en progreso.',
        fecha: new Date()
      });
      await cita.save({ validateModifiedOnly: true });
      citaEnProgreso = true;

      // Pide a las ferreterías los materiales de la cotización (un fallo aquí no bloquea la verificación)
      await crearSolicitudesAutomaticas(cita, cotizacion);

      const citaPoblada = await Cita.findById(cita._id)
        .populate('cliente', 'nombre email telefono')
        .populate('contratista', 'nombre email telefono')
        .populate('servicio', 'nombre descripcion');
      enviarNotificacionCambioEstado({
        nuevoEstado: 'en_progreso',
        cita: citaPoblada,
        cliente: citaPoblada.cliente,
        contratista: citaPoblada.contratista,
        servicio: citaPoblada.servicio,
        cotizacion
      }).catch(err => console.error('Error enviando email en_progreso:', err));
    }

    if (cita) {
    }

    // saldo verificado (o pago total ya confirmado por el cliente) -> cierre + comisión
    let citaCerrada = false;
    if (cita && (tipo === 'saldo' || tipo === 'total')) {
      ({ cerrada: citaCerrada } = await cerrarServicioSiCorresponde(cita._id));
    }

    return NextResponse.json({
      success: true,
      message: `Pago de ${tipo} verificado.`,
      cotizacion,
      citaCerrada,
      citaEnProgreso
    });
  } catch (error) {
    console.error('Error al verificar pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
