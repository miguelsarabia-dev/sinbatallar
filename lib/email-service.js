// lib/email-service.js
// Servicio de notificaciones por email para SinBatallar

import { sendEmail } from './email';
import {
  welcomeClienteTemplate,
  welcomeContratistaTemplate,
  citaSolicitadaClienteTemplate,
  citaNuevaSolicitudTemplate,
  citaAtendidaClienteTemplate,
  citaCotizadaClienteTemplate,
  citaAceptadaTemplate,
  citaEnProgresoClienteTemplate,
  citaCompletadaClienteTemplate,
  citaCompletadaContratistaTemplate,
  citaCanceladaTemplate,
} from './email-templates';

/**
 * Formatea una fecha para mostrar en los emails
 */
function formatearFecha(fecha) {
  if (!fecha) return null;
  const date = new Date(fecha);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================
// EMAILS DE REGISTRO/BIENVENIDA
// ============================================

/**
 * Envia email de bienvenida a un cliente
 */
export async function enviarEmailBienvenidaCliente({ email, nombre }) {
  try {
    const html = welcomeClienteTemplate({ nombre });
    return await sendEmail({
      to: email,
      subject: 'Bienvenido a SinBatallar',
      html,
    });
  } catch (error) {
    console.error('Error enviando email de bienvenida cliente:', error);
    return { success: false, error: error.message };
  }
}


/**
 * Envia email de bienvenida a un contratista
 */
export async function enviarEmailBienvenidaContratista({ email, nombre }) {
  try {
    const html = welcomeContratistaTemplate({ nombre });
    return await sendEmail({
      to: email,
      subject: 'Registro en SinBatallar recibido',
      html,
    });
  } catch (error) {
    console.error('Error enviando email de bienvenida contratista:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// EMAILS DE ACTUALIZACION DE CITAS
// ============================================

/**
 * Envia notificaciones cuando se crea una nueva cita (estado: solicitada)
 * - Cliente: confirmacion de solicitud
 * - Contratista: nueva solicitud
 */
export async function enviarEmailsCitaSolicitada({ cita, cliente, contratista, servicio }) {
  const resultados = [];

  const direccion = cita.ubicacion?.direccion || cita.ubicacion?.calle || 'No especificada';
  const fecha = formatearFecha(cita.fechaProgramada);

  // Email al cliente (confirmacion)
  if (cliente?.email) {
    const htmlCliente = citaSolicitadaClienteTemplate({
      nombreCliente: cliente.nombre,
      servicio: servicio?.nombre || 'Servicio solicitado',
      descripcion: cita.descripcionProblema,
      fecha,
      direccion,
    });

    const resultCliente = await sendEmail({
      to: cliente.email,
      subject: 'Solicitud de servicio recibida - SinBatallar',
      html: htmlCliente,
    });
    resultados.push({ tipo: 'cliente', ...resultCliente });
  }

  // Email al contratista
  if (contratista?.email) {
    const htmlContratista = citaNuevaSolicitudTemplate({
      nombreDestinatario: contratista.nombre,
      tipoDestinatario: 'contratista',
      nombreCliente: cliente?.nombre || 'Cliente',
      servicio: servicio?.nombre || 'Servicio solicitado',
      descripcion: cita.descripcionProblema,
      fecha,
      direccion,
      esExpress: cita.esExpress,
    });

    const resultContratista = await sendEmail({
      to: contratista.email,
      subject: `Nueva solicitud de servicio ${cita.esExpress ? '(EXPRESS)' : ''} - SinBatallar`,
      html: htmlContratista,
    });
    resultados.push({ tipo: 'contratista', ...resultContratista });
  }

  return resultados;
}

/**
 * Envia notificacion cuando un contratista atiende la cita (estado: atendida)
 * - Cliente: contratista acepto
 */
export async function enviarEmailCitaAtendida({ cita, cliente, servicio, contratista }) {
  if (!cliente?.email) return { success: false, error: 'Email de cliente no disponible' };

  const html = citaAtendidaClienteTemplate({
    nombreCliente: cliente.nombre,
    servicio: servicio?.nombre || 'Servicio solicitado',
    nombreContratista: contratista?.nombre || 'Especialista',
  });

  return await sendEmail({
    to: cliente.email,
    subject: 'Tu solicitud ha sido atendida - SinBatallar',
    html,
  });
}

/**
 * Envia notificacion cuando se envia cotizacion (estado: cotizada)
 * - Cliente: nueva cotizacion
 */
export async function enviarEmailCitaCotizada({ cita, cliente, servicio, cotizacion }) {
  if (!cliente?.email) return { success: false, error: 'Email de cliente no disponible' };

  // Construir detalles de cotizacion si existen
  let detallesCotizacion = '';
  if (cotizacion?.items && cotizacion.items.length > 0) {
    detallesCotizacion = cotizacion.items.map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">${item.descripcion || item.concepto}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; text-align: right;">$${item.precio || item.monto} MXN</td>
      </tr>
    `).join('');
  }

  const html = citaCotizadaClienteTemplate({
    nombreCliente: cliente.nombre,
    servicio: servicio?.nombre || 'Servicio solicitado',
    total: cotizacion?.total || '0',
    detallesCotizacion,
  });

  return await sendEmail({
    to: cliente.email,
    subject: 'Nueva cotizacion recibida - SinBatallar',
    html,
  });
}

/**
 * Envia notificaciones cuando el cliente acepta la cotizacion (estado: aceptada)
 * - Contratista: cliente acepto
 */
export async function enviarEmailsCitaAceptada({ cita, cliente, contratista, servicio, cotizacion }) {
  const resultados = [];

  const direccion = cita.ubicacion?.direccion || cita.ubicacion?.calle || 'No especificada';
  const fecha = formatearFecha(cita.fechaProgramada);
  const total = cotizacion?.total || '0';

  // Email al contratista
  if (contratista?.email) {
    const htmlContratista = citaAceptadaTemplate({
      nombreDestinatario: contratista.nombre,
      nombreCliente: cliente?.nombre || 'Cliente',
      servicio: servicio?.nombre || 'Servicio',
      fecha,
      direccion,
      total,
    });

    const resultContratista = await sendEmail({
      to: contratista.email,
      subject: 'Cotizacion aceptada - SinBatallar',
      html: htmlContratista,
    });
    resultados.push({ tipo: 'contratista', ...resultContratista });
  }

  return resultados;
}

/**
 * Envia notificacion cuando el servicio inicia (estado: en_progreso)
 * - Cliente: servicio iniciado
 */
export async function enviarEmailCitaEnProgreso({ cita, cliente, servicio, contratista }) {
  if (!cliente?.email) return { success: false, error: 'Email de cliente no disponible' };

  const html = citaEnProgresoClienteTemplate({
    nombreCliente: cliente.nombre,
    servicio: servicio?.nombre || 'Servicio',
    nombreContratista: contratista?.nombre || 'Especialista',
  });

  return await sendEmail({
    to: cliente.email,
    subject: 'Servicio en progreso - SinBatallar',
    html,
  });
}

/**
 * Envia notificaciones cuando el servicio se completa (estado: completada)
 * - Cliente: servicio completado
 * - Contratista: servicio completado
 */
export async function enviarEmailsCitaCompletada({ cita, cliente, contratista, servicio, cotizacion }) {
  const resultados = [];

  const total = cotizacion?.total || '0';
  const nombreContratista = contratista?.nombre || 'Contratista';

  // Email al cliente
  if (cliente?.email) {
    const htmlCliente = citaCompletadaClienteTemplate({
      nombreCliente: cliente.nombre,
      servicio: servicio?.nombre || 'Servicio',
      nombreContratista,
      total,
    });

    const resultCliente = await sendEmail({
      to: cliente.email,
      subject: 'Servicio completado - SinBatallar',
      html: htmlCliente,
    });
    resultados.push({ tipo: 'cliente', ...resultCliente });
  }

  if (contratista?.email) {
    const htmlContratista = citaCompletadaContratistaTemplate({
      nombreContratista: contratista.nombre,
      nombreCliente: cliente?.nombre || 'Cliente',
      servicio: servicio?.nombre || 'Servicio',
      total,
    });

    const resultContratista = await sendEmail({
      to: contratista.email,
      subject: 'Servicio completado - SinBatallar',
      html: htmlContratista,
    });
    resultados.push({ tipo: 'contratista', ...resultContratista });
  }

  return resultados;
}

/**
 * Envia notificaciones cuando se cancela una cita (estado: cancelada)
 * - Cliente: cita cancelada
 * - Contratista: cita cancelada
 */
export async function enviarEmailsCitaCancelada({ cita, cliente, contratista, servicio, canceladoPor }) {
  const resultados = [];

  const motivo = cita.motivoCancelacion;

  // Email al cliente
  if (cliente?.email) {
    const htmlCliente = citaCanceladaTemplate({
      nombreDestinatario: cliente.nombre,
      servicio: servicio?.nombre || 'Servicio',
      motivo,
      canceladoPor,
    });

    const resultCliente = await sendEmail({
      to: cliente.email,
      subject: 'Servicio cancelado - SinBatallar',
      html: htmlCliente,
    });
    resultados.push({ tipo: 'cliente', ...resultCliente });
  }

  // Email al contratista
  if (contratista?.email) {
    const htmlContratista = citaCanceladaTemplate({
      nombreDestinatario: contratista.nombre,
      servicio: servicio?.nombre || 'Servicio',
      motivo,
      canceladoPor,
    });

    const resultContratista = await sendEmail({
      to: contratista.email,
      subject: 'Servicio cancelado - SinBatallar',
      html: htmlContratista,
    });
    resultados.push({ tipo: 'contratista', ...resultContratista });
  }

  return resultados;
}

/**
 * Funcion principal para enviar notificaciones segun el cambio de estado
 */
export async function enviarNotificacionCambioEstado({
  nuevoEstado,
  cita,
  cliente,
  contratista,
  servicio,
  cotizacion,
  canceladoPor
}) {
  try {
    switch (nuevoEstado) {
      case 'solicitada':
        return await enviarEmailsCitaSolicitada({ cita, cliente, contratista, servicio });

      case 'atendida':
        return await enviarEmailCitaAtendida({ cita, cliente, servicio, contratista });

      case 'cotizada':
        return await enviarEmailCitaCotizada({ cita, cliente, servicio, cotizacion });

      case 'aceptada':
        return await enviarEmailsCitaAceptada({ cita, cliente, contratista, servicio, cotizacion });

      case 'en_progreso':
        return await enviarEmailCitaEnProgreso({ cita, cliente, servicio, contratista });

      case 'completada':
        return await enviarEmailsCitaCompletada({ cita, cliente, contratista, servicio, cotizacion });

      case 'cancelada':
        return await enviarEmailsCitaCancelada({ cita, cliente, contratista, servicio, canceladoPor });

      default:
        console.log(`Estado ${nuevoEstado} no tiene notificaciones configuradas`);
        return [];
    }
  } catch (error) {
    console.error('Error enviando notificaciones de cambio de estado:', error);
    return { success: false, error: error.message };
  }
}
