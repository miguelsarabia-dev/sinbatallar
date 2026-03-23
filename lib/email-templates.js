// lib/email-templates.js
// Templates de email para SinBatallar

const baseStyles = {
  container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;',
  header: 'background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;',
  headerTitle: 'color: #ffffff; font-size: 28px; font-weight: bold; margin: 0;',
  headerSubtitle: 'color: #bfdbfe; font-size: 14px; margin-top: 8px;',
  body: 'padding: 30px 20px; background-color: #f8fafc; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;',
  title: 'color: #1e293b; font-size: 22px; font-weight: bold; margin: 0 0 20px 0;',
  text: 'color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;',
  infoBox: 'background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;',
  infoRow: 'display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;',
  infoLabel: 'color: #64748b; font-size: 14px;',
  infoValue: 'color: #1e293b; font-size: 14px; font-weight: 600;',
  button: 'display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0;',
  footer: 'background-color: #1e293b; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;',
  footerText: 'color: #94a3b8; font-size: 12px; margin: 0;',
  statusBadge: (color) => `display: inline-block; background-color: ${color}; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;`,
  divider: 'border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;',
};

// Colores para estados
const statusColors = {
  solicitada: '#f59e0b',
  atendida: '#3b82f6',
  cotizada: '#8b5cf6',
  aceptada: '#10b981',
  en_progreso: '#06b6d4',
  completada: '#22c55e',
  cancelada: '#ef4444',
};

// Nombres legibles de estados
const statusNames = {
  solicitada: 'Solicitada',
  atendida: 'Atendida',
  cotizada: 'Cotizada',
  aceptada: 'Aceptada',
  en_progreso: 'En Progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

/**
 * Genera el layout base del email
 */
function baseLayout(content) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SinBatallar</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
      <div style="${baseStyles.container}">
        <div style="${baseStyles.header}">
          <h1 style="${baseStyles.headerTitle}">SinBatallar</h1>
          <p style="${baseStyles.headerSubtitle}">Tu servicio, sin complicaciones</p>
        </div>
        ${content}
        <div style="${baseStyles.footer}">
          <p style="${baseStyles.footerText}">Este es un correo automatico de SinBatallar.</p>
          <p style="${baseStyles.footerText}">Por favor no responda a este correo.</p>
          <p style="${baseStyles.footerText}; margin-top: 10px;">&copy; ${new Date().getFullYear()} SinBatallar. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template de bienvenida para clientes
 */
export function welcomeClienteTemplate(data) {
  const { nombre } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Bienvenido a SinBatallar</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombre}</strong>,</p>
      <p style="${baseStyles.text}">
        Gracias por registrarte en SinBatallar. Ahora puedes solicitar servicios de mantenimiento 
        y reparacion para tu hogar de manera rapida y sencilla.
      </p>
      <div style="${baseStyles.infoBox}">
        <p style="${baseStyles.text}; margin: 0;"><strong>Con SinBatallar puedes:</strong></p>
        <ul style="color: #475569; font-size: 14px; line-height: 2;">
          <li>Solicitar servicios express o programados</li>
          <li>Recibir cotizaciones transparentes</li>
          <li>Seguir el estado de tus servicios en tiempo real</li>
          <li>Calificar el servicio</li>
        </ul>
      </div>
      <p style="${baseStyles.text}">
        Si tienes alguna pregunta, no dudes en contactarnos.
      </p>
    </div>
  `;

  return baseLayout(content);
}


/**
 * Template de bienvenida para contratistas
 */
export function welcomeContratistaTemplate(data) {
  const { nombre } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Bienvenido a SinBatallar</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombre}</strong>,</p>
      <p style="${baseStyles.text}">
        Tu cuenta de contratista ha sido registrada exitosamente. Pronto un administrador 
        revisara tu solicitud y activara tu cuenta.
      </p>
      <div style="${baseStyles.infoBox}">
        <p style="${baseStyles.text}; margin: 0;"><strong>Como contratista podras:</strong></p>
        <ul style="color: #475569; font-size: 14px; line-height: 2;">
          <li>Gestionar tus servicios</li>
          <li>Recibir solicitudes de servicio en tu zona</li>
          <li>Administrar cotizaciones y pagos</li>
          <li>Hacer crecer tu negocio</li>
        </ul>
      </div>
      <p style="${baseStyles.text}">
        Te notificaremos cuando tu cuenta este activa.
      </p>
    </div>
  `;

  return baseLayout(content);
}

/**
 * Template de nueva cita solicitada - Para cliente (confirmacion)
 */
export function citaSolicitadaClienteTemplate(data) {
  const { nombreCliente, servicio, descripcion, fecha, direccion } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Solicitud de Servicio Recibida</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombreCliente}</strong>,</p>
      <p style="${baseStyles.text}">
        Hemos recibido tu solicitud de servicio. Un contratista revisara tu caso y te contactara pronto.
      </p>
      <div style="${baseStyles.infoBox}">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Servicio</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${servicio}</td>
          </tr>
          ${fecha ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Fecha programada</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${fecha}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Direccion</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${direccion}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Estado</td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="${baseStyles.statusBadge(statusColors.solicitada)}">Solicitada</span>
            </td>
          </tr>
        </table>
      </div>
      <p style="${baseStyles.text}"><strong>Descripcion del problema:</strong></p>
      <p style="${baseStyles.text}; background-color: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
        ${descripcion}
      </p>
    </div>
  `;

  return baseLayout(content);
}

/**
 * Template de nueva cita - Para contratista (nueva solicitud)
 */
export function citaNuevaSolicitudTemplate(data) {
  const { nombreDestinatario, tipoDestinatario, nombreCliente, servicio, descripcion, fecha, direccion, esExpress } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Nueva Solicitud de Servicio</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombreDestinatario}</strong>,</p>
      <p style="${baseStyles.text}">
        Se ha recibido una nueva solicitud de servicio ${esExpress ? '<strong style="color: #f59e0b;">(EXPRESS)</strong>' : ''} 
        que requiere tu atencion.
      </p>
      <div style="${baseStyles.infoBox}">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Cliente</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${nombreCliente}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Servicio</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${servicio}</td>
          </tr>
          ${fecha ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Fecha solicitada</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${fecha}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Direccion</td>
            <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${direccion}</td>
          </tr>
        </table>
      </div>
      <p style="${baseStyles.text}"><strong>Descripcion del problema:</strong></p>
      <p style="${baseStyles.text}; background-color: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
        ${descripcion}
      </p>
      <p style="${baseStyles.text}">
        Ingresa a la aplicacion para revisar y atender esta solicitud.
      </p>
    </div>
  `;

  return baseLayout(content);
}

/**
 * Template de cita atendida - Para cliente
 */
export function citaAtendidaClienteTemplate(data) {
  const { nombreCliente, servicio, nombreContratista } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Tu solicitud ha sido atendida</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombreCliente}</strong>,</p>
      <p style="${baseStyles.text}">
        Buenas noticias! El contratista <strong>${nombreContratista}</strong> ha aceptado tu solicitud de 
        <strong>${servicio}</strong> y esta evaluando tu caso para enviarte una cotizacion.
      </p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="${baseStyles.statusBadge(statusColors.atendida)}">Atendida</span>
      </div>
      <p style="${baseStyles.text}">
        Pronto recibiras una cotizacion con el detalle del trabajo y el costo estimado.
      </p>
    </div>
  `;

  return baseLayout(content);
}

/**
 * Template de cotizacion enviada - Para cliente
 */
export function citaCotizadaClienteTemplate(data) {
  const { nombreCliente, servicio, total, detallesCotizacion } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Nueva Cotizacion Recibida</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombreCliente}</strong>,</p>
      <p style="${baseStyles.text}">
        Has recibido una cotizacion para tu solicitud de <strong>${servicio}</strong>.
      </p>
      <div style="${baseStyles.infoBox}">
        <table style="width: 100%; border-collapse: collapse;">
          ${detallesCotizacion || ''}
          <tr>
            <td style="padding: 15px 0; color: #1e293b; font-size: 18px; font-weight: bold;">Total</td>
            <td style="padding: 15px 0; color: #2563eb; font-size: 18px; font-weight: bold; text-align: right;">$${total} MXN</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <span style="${baseStyles.statusBadge(statusColors.cotizada)}">Cotizada</span>
      </div>
      <p style="${baseStyles.text}">
        Ingresa a la aplicacion para revisar los detalles y aceptar o rechazar la cotizacion.
      </p>
    </div>
  `;

  return baseLayout(content);
}

/**
 * Template de cotizacion aceptada - Para contratista
 */
export function citaAceptadaTemplate(data) {
  const { nombreDestinatario, nombreCliente, servicio, fecha, direccion, total } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Cotizacion Aceptada</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombreDestinatario}</strong>,</p>
      <p style="${baseStyles.text}">
        Excelentes noticias! El cliente <strong>${nombreCliente}</strong> ha aceptado la cotizacion 
        para el servicio de <strong>${servicio}</strong>.
      </p>
      <div style="${baseStyles.infoBox}">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Cliente</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${nombreCliente}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Servicio</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${servicio}</td>
          </tr>
          ${fecha ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Fecha programada</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${fecha}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Direccion</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${direccion}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Monto acordado</td>
            <td style="padding: 10px 0; color: #2563eb; font-size: 16px; font-weight: bold; text-align: right;">$${total} MXN</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <span style="${baseStyles.statusBadge(statusColors.aceptada)}">Aceptada</span>
      </div>
      <p style="${baseStyles.text}">
        El servicio esta confirmado. Preparate para realizar el trabajo en la fecha acordada.
      </p>
    </div>
  `;

  return baseLayout(content);
}

/**
 * Template de servicio en progreso - Para cliente
 */
export function citaEnProgresoClienteTemplate(data) {
  const { nombreCliente, servicio, nombreContratista } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Servicio en Progreso</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombreCliente}</strong>,</p>
      <p style="${baseStyles.text}">
        El contratista <strong>${nombreContratista}</strong> ha iniciado el servicio de <strong>${servicio}</strong>.
      </p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="${baseStyles.statusBadge(statusColors.en_progreso)}">En Progreso</span>
      </div>
      <p style="${baseStyles.text}">
        Te notificaremos cuando el servicio haya sido completado.
      </p>
    </div>
  `;

  return baseLayout(content);
}

/**
 * Template de servicio completado - Para cliente
 */
export function citaCompletadaClienteTemplate(data) {
  const { nombreCliente, servicio, nombreContratista, total } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Servicio Completado</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombreCliente}</strong>,</p>
      <p style="${baseStyles.text}">
        El servicio de <strong>${servicio}</strong> ha sido completado exitosamente por el contratista 
        <strong>${nombreContratista}</strong>.
      </p>
      <div style="${baseStyles.infoBox}">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Servicio</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${servicio}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Contratista</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${nombreContratista}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Total</td>
            <td style="padding: 10px 0; color: #2563eb; font-size: 16px; font-weight: bold; text-align: right;">$${total} MXN</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <span style="${baseStyles.statusBadge(statusColors.completada)}">Completada</span>
      </div>
      <p style="${baseStyles.text}">
        Nos encantaria conocer tu opinion. Ingresa a la aplicacion para calificar el servicio recibido.
      </p>
    </div>
  `;

  return baseLayout(content);
}

/**
 * Template de servicio completado - Para contratista
 */
export function citaCompletadaContratistaTemplate(data) {
  const { nombreContratista, nombreCliente, servicio, total } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Servicio Completado</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombreContratista}</strong>,</p>
      <p style="${baseStyles.text}">
        El contratista <strong>${nombreContratista}</strong> ha completado exitosamente el servicio de 
        <strong>${servicio}</strong> para el cliente <strong>${nombreCliente}</strong>.
      </p>
      <div style="${baseStyles.infoBox}">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Cliente</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${nombreCliente}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Servicio</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${servicio}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Contratista</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${nombreContratista}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Monto</td>
            <td style="padding: 10px 0; color: #2563eb; font-size: 16px; font-weight: bold; text-align: right;">$${total} MXN</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <span style="${baseStyles.statusBadge(statusColors.completada)}">Completada</span>
      </div>
    </div>
  `;

  return baseLayout(content);
}

/**
 * Template de cita cancelada - Para todos
 */
export function citaCanceladaTemplate(data) {
  const { nombreDestinatario, servicio, motivo, canceladoPor } = data;

  const content = `
    <div style="${baseStyles.body}">
      <h2 style="${baseStyles.title}">Servicio Cancelado</h2>
      <p style="${baseStyles.text}">Hola <strong>${nombreDestinatario}</strong>,</p>
      <p style="${baseStyles.text}">
        Lamentamos informarte que el servicio de <strong>${servicio}</strong> ha sido cancelado
        ${canceladoPor ? ` por ${canceladoPor}` : ''}.
      </p>
      ${motivo ? `
      <div style="${baseStyles.infoBox}">
        <p style="${baseStyles.text}; margin: 0;"><strong>Motivo de cancelacion:</strong></p>
        <p style="${baseStyles.text}; margin: 10px 0 0 0;">${motivo}</p>
      </div>
      ` : ''}
      <div style="text-align: center; margin: 25px 0;">
        <span style="${baseStyles.statusBadge(statusColors.cancelada)}">Cancelada</span>
      </div>
      <p style="${baseStyles.text}">
        Si tienes alguna pregunta, no dudes en contactarnos.
      </p>
    </div>
  `;

  return baseLayout(content);
}

// Exportar nombres de estados para uso externo
export { statusNames, statusColors };
