// app/api/comprobantes/route.js
// POST: el cliente dueño de la cita sube el comprobante de su transferencia (multipart).
//   campos: cotizacionId, citaId?, tipo (anticipo|saldo|total), monto, imagen
// GET ?cotizacionId=: lista los comprobantes (cliente de la cita, su contratista o admin).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import Comprobante from '@/models/Comprobante';
import User from '@/models/User';
import { uploadImage } from '@/lib/cloudinary';
import { requireSession } from '@/lib/session';
import { enviarEmailComprobanteRecibido } from '@/lib/email-service';
import { enviarPush } from '@/lib/push';
import { esObjectId } from '@/lib/sanitize';


const TIPOS = ['anticipo', 'saldo', 'total'];
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
const EXT_PERMITIDAS = ['jpg', 'jpeg', 'png', 'heic', 'heif'];
const TOLERANCIA = 1; // pesos

const bad = (message, status = 400) => NextResponse.json({ error: message }, { status });

/** Monto esperado por tipo (sobre el total con IVA). */
function montoEsperado(tipo, total) {
  return tipo === 'total' ? total : total / 2;
}

/** Valida que la cotización admita este tipo de pago ahora. Devuelve mensaje de error o null. */
function validarEstado(tipo, cotizacion, cita) {
  const modalidad = cotizacion.modalidadPago;
  const parte = tipo === 'total' ? cotizacion.pagoUnico : cotizacion[tipo];
  if (parte?.verificado) return `El pago de ${tipo} ya fue verificado`;

  if (tipo === 'anticipo' || tipo === 'total') {
    // Antes de aceptar la cotización ('enviada'), o con el pago en revisión tras un rechazo.
    const antesDeAceptar = cotizacion.estado === 'enviada';
    const enRevision = cotizacion.estado === 'aceptada' && cita.estado === 'verificando_pago';
    if (!antesDeAceptar && !enRevision) {
      return `La cotización (${cotizacion.estado}) no admite un comprobante de ${tipo}`;
    }
    if (enRevision && ((tipo === 'total') !== (modalidad === 'total'))) {
      return `La cotización fue aceptada con modalidad '${modalidad}'`;
    }
    return null;
  }

  // saldo
  if (cotizacion.estado !== 'aceptada' || modalidad === 'total') {
    return 'Esta cotización no tiene saldo pendiente';
  }
  if (!cotizacion.anticipo.verificado) return 'El anticipo aún no está verificado';
  if (cita.estado !== 'completada') return 'El saldo se paga cuando el técnico termina el trabajo';
  return null;
}

export async function POST(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['cliente']);
    if (error) return error;

    const formData = await request.formData();
    const cotizacionId = formData.get('cotizacionId');
    const tipo = formData.get('tipo');
    const monto = Number(formData.get('monto'));
    const imagen = formData.get('imagen');

    if (!cotizacionId) return bad('cotizacionId es requerido');
    if (!TIPOS.includes(tipo)) return bad(`tipo no válido. Debe ser: ${TIPOS.join(' | ')}`);
    if (!Number.isFinite(monto) || monto <= 0) return bad('monto no válido');
    if (!imagen || typeof imagen === 'string' || !imagen.size) return bad("Falta el archivo en el campo 'imagen'");

    // Imagen: tipo y tamaño
    const ext = (imagen.name || '').split('.').pop()?.toLowerCase();
    const mimeOk = imagen.type ? MIME_PERMITIDOS.includes(imagen.type.toLowerCase()) : EXT_PERMITIDAS.includes(ext);
    if (!mimeOk) return bad('Formato no permitido. Usa JPG, PNG o HEIC');
    if (imagen.size > MAX_BYTES) return bad('La imagen excede el máximo de 5 MB');

    const cotizacion = await Cotizacion.findById(cotizacionId);
    if (!cotizacion) return bad('Cotización no encontrada', 404);

    const cita = await Cita.findById(cotizacion.cita);
    if (!cita) return bad('Cita no encontrada', 404);

    const citaIdBody = formData.get('citaId');
    if (citaIdBody && String(citaIdBody) !== String(cita._id)) {
      return bad('citaId no corresponde a la cotización');
    }

    // Solo el cliente dueño de la cita
    if (cita.cliente.toString() !== session.id) {
      return bad('No eres el cliente de esta cita', 403);
    }

    const errorEstado = validarEstado(tipo, cotizacion, cita);
    if (errorEstado) return bad(errorEstado);

    const esperado = montoEsperado(tipo, cotizacion.total);
    if (Math.abs(monto - esperado) > TOLERANCIA) {
      return bad(`El monto debe ser $${esperado.toFixed(2)} (${tipo === 'total' ? '100%' : '50%'} del total con IVA)`);
    }

    const subida = await uploadImage(imagen, {
      folder: `sinbatallar/comprobantes/${cita._id}`,
      quality: 'auto:good',
      transformation: { width: 1600, height: 1600, crop: 'limit' }
    });

    // Conservar historial: el vigente anterior pasa a 'reemplazado'
    await Comprobante.updateMany(
      { cotizacion: cotizacion._id, tipo, estado: 'vigente' },
      { estado: 'reemplazado' }
    );

    const comprobante = await Comprobante.create({
      cotizacion: cotizacion._id,
      cita: cita._id,
      subidoPor: session.id,
      tipo,
      monto,
      imagenUrl: subida.url,
      publicId: subida.publicId
    });

    // Push al contratista (y email a contratista y admins, no bloqueante)
    await enviarPush([cotizacion.contratista], {
      titulo: 'Nuevo comprobante de pago',
      cuerpo: `El cliente subió el comprobante de ${tipo === 'total' ? 'pago total' : tipo}`,
      data: { tipo: 'comprobante_subido', citaId: String(cita._id), cotizacionId: String(cotizacion._id) }
    });

    // Notificar por email al contratista y a los administradores (no bloqueante)
    (async () => {
      const citaPoblada = await Cita.findById(cita._id)
        .populate('cliente', 'nombre')
        .populate('contratista', 'email')
        .populate('servicio', 'nombre');
      const admins = await User.find({ role: 'admin' }).select('email').lean();
      await enviarEmailComprobanteRecibido({
        destinatarios: [citaPoblada.contratista?.email, ...admins.map(a => a.email)],
        cliente: citaPoblada.cliente,
        servicio: citaPoblada.servicio,
        tipo,
        monto
      });
    })().catch(err => console.error('Error notificando comprobante:', err));

    return NextResponse.json({ success: true, comprobante: serializar(comprobante) }, { status: 201 });
  } catch (error) {
    console.error('Error al subir comprobante:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['cliente', 'contratista', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const cotizacionId = searchParams.get('cotizacionId');

    // Historial de pagos del cliente: sin cotizacionId devuelve todos sus comprobantes, el más reciente primero
    if (!cotizacionId && session.role === 'cliente') {
      const propios = await Comprobante.find({ subidoPor: session.id })
        .sort({ createdAt: -1 })
        .limit(200)
        .populate({ path: 'cita', select: 'servicio estado', populate: { path: 'servicio', select: 'nombre' } })
        .populate('cotizacion', 'total');
      return NextResponse.json(propios.map(c => ({
        ...serializar(c),
        cita: c.cita ? { _id: c.cita._id, servicio: { nombre: c.cita.servicio?.nombre }, estado: c.cita.estado } : null,
        cotizacion: c.cotizacion ? { _id: c.cotizacion._id, total: c.cotizacion.total } : null
      })));
    }

    if (!cotizacionId) return bad('cotizacionId es requerido');
    if (!esObjectId(cotizacionId)) return bad('cotizacionId inválido');

    const cotizacion = await Cotizacion.findById(cotizacionId).select('cita contratista');
    if (!cotizacion) return bad('Cotización no encontrada', 404);

    if (session.role === 'contratista') {
      if (cotizacion.contratista.toString() !== session.id) return bad('No autorizado', 403);
    } else if (session.role === 'cliente') {
      const cita = await Cita.findById(cotizacion.cita).select('cliente');
      if (!cita || cita.cliente.toString() !== session.id) return bad('No autorizado', 403);
    }

    const comprobantes = await Comprobante.find({ cotizacion: cotizacion._id }).sort({ createdAt: -1 });
    return NextResponse.json(comprobantes.map(serializar));
  } catch (error) {
    console.error('Error al listar comprobantes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

function serializar(c) {
  return {
    _id: c._id,
    tipo: c.tipo,
    monto: c.monto,
    imagenUrl: c.imagenUrl,
    estado: c.estado,
    verificado: c.verificado,
    motivoRechazo: c.motivoRechazo || null,
    createdAt: c.createdAt
  };
}
