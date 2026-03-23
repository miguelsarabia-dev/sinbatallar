// lib/email.js
import nodemailer from 'nodemailer';

// Configuración del transporter de Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Envía un email usando Gmail
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto del email
 * @param {string} options.html - Contenido HTML del email
 * @returns {Promise<Object>} - Resultado del envío
 */
export async function sendEmail({ to, subject, html }) {
  try {
    const mailOptions = {
      from: `"SinBatallar" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email enviado correctamente:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error al enviar email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifica la conexión con el servidor de email
 * @returns {Promise<boolean>}
 */
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('Conexión con servidor de email verificada');
    return true;
  } catch (error) {
    console.error('Error al verificar conexión de email:', error);
    return false;
  }
}
